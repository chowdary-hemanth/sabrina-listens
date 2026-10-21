import asyncio
import os
from datetime import datetime, date
from typing import List, Optional, Tuple, Any
import yt_dlp
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.schemas.types import (
    ResourceType,
    ProviderType,
    TrackMetadata,
    ResourceResponse,
    QualityOption,
)
from app.services.url_parser import ParsedUrl

def clean_release_date(raw: Any) -> Optional[str]:
    if not raw:
        return None
    if isinstance(raw, (datetime, date)):
        return raw.strftime("%Y-%m-%d")
    return str(raw).strip()

def build_quality_options(source_bitrate_kbps: int = 160, duration_seconds: int = 210) -> List[QualityOption]:
    """
    Constructs available output quality options.
    In CLOUD_MODE: returns a fixed 320kbps direct stream without CPU transcoding.
    In Local Mode: returns full suite of transcoding options.
    """
    def est_size(kbps: int) -> str:
        bytes_val = (kbps * 1000 // 8) * max(duration_seconds, 60)
        mb = bytes_val / (1024 * 1024)
        return f"~{mb:.1f} MB"

    if settings.CLOUD_MODE:
        return [
            QualityOption(
                id="mp3_320",
                label="320 kbps (Direct Stream - Fast)",
                format="mp3",
                bitrate_kbps=320,
                requires_transcoding=False,
                description="Fast direct audio extraction optimized for cloud execution without CPU transcoding.",
                warning=None,
                is_lossless=False,
                estimated_size_mb=est_size(320),
            )
        ]

    return [
        QualityOption(
            id="original",
            label="Original Source Quality",
            format="original",
            bitrate_kbps=source_bitrate_kbps,
            requires_transcoding=False,
            description=f"Best available source audio (~{source_bitrate_kbps} kbps, no lossy re-encoding)",
            warning=None,
            is_lossless=False,
        ),
        QualityOption(
            id="mp3_320",
            label="MP3 (320 kbps)",
            format="mp3",
            bitrate_kbps=320,
            requires_transcoding=True,
            description=f"Maximum MP3 bitrate ({est_size(320)})",
            warning=f"Transcoded from ~{source_bitrate_kbps} kbps source. Encoding at 320 kbps preserves current quality but cannot restore missing frequency detail.",
            is_lossless=False,
        ),
        QualityOption(
            id="mp3_256",
            label="MP3 (256 kbps)",
            format="mp3",
            bitrate_kbps=256,
            requires_transcoding=True,
            description=f"High quality MP3 ({est_size(256)})",
            warning=None if source_bitrate_kbps >= 256 else f"Source is ~{source_bitrate_kbps} kbps.",
            is_lossless=False,
        ),
        QualityOption(
            id="mp3_192",
            label="MP3 (192 kbps)",
            format="mp3",
            bitrate_kbps=192,
            requires_transcoding=True,
            description=f"Standard quality MP3 ({est_size(192)})",
            warning=None,
            is_lossless=False,
        ),
        QualityOption(
            id="aac_256",
            label="AAC / M4A (256 kbps)",
            format="m4a",
            bitrate_kbps=256,
            requires_transcoding=True,
            description=f"High-efficiency AAC format ({est_size(256)})",
            warning=None,
            is_lossless=False,
        ),
        QualityOption(
            id="flac",
            label="FLAC (Lossless Container)",
            format="flac",
            bitrate_kbps=None,
            requires_transcoding=True,
            description=f"Uncompressed FLAC stream ({est_size(800)})",
            warning="Lossless container encoding lossy source. File size will be larger without improving source audio quality.",
            is_lossless=True,
        ),
    ]

class MetadataService:
    @staticmethod
    async def resolve_resource(parsed: ParsedUrl) -> ResourceResponse:
        """Resolves metadata for the parsed URL based on its provider."""
        if parsed.provider == ProviderType.SPOTIFY:
            return await MetadataService._resolve_spotify(parsed)
        elif parsed.provider == ProviderType.YOUTUBE:
            return await MetadataService._resolve_youtube(parsed)
        elif parsed.provider == ProviderType.DIRECT:
            return await MetadataService._resolve_direct(parsed)
        else:
            raise ValueError(f"Unsupported provider: {parsed.provider}")

    @staticmethod
    async def _resolve_spotify(parsed: ParsedUrl) -> ResourceResponse:
        """Resolves Spotify metadata (track, album, playlist, artist)."""
        from spotify_scraper import SpotifyClient

        loop = asyncio.get_event_loop()

        def _fetch():
            with SpotifyClient() as client:
                if parsed.resource_type == ResourceType.TRACK:
                    t = client.get_track(parsed.cleaned_url)
                    artist_name = t.artists[0].name if t.artists else "Unknown Artist"
                    album_name = t.album.name if t.album else "Single"
                    cover = t.album.images[0].url if t.album and getattr(t.album, 'images', None) else None
                    duration = (t.duration_ms or 0) // 1000

                    track_meta = TrackMetadata(
                        id=f"sp_track_{t.id or parsed.resource_id}",
                        title=t.name,
                        artist=artist_name,
                        album=album_name,
                        album_art_url=cover,
                        duration_seconds=duration,
                        release_date=clean_release_date(getattr(t.album, 'release_date', None) if getattr(t, 'album', None) else None),
                        track_number=getattr(t, 'track_number', 1) or 1,
                        explicit=getattr(t, 'explicit', False),
                        provider="spotify",
                        source_url=parsed.cleaned_url,
                        source_bitrate_kbps=160,
                        source_format="audio/opus",
                    )
                    return ResourceResponse(
                        resource_id=f"spotify_{parsed.resource_id}",
                        resource_type=ResourceType.TRACK,
                        provider=ProviderType.SPOTIFY,
                        title=t.name,
                        artist=artist_name,
                        cover_url=cover,
                        track_count=1,
                        tracks=[track_meta],
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, duration),
                    )

                elif parsed.resource_type == ResourceType.ALBUM:
                    alb = client.get_album(parsed.cleaned_url)
                    artist_name = alb.artists[0].name if getattr(alb, 'artists', None) else "Unknown Artist"
                    cover = alb.images[0].url if getattr(alb, 'images', None) else None
                    tracks_list = []
                    total_dur = 0
                    for idx, trk in enumerate(getattr(alb, 'tracks', [])):
                        trk_dur = (trk.duration_ms or 0) // 1000
                        total_dur += trk_dur
                        tracks_list.append(
                            TrackMetadata(
                                id=f"sp_alb_{alb.id}_{trk.id or idx}",
                                title=trk.name,
                                artist=artist_name,
                                album=alb.name,
                                album_art_url=cover,
                                duration_seconds=trk_dur,
                                release_date=clean_release_date(getattr(alb, 'release_date', None)),
                                track_number=getattr(trk, 'track_number', idx + 1) or (idx + 1),
                                explicit=getattr(trk, 'explicit', False),
                                provider="spotify",
                                source_url=f"https://open.spotify.com/track/{trk.id}" if getattr(trk, 'id', None) else parsed.cleaned_url,
                                source_bitrate_kbps=160,
                                source_format="audio/opus",
                            )
                        )
                    return ResourceResponse(
                        resource_id=f"spotify_album_{parsed.resource_id}",
                        resource_type=ResourceType.ALBUM,
                        provider=ProviderType.SPOTIFY,
                        title=alb.name,
                        artist=artist_name,
                        cover_url=cover,
                        track_count=len(tracks_list),
                        tracks=tracks_list,
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, total_dur // max(len(tracks_list), 1)),
                    )

                elif parsed.resource_type == ResourceType.PLAYLIST:
                    pl = client.get_playlist(parsed.cleaned_url)
                    cover = pl.images[0].url if getattr(pl, 'images', None) else None
                    tracks_list = []
                    total_dur = 0
                    for idx, raw_item in enumerate(getattr(pl, 'tracks', [])):
                        # In spotifyscraper, PlaylistTrack wraps the actual Track inside .track
                        trk = getattr(raw_item, 'track', raw_item) or raw_item
                        if not trk:
                            continue

                        # Extract artists
                        artists = getattr(trk, 'artists', None) or []
                        trk_artist = artists[0].name if artists and hasattr(artists[0], 'name') else "Various Artists"

                        album_obj = getattr(trk, 'album', None)
                        trk_album = getattr(album_obj, 'name', None) or getattr(pl, 'name', 'Playlist')

                        dur_ms = getattr(trk, 'duration_ms', 0) or 0
                        trk_dur = dur_ms // 1000
                        total_dur += trk_dur

                        # Extract album art if available
                        album_images = getattr(album_obj, 'images', None) if album_obj else None
                        trk_cover = album_images[0].url if album_images and len(album_images) > 0 and hasattr(album_images[0], 'url') else cover

                        trk_id = getattr(trk, 'id', None) or f"{idx}"
                        trk_title = getattr(trk, 'name', None) or f"Track {idx + 1}"

                        tracks_list.append(
                            TrackMetadata(
                                id=f"sp_pl_{getattr(pl, 'id', 'pl')}_{trk_id}",
                                title=trk_title,
                                artist=trk_artist,
                                album=trk_album,
                                album_art_url=trk_cover,
                                duration_seconds=trk_dur,
                                release_date=clean_release_date(getattr(album_obj, 'release_date', None) if album_obj else None),
                                track_number=idx + 1,
                                explicit=getattr(trk, 'explicit', False) or False,
                                provider="spotify",
                                source_url=f"https://open.spotify.com/track/{trk_id}" if getattr(trk, 'id', None) else parsed.cleaned_url,
                                source_bitrate_kbps=160,
                                source_format="audio/opus",
                            )
                        )
                    return ResourceResponse(
                        resource_id=f"spotify_pl_{parsed.resource_id}",
                        resource_type=ResourceType.PLAYLIST,
                        provider=ProviderType.SPOTIFY,
                        title=pl.name,
                        artist="Curated Playlist",
                        cover_url=cover,
                        track_count=len(tracks_list),
                        tracks=tracks_list,
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, total_dur // max(len(tracks_list), 1)),
                    )

                elif parsed.resource_type == ResourceType.ARTIST:
                    art = client.get_artist(parsed.cleaned_url)
                    cover = art.images[0].url if getattr(art, 'images', None) else None
                    tracks_list = []
                    for idx, trk in enumerate(getattr(art, 'top_tracks', [])):
                        trk_dur = (trk.duration_ms or 0) // 1000
                        tracks_list.append(
                            TrackMetadata(
                                id=f"sp_art_{art.id}_{trk.id or idx}",
                                title=trk.name,
                                artist=art.name,
                                album="Top Tracks",
                                album_art_url=cover,
                                duration_seconds=trk_dur,
                                track_number=idx + 1,
                                explicit=getattr(trk, 'explicit', False),
                                provider="spotify",
                                source_url=f"https://open.spotify.com/track/{trk.id}" if getattr(trk, 'id', None) else parsed.cleaned_url,
                                source_bitrate_kbps=160,
                                source_format="audio/opus",
                            )
                        )
                    return ResourceResponse(
                        resource_id=f"spotify_artist_{parsed.resource_id}",
                        resource_type=ResourceType.ARTIST,
                        provider=ProviderType.SPOTIFY,
                        title=f"{art.name} (Top Tracks)",
                        artist=art.name,
                        cover_url=cover,
                        track_count=len(tracks_list),
                        tracks=tracks_list,
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, 200),
                    )

                raise ValueError(f"Unsupported Spotify resource type: {parsed.resource_type}")

        return await loop.run_in_executor(None, _fetch)

    @staticmethod
    async def _resolve_youtube(parsed: ParsedUrl) -> ResourceResponse:
        """Resolves YouTube video or playlist metadata."""
        loop = asyncio.get_event_loop()

        def _fetch():
            ydl_opts = {
                'quiet': True,
                'skip_download': True,
                'extract_flat': 'in_playlist',
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(parsed.cleaned_url, download=False)
                if not info:
                    raise ValueError("Could not extract info from YouTube link")

                if '_type' in info and info['_type'] == 'playlist':
                    title = info.get('title', 'YouTube Playlist')
                    uploader = info.get('uploader') or info.get('channel') or 'YouTube'
                    entries = info.get('entries', [])
                    tracks_list = []
                    for idx, e in enumerate(entries):
                        dur = int(e.get('duration') or 0)
                        tracks_list.append(
                            TrackMetadata(
                                id=f"yt_{e.get('id', idx)}",
                                title=e.get('title', f"Track {idx + 1}"),
                                artist=e.get('uploader') or uploader,
                                album=title,
                                album_art_url=e.get('thumbnail'),
                                duration_seconds=dur,
                                track_number=idx + 1,
                                provider="youtube",
                                source_url=f"https://www.youtube.com/watch?v={e.get('id')}",
                                source_bitrate_kbps=160,
                                source_format="audio/webm",
                            )
                        )
                    cover = info.get('thumbnails', [{}])[-1].get('url') if info.get('thumbnails') else None
                    return ResourceResponse(
                        resource_id=f"yt_pl_{parsed.resource_id}",
                        resource_type=ResourceType.PLAYLIST,
                        provider=ProviderType.YOUTUBE,
                        title=title,
                        artist=uploader,
                        cover_url=cover,
                        track_count=len(tracks_list),
                        tracks=tracks_list,
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, 210),
                    )
                else:
                    title = info.get('title', 'YouTube Audio')
                    uploader = info.get('uploader') or info.get('channel') or 'Artist'
                    cover = info.get('thumbnail')
                    dur = int(info.get('duration') or 0)
                    track_meta = TrackMetadata(
                        id=f"yt_track_{info.get('id', parsed.resource_id)}",
                        title=title,
                        artist=uploader,
                        album="YouTube Single",
                        album_art_url=cover,
                        duration_seconds=dur,
                        track_number=1,
                        provider="youtube",
                        source_url=parsed.cleaned_url,
                        source_bitrate_kbps=160,
                        source_format="audio/webm",
                    )
                    return ResourceResponse(
                        resource_id=f"yt_{parsed.resource_id}",
                        resource_type=ResourceType.YOUTUBE,
                        provider=ProviderType.YOUTUBE,
                        title=title,
                        artist=uploader,
                        cover_url=cover,
                        track_count=1,
                        tracks=[track_meta],
                        original_url=parsed.cleaned_url,
                        available_qualities=build_quality_options(160, dur),
                    )

        return await loop.run_in_executor(None, _fetch)

    @staticmethod
    async def _resolve_direct(parsed: ParsedUrl) -> ResourceResponse:
        """Resolves direct audio link metadata via HEAD request."""
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.head(parsed.cleaned_url)
            content_type = resp.headers.get("content-type", "audio/mpeg")
            content_length = int(resp.headers.get("content-length", 0))

        title = parsed.resource_id
        for ext in ('.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac'):
            if title.lower().endswith(ext):
                title = title[:-len(ext)]
                break

        track_meta = TrackMetadata(
            id=f"direct_{hash(parsed.cleaned_url)}",
            title=title,
            artist="Direct Source",
            album="Audio Files",
            duration_seconds=180,
            track_number=1,
            provider="direct",
            source_url=parsed.cleaned_url,
            source_bitrate_kbps=320,
            source_format=content_type,
            estimated_size_bytes=content_length or None,
        )
        return ResourceResponse(
            resource_id=f"direct_{hash(parsed.cleaned_url)}",
            resource_type=ResourceType.DIRECT,
            provider=ProviderType.DIRECT,
            title=title,
            artist="Direct Audio",
            cover_url=None,
            track_count=1,
            tracks=[track_meta],
            original_url=parsed.cleaned_url,
            available_qualities=build_quality_options(320, 180),
        )
