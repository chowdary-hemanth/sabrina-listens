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
        Resolves a playable/downloadable audio stream for a track.
        For Spotify tracks, searches for the official audio track using yt-dlp search query.
        For YouTube tracks, retrieves the best audio stream.
        For Direct audio, uses the direct URL.
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
            query = ""
            if track.provider == "spotify":
                # Clean title (remove (feat. ...) or extra parentheticals if needed, but keeping full query usually gives exact topic match)
                query = f"ytsearch1:{track.artist} - {track.title} audio"
            elif track.provider == "youtube" and track.source_url:
                query = track.source_url
            else:
                query = f"ytsearch1:{track.artist} - {track.title}"

            ydl_opts = get_default_ydl_opts({
                'format': 'bestaudio/best',
                'extract_flat': False,
                'noplaylist': True,
            })

            info = None
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    logger.info(f"Resolving audio stream for query: {query}")
                    info = ydl.extract_info(query, download=False)
            except Exception as e:
                err_str = str(e).lower()
                if "bot" in err_str or "sign in" in err_str:
                    logger.warning(f"Bot detection challenge encountered during audio resolution ({e}). Retrying with mobile player client...")
                    try:
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
                            info = ydl.extract_info(query, download=False)
                    except Exception as fallback_err:
                        # Fallback to SoundCloud
                        search_title = f"{track.artist} - {track.title}" if track.artist else track.title
                        logger.warning(f"YouTube bot block persists on datacenter IP. Falling back to SoundCloud search for '{search_title}': {fallback_err}")
                        sc_opts = {'quiet': True, 'format': 'bestaudio/best', 'no_warnings': True}
                        with yt_dlp.YoutubeDL(sc_opts) as sc_ydl:
                            info = sc_ydl.extract_info(f"scsearch1:{search_title}", download=False)
                else:
                    raise

            if not info:
                raise ValueError(f"No audio stream found for {track.artist} - {track.title}")

            # If it's a search result, take first entry
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
