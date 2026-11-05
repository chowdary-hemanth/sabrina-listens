import asyncio
from typing import List
import yt_dlp
from app.core.logging import logger
from app.core.ytdlp_utils import get_default_ydl_opts
from app.schemas.types import TrackMetadata
from app.providers.base import BaseAudioProvider, CandidateAudio

class YouTubeSearchProvider(BaseAudioProvider):
    name: str = "youtube_search"
    priority: int = 3

    async def search_candidates(self, track: TrackMetadata) -> List[CandidateAudio]:
        """
        Searches YouTube standard catalog and Topic tracks using flat metadata extraction.
        """
        loop = asyncio.get_event_loop()
        query = f"{track.artist} - {track.title}".strip(" -") if track.artist else track.title

        def _search():
            candidates: List[CandidateAudio] = []
            ydl_opts = get_default_ydl_opts({
                "quiet": True,
                "extract_flat": True,
                "no_warnings": True,
                "noplaylist": True,
                "ignoreerrors": True,
            })

            # Search 1: Standard YouTube search
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    res = ydl.extract_info(f"ytsearch8:{query}", download=False)
                    for e in (res.get("entries") or []):
                        if not e:
                            continue
                        url = e.get("url") or e.get("webpage_url")
                        if not url:
                            vid = e.get("id")
                            url = f"https://www.youtube.com/watch?v={vid}" if vid else ""
                        if not url:
                            continue

                        candidates.append(
                            CandidateAudio(
                                title=e.get("title") or "",
                                artist=e.get("uploader") or track.artist,
                                stream_url=url,
                                extractor="youtube",
                                source_bitrate_kbps=160,
                                source_format="opus",
                                duration_seconds=int(e.get("duration")) if e.get("duration") else None,
                                uploader=e.get("uploader"),
                                is_direct_stream=False,
                                raw_info=e,
                            )
                        )
            except Exception as e:
                logger.warning(f"Standard YouTube search failed for '{query}': {e}")

            # Search 2: YouTube Topic track (high priority audio masters)
            try:
                topic_query = f"{query} Topic"
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    res = ydl.extract_info(f"ytsearch4:{topic_query}", download=False)
                    for e in (res.get("entries") or []):
                        if not e:
                            continue
                        url = e.get("url") or e.get("webpage_url")
                        if not url:
                            vid = e.get("id")
                            url = f"https://www.youtube.com/watch?v={vid}" if vid else ""
                        if not url:
                            continue

                        candidates.append(
                            CandidateAudio(
                                title=e.get("title") or "",
                                artist=e.get("uploader") or track.artist,
                                stream_url=url,
                                extractor="youtube_topic",
                                source_bitrate_kbps=160,
                                source_format="opus",
                                duration_seconds=int(e.get("duration")) if e.get("duration") else None,
                                uploader=e.get("uploader"),
                                is_direct_stream=False,
                                raw_info=e,
                            )
                        )
            except Exception as e:
                logger.debug(f"YouTube Topic search error: {e}")

            return candidates

        return await loop.run_in_executor(None, _search)
