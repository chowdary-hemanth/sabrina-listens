import asyncio
from typing import Dict, Any, Optional
import yt_dlp
from app.core.logging import logger
from app.core.ytdlp_utils import get_default_ydl_opts
from app.schemas.types import TrackMetadata

class AudioResolutionResult:
    def __init__(
        self,
        stream_url: str,
        extractor: str,
        source_bitrate_kbps: int,
        source_format: str,
        filesize_approx: Optional[int] = None,
        raw_info: Optional[Dict[str, Any]] = None,
    ):
        self.stream_url = stream_url
        self.extractor = extractor
        self.source_bitrate_kbps = source_bitrate_kbps
        self.source_format = source_format
        self.filesize_approx = filesize_approx
        self.raw_info = raw_info or {}

class AudioResolver:
    @staticmethod
    async def resolve_audio_source(track: TrackMetadata) -> AudioResolutionResult:
        """
        Resolves a playable/downloadable audio stream for a track across multiple providers:
        1. Direct stream URLs (HTTP, Bandcamp, SoundCloud)
        2. YouTube standard search
        3. YouTube Music search (bypasses guest SafeSearch & age-gate filters)
        4. YouTube Topic / Mobile client search
        5. SoundCloud multi-candidate search (skipping DRM and previews)
        """
        loop = asyncio.get_event_loop()

        if track.provider == "direct" and track.source_url:
            return AudioResolutionResult(
                stream_url=track.source_url,
                extractor="direct",
                source_bitrate_kbps=track.source_bitrate_kbps or 320,
                source_format=track.source_format or "audio/mpeg",
            )

        def _resolve():
            search_title = f"{track.artist} - {track.title}".strip(" -") if track.artist else track.title
            ydl_opts = get_default_ydl_opts({
                'format': 'bestaudio/best',
                'extract_flat': False,
                'noplaylist': True,
            })

            info = None

            # 1. Direct source URL if provided (e.g. YouTube, SoundCloud, Bandcamp)
            if track.source_url and track.provider in ("youtube", "soundcloud", "bandcamp"):
                try:
                    logger.info(f"Resolving direct audio URL for {track.provider}: {track.source_url}")
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        cand = ydl.extract_info(track.source_url, download=False)
                        if cand and not cand.get('drm'):
                            info = cand
                except Exception as direct_err:
                    logger.warning(f"Direct source extraction failed ({direct_err}), falling back to search pipeline...")

            # 2. Tier 1: Standard YouTube Search
            if not info:
                try:
                    query = f"ytsearch1:{search_title} audio"
                    logger.info(f"Resolving audio stream (Tier 1 YouTube): {query}")
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        res = ydl.extract_info(query, download=False)
                        if res:
                            entries = res.get('entries')
                            if entries is not None:
                                valid = [e for e in entries if e]
                                if valid:
                                    info = valid[0]
                            else:
                                info = res
                except Exception as e:
                    logger.warning(f"Tier 1 YouTube search error ({e}), moving to next tier...")

            # 3. Tier 2: YouTube Music Search (Bypasses guest SafeSearch & age restrictions on words like 'Sex')
            if not info:
                try:
                    from urllib.parse import quote_plus
                    ytm_url = f"https://music.youtube.com/search?q={quote_plus(search_title)}"
                    logger.info(f"Resolving audio stream (Tier 2 YouTube Music): {ytm_url}")
                    with yt_dlp.YoutubeDL({'quiet': True, 'extract_flat': True, 'no_warnings': True}) as ytm_ydl:
                        ytm_res = ytm_ydl.extract_info(ytm_url, download=False)
                        for e in (ytm_res.get('entries') or []):
                            u = e.get('url') or e.get('webpage_url') or ''
                            if 'watch?v=' in u:
                                try:
                                    with yt_dlp.YoutubeDL(ydl_opts) as single_ydl:
                                        cand_info = single_ydl.extract_info(u, download=False)
                                        if cand_info:
                                            info = cand_info
                                            logger.info(f"Successfully resolved via YouTube Music: {cand_info.get('title')}")
                                            break
                                except Exception:
                                    continue
                except Exception as ytm_err:
                    logger.warning(f"Tier 2 YouTube Music search failed ({ytm_err}), moving to next tier...")

            # 4. Tier 3: YouTube Mobile Client + Topic Search
            if not info:
                try:
                    topic_query = f"ytsearch1:{search_title} Topic"
                    logger.info(f"Resolving audio stream (Tier 3 YouTube Topic): {topic_query}")
                    fallback_opts = get_default_ydl_opts({
                        'format': 'bestaudio/best',
                        'extract_flat': False,
                        'noplaylist': True,
                        'extractor_args': {
                            'youtube': {
                                'player_client': ['android', 'ios'],
                                'player_skip': ['webpage', 'configs'],
                            }
                        },
                    })
                    with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                        res = ydl.extract_info(topic_query, download=False)
                        if res:
                            entries = res.get('entries')
                            if entries is not None:
                                valid = [e for e in entries if e]
                                if valid:
                                    info = valid[0]
                            else:
                                info = res
                except Exception as topic_err:
                    logger.warning(f"Tier 3 YouTube Topic search failed ({topic_err}), moving to next tier...")

            # 5. Tier 4: SoundCloud Multi-Candidate Search (Skips Go+ DRM and previews)
            if not info:
                try:
                    logger.info(f"Resolving audio stream (Tier 4 SoundCloud): scsearch5:{search_title}")
                    sc_opts = {'quiet': True, 'extract_flat': True, 'no_warnings': True, 'ignoreerrors': True}
                    with yt_dlp.YoutubeDL(sc_opts) as sc_ydl:
                        sc_res = sc_ydl.extract_info(f"scsearch5:{search_title}", download=False)
                        entries = sc_res.get('entries', []) if sc_res else []
                        for e in entries:
                            if not e:
                                continue
                            cand_title = (e.get('title') or '').lower()
                            if 'preview' in cand_title or 'snippet' in cand_title:
                                continue
                            cand_url = e.get('url') or e.get('webpage_url')
                            if not cand_url:
                                continue
                            try:
                                with yt_dlp.YoutubeDL({'quiet': True, 'format': 'bestaudio/best', 'no_warnings': True, 'ignoreerrors': True}) as cand_ydl:
                                    c_info = cand_ydl.extract_info(cand_url, download=False)
                                    if c_info and not c_info.get('drm'):
                                        fmts = c_info.get('formats', [])
                                        if any('preview' not in (f.get('format_id') or '') for f in fmts):
                                            info = c_info
                                            logger.info(f"Successfully resolved via SoundCloud: {c_info.get('title')}")
                                            break
                            except Exception:
                                continue
                except Exception as sc_err:
                    logger.warning(f"Tier 4 SoundCloud search failed ({sc_err})")

            if not info:
                raise ValueError(f"No audio stream found for {track.artist} - {track.title} across all available sources.")

            # If it's still a playlist/search container, take the first entry
            if 'entries' in info and info['entries']:
                info = info['entries'][0]

            # Extract audio bitrate and format
            abr = info.get('abr') or info.get('tbr') or 160
            source_bitrate = int(round(abr))
            acodec = info.get('acodec') or info.get('ext') or 'opus'
            filesize = info.get('filesize') or info.get('filesize_approx')

            # Direct stream or video url
            stream_url = info.get('url') or info.get('webpage_url')

            return AudioResolutionResult(
                stream_url=stream_url,
                extractor=info.get('extractor', 'youtube'),
                source_bitrate_kbps=source_bitrate,
                source_format=acodec,
                filesize_approx=filesize,
                raw_info=info,
            )

        return await loop.run_in_executor(None, _resolve)
