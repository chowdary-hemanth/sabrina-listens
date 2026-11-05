import asyncio
from typing import List, Optional, Any, Dict
import httpx
from app.core.logging import logger
from app.schemas.types import TrackMetadata
from app.providers.base import BaseAudioProvider, CandidateAudio

INNERTUBE_URL = "https://music.youtube.com/youtubei/v1/search"

def parse_duration_str(dur_str: str) -> Optional[int]:
    """Converts MM:SS or HH:MM:SS into seconds."""
    if not dur_str or not isinstance(dur_str, str):
        return None
    parts = dur_str.strip().split(":")
    try:
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        elif len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except ValueError:
        pass
    return None

class YouTubeMusicProvider(BaseAudioProvider):
    name: str = "youtube_music"
    priority: int = 2

    async def search_candidates(self, track: TrackMetadata) -> List[CandidateAudio]:
        """
        Searches YouTube Music via InnerTube WEB_REMIX API without requiring API keys or cookies.
        """
        query = f"{track.artist} - {track.title}".strip(" -") if track.artist else track.title
        candidates: List[CandidateAudio] = []

        payload = {
            "context": {
                "client": {
                    "clientName": "WEB_REMIX",
                    "clientVersion": "1.20240101.01.00",
                    "hl": "en",
                    "gl": "US",
                }
            },
            "query": query,
        }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://music.youtube.com/",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(INNERTUBE_URL, json=payload, headers=headers)
                if resp.status_code != 200:
                    logger.warning(f"YouTube Music InnerTube HTTP {resp.status_code} for query: {query}")
                    return []

                data = resp.json()

                # Walk JSON to find all musicResponsiveListItemRenderer nodes
                def walk_items(node: Any):
                    if isinstance(node, dict):
                        if "musicResponsiveListItemRenderer" in node:
                            yield node["musicResponsiveListItemRenderer"]
                        for v in node.values():
                            yield from walk_items(v)
                    elif isinstance(node, list):
                        for item in node:
                            yield from walk_items(item)

                for item in walk_items(data):
                    flex_cols = item.get("flexColumns", [])
                    if not flex_cols:
                        continue

                    # Extract Title
                    cand_title = ""
                    try:
                        col0_runs = flex_cols[0]["musicResponsiveListItemFlexColumnRenderer"]["text"]["runs"]
                        cand_title = "".join(r.get("text", "") for r in col0_runs)
                    except Exception:
                        continue

                    # Extract Artist & Duration across flex columns
                    cand_artist = ""
                    cand_dur = None
                    try:
                        for col in flex_cols[1:]:
                            col_runs = col.get("musicResponsiveListItemFlexColumnRenderer", {}).get("text", {}).get("runs", [])
                            for r in col_runs:
                                t = r.get("text", "").strip()
                                if not t or t in ("•", "&", ","):
                                    continue
                                parsed_d = parse_duration_str(t)
                                if parsed_d is not None:
                                    cand_dur = parsed_d
                                elif (
                                    t.lower() not in ("song", "video", "artist", "album", "single", "ep")
                                    and not cand_artist
                                    and not t.lower().endswith("views")
                                    and not t.lower().endswith("plays")
                                    and not t.lower().endswith("audience")
                                ):
                                    cand_artist = t
                    except Exception:
                        pass

                    # Extract Video ID
                    vid = item.get("playlistItemData", {}).get("videoId")
                    if not vid:
                        try:
                            overlay = item.get("overlay", {}).get("musicItemThumbnailOverlayRenderer", {})
                            vid = overlay["content"]["musicPlayButtonRenderer"]["playNavigationEndpoint"]["watchEndpoint"]["videoId"]
                        except Exception:
                            pass

                    if not vid:
                        continue

                    stream_url = f"https://music.youtube.com/watch?v={vid}"

                    candidates.append(
                        CandidateAudio(
                            title=cand_title,
                            artist=cand_artist,
                            stream_url=stream_url,
                            extractor="youtube_music",
                            source_bitrate_kbps=160,
                            source_format="opus",
                            duration_seconds=cand_dur,
                            uploader=cand_artist,
                            is_direct_stream=False,
                            raw_info={"video_id": vid, "url": stream_url},
                        )
                    )

                    if len(candidates) >= 8:
                        break

        except Exception as e:
            logger.warning(f"YouTube Music search error for '{query}': {e}")

        return candidates
