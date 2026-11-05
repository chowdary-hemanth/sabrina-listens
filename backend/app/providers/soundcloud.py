import asyncio
from typing import List
import yt_dlp
from app.core.logging import logger
from app.schemas.types import TrackMetadata
from app.providers.base import BaseAudioProvider, CandidateAudio

class SoundCloudProvider(BaseAudioProvider):
    name: str = "soundcloud"
    priority: int = 4

    async def search_candidates(self, track: TrackMetadata) -> List[CandidateAudio]:
        """
        Searches SoundCloud for playable audio tracks, filtering out previews and Go+ snippets.
        """
        loop = asyncio.get_event_loop()
        query = f"{track.artist} - {track.title}".strip(" -") if track.artist else track.title

        def _search():
            candidates: List[CandidateAudio] = []
            sc_opts = {
                "quiet": True,
                "extract_flat": True,
                "no_warnings": True,
                "ignoreerrors": True,
            }

            try:
                with yt_dlp.YoutubeDL(sc_opts) as ydl:
                    res = ydl.extract_info(f"scsearch8:{query}", download=False)
                    for e in (res.get("entries") or []):
                        if not e:
                            continue

                        cand_title = (e.get("title") or "").lower()
                        # Skip previews or snippets
                        if "preview" in cand_title or "snippet" in cand_title:
                            continue

                        url = e.get("url") or e.get("webpage_url")
                        if not url:
                            continue

                        candidates.append(
                            CandidateAudio(
                                title=e.get("title") or "",
                                artist=e.get("uploader") or track.artist,
                                stream_url=url,
                                extractor="soundcloud",
                                source_bitrate_kbps=128,
                                source_format="mp3",
                                duration_seconds=int(e.get("duration")) if e.get("duration") else None,
                                uploader=e.get("uploader"),
                                is_direct_stream=False,
                                raw_info=e,
                            )
                        )
            except Exception as e:
                logger.warning(f"SoundCloud search failed for '{query}': {e}")

            return candidates

        return await loop.run_in_executor(None, _search)
