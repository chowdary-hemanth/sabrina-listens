import asyncio
from typing import List, Optional
import yt_dlp
from app.core.logging import logger
from app.core.ytdlp_utils import get_default_ydl_opts
from app.schemas.types import TrackMetadata
from app.providers.base import BaseAudioProvider, CandidateAudio
from app.providers.matcher import TrackMatcher
from app.providers.jiosaavn import JioSaavnProvider
from app.providers.youtube_music import YouTubeMusicProvider
from app.providers.youtube_search import YouTubeSearchProvider
from app.providers.soundcloud import SoundCloudProvider

class ProviderCascade:
    """
    Multi-tier link resolution cascade based on Soundbound and SpotiFlyer architectures.
    Cascades across prioritized providers (JioSaavn -> YouTube Music -> YouTube Search -> SoundCloud)
    and validates candidates using algorithmic matching (TrackMatcher) before extraction.
    """

    def __init__(self, providers: Optional[List[BaseAudioProvider]] = None):
        if providers is not None:
            self.providers = sorted(providers, key=lambda p: p.priority)
        else:
            self.providers = [
                JioSaavnProvider(),      # Tier 1: 320k/160k direct AAC CDN
                YouTubeMusicProvider(),  # Tier 2: InnerTube WEB_REMIX API
                YouTubeSearchProvider(), # Tier 3: Standard YouTube + Topic
                SoundCloudProvider(),    # Tier 4: SoundCloud streams
            ]

    async def resolve_audio(self, track: TrackMetadata):
        """
        Resolves the best matching audio stream for a track across provider tiers.
        Returns an AudioResolutionResult.
        """
        from app.services.audio_resolver import AudioResolutionResult

        loop = asyncio.get_event_loop()
        query_str = f"{track.artist} - {track.title}".strip(" -") if track.artist else track.title

        # 1. Direct explicit source URL handling
        if track.provider == "direct" and track.source_url:
            logger.info(f"[Cascade] Using direct audio URL: {track.source_url}")
            return AudioResolutionResult(
                stream_url=track.source_url,
                extractor="direct",
                source_bitrate_kbps=track.source_bitrate_kbps or 320,
                source_format=track.source_format or "audio/mpeg",
                is_direct_stream=True,
                match_score=100.0,
            )

        # 2. If track came with a direct YouTube or SoundCloud link, test it first
        if track.source_url and track.provider in ("youtube", "soundcloud", "bandcamp"):
            try:
                logger.info(f"[Cascade] Checking primary source URL for {track.provider}: {track.source_url}")
                ydl_opts = get_default_ydl_opts({
                    "format": "bestaudio/best",
                    "extract_flat": False,
                    "noplaylist": True,
                })
                def _extract_primary():
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        return ydl.extract_info(track.source_url, download=False)

                info = await loop.run_in_executor(None, _extract_primary)
                if info and not info.get("drm"):
                    cand = CandidateAudio(
                        title=info.get("title") or track.title,
                        artist=info.get("uploader") or track.artist,
                        stream_url=track.source_url,
                        extractor=track.provider,
                        duration_seconds=int(info.get("duration")) if info.get("duration") else None,
                        raw_info=info,
                    )
                    score, reasons = TrackMatcher.score_candidate(track, cand)
                    if score >= TrackMatcher.MATCH_THRESHOLD:
                        logger.info(f"[Cascade] Primary URL matched with score {score:.1f}")
                        abr = info.get("abr") or info.get("tbr") or 160
                        acodec = info.get("acodec") or info.get("ext") or "opus"
                        return AudioResolutionResult(
                            stream_url=info.get("url") or info.get("webpage_url") or track.source_url,
                            extractor=info.get("extractor", track.provider),
                            source_bitrate_kbps=int(round(abr)),
                            source_format=acodec,
                            filesize_approx=info.get("filesize") or info.get("filesize_approx"),
                            raw_info=info,
                            is_direct_stream=False,
                            match_score=score,
                        )
            except Exception as e:
                logger.warning(f"[Cascade] Direct source extraction failed: {e}")

        # 3. Multi-tier prioritized fallback cascade
        all_candidates: List[CandidateAudio] = []

        for provider in self.providers:
            if not provider.is_available():
                continue

            logger.info(f"[Cascade] Querying Tier {provider.priority} ({provider.name}) for: {query_str}")
            try:
                candidates = await provider.search_candidates(track)
            except Exception as e:
                logger.warning(f"[Cascade] Tier {provider.priority} ({provider.name}) threw error: {e}")
                continue

            if not candidates:
                logger.info(f"[Cascade] Tier {provider.priority} ({provider.name}) returned 0 candidates, cascading...")
                continue

            # Rank candidates through algorithmic matcher
            ranked = TrackMatcher.rank_candidates(track, candidates)
            all_candidates.extend(ranked)

            top = ranked[0]
            if top.match_score >= TrackMatcher.MATCH_THRESHOLD:
                logger.info(
                    f"[Cascade] [MATCH FOUND] Tier {provider.priority} ({provider.name}) "
                    f"chose '{top.title}' by '{top.artist}' (score: {top.match_score:.1f}/100)"
                )

                # Direct HTTP stream (e.g. JioSaavn CDN)
                if top.is_direct_stream:
                    return AudioResolutionResult(
                        stream_url=top.stream_url,
                        extractor=top.extractor,
                        source_bitrate_kbps=top.source_bitrate_kbps,
                        source_format=top.source_format,
                        filesize_approx=top.filesize_approx,
                        raw_info=top.raw_info,
                        is_direct_stream=True,
                        match_score=top.match_score,
                    )

                # Web extractor stream (e.g. YouTube Music, YouTube, SoundCloud)
                def _resolve_stream():
                    target_url = top.raw_info.get("url") or top.stream_url
                    opts = get_default_ydl_opts({
                        "format": "bestaudio/best",
                        "extract_flat": False,
                        "noplaylist": True,
                    })
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        return ydl.extract_info(target_url, download=False)

                try:
                    info = await loop.run_in_executor(None, _resolve_stream)
                    if info:
                        abr = info.get("abr") or info.get("tbr") or top.source_bitrate_kbps or 160
                        acodec = info.get("acodec") or info.get("ext") or top.source_format or "opus"
                        stream_url = info.get("url") or info.get("webpage_url") or top.stream_url
                        return AudioResolutionResult(
                            stream_url=stream_url,
                            extractor=info.get("extractor", top.extractor),
                            source_bitrate_kbps=int(round(abr)),
                            source_format=acodec,
                            filesize_approx=info.get("filesize") or info.get("filesize_approx"),
                            raw_info=info,
                            is_direct_stream=False,
                            match_score=top.match_score,
                        )
                except Exception as stream_err:
                    logger.warning(f"[Cascade] Failed to extract final stream from {top.extractor}: {stream_err}, cascading...")
                    continue
            else:
                logger.info(
                    f"[Cascade] Tier {provider.priority} ({provider.name}) top candidate '{top.title}' "
                    f"scored {top.match_score:.1f} (below {TrackMatcher.MATCH_THRESHOLD}), cascading to next tier..."
                )

        # 4. Fallback if no tier met >= 70.0 threshold
        if all_candidates:
            all_candidates.sort(key=lambda c: c.match_score, reverse=True)
            best_overall = all_candidates[0]
            if best_overall.match_score >= 55.0:
                logger.warning(
                    f"[Cascade] Using best overall candidate '{best_overall.title}' with moderate confidence ({best_overall.match_score:.1f})"
                )
                if best_overall.is_direct_stream:
                    return AudioResolutionResult(
                        stream_url=best_overall.stream_url,
                        extractor=best_overall.extractor,
                        source_bitrate_kbps=best_overall.source_bitrate_kbps,
                        source_format=best_overall.source_format,
                        filesize_approx=best_overall.filesize_approx,
                        raw_info=best_overall.raw_info,
                        is_direct_stream=True,
                        match_score=best_overall.match_score,
                    )
                # Resolve stream
                def _resolve_fallback():
                    opts = get_default_ydl_opts({"format": "bestaudio/best", "extract_flat": False, "noplaylist": True})
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        return ydl.extract_info(best_overall.stream_url, download=False)
                info = await loop.run_in_executor(None, _resolve_fallback)
                if info:
                    abr = info.get("abr") or info.get("tbr") or 160
                    return AudioResolutionResult(
                        stream_url=info.get("url") or info.get("webpage_url") or best_overall.stream_url,
                        extractor=info.get("extractor", best_overall.extractor),
                        source_bitrate_kbps=int(round(abr)),
                        source_format=info.get("acodec") or "opus",
                        raw_info=info,
                        is_direct_stream=False,
                        match_score=best_overall.match_score,
                    )

        raise ValueError(
            f"No matching audio track found for '{query_str}' across any provider. "
            f"All evaluated candidates failed confidence thresholds."
        )
