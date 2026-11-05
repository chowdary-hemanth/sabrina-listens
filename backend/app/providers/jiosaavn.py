import base64
from typing import List, Optional
import httpx
from Crypto.Cipher import DES
from app.core.logging import logger
from app.schemas.types import TrackMetadata
from app.providers.base import BaseAudioProvider, CandidateAudio

JIOSAAVN_API_URL = "https://www.jiosaavn.com/api.php"
DES_KEY = b"38346591"

class JioSaavnProvider(BaseAudioProvider):
    name: str = "jiosaavn"
    priority: int = 1

    @staticmethod
    def _decrypt_media_url(enc_url: str) -> Optional[str]:
        """Decrypts JioSaavn encrypted_media_url using DES-ECB and unpads PKCS5."""
        try:
            cipher = DES.new(DES_KEY, DES.MODE_ECB)
            raw_bytes = base64.b64decode(enc_url)
            decrypted = cipher.decrypt(raw_bytes)
            # PKCS5 unpad
            pad_len = decrypted[-1]
            if 1 <= pad_len <= 8:
                decrypted = decrypted[:-pad_len]
            return decrypted.decode("utf-8")
        except Exception as e:
            logger.debug(f"JioSaavn DES decryption error: {e}")
            return None

    async def search_candidates(self, track: TrackMetadata) -> List[CandidateAudio]:
        """
        Queries JioSaavn search API and generates direct high-bitrate AAC candidates.
        """
        query = f"{track.artist} {track.title}".strip() if track.artist else track.title
        candidates: List[CandidateAudio] = []

        params = {
            "__call": "search.getResults",
            "_format": "json",
            "_marker": "0",
            "api_version": "4",
            "p": "1",
            "n": "8",
            "q": query,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
                resp = await client.get(JIOSAAVN_API_URL, params=params)
                if resp.status_code != 200:
                    logger.warning(f"JioSaavn API HTTP {resp.status_code} for query: {query}")
                    return []

                data = resp.json()
                results = data.get("results", [])
                if not results:
                    return []

                for item in results:
                    title = item.get("title") or item.get("song") or ""
                    more_info = item.get("more_info", {})
                    
                    # Duration in seconds
                    dur_raw = more_info.get("duration") or item.get("duration")
                    try:
                        dur_sec = int(dur_raw) if dur_raw else None
                    except (ValueError, TypeError):
                        dur_sec = None

                    # Artist names
                    artist_map = more_info.get("artistMap", {})
                    primary_artists = [a.get("name") for a in artist_map.get("primary_artists", []) if a.get("name")]
                    artist_str = ", ".join(primary_artists) if primary_artists else (more_info.get("music") or "")

                    # Media URL resolution
                    enc_url = more_info.get("encrypted_media_url")
                    decrypted_url = self._decrypt_media_url(enc_url) if enc_url else None
                    
                    if not decrypted_url:
                        # Fallback to preview_url rewriting
                        preview_url = item.get("media_preview_url") or more_info.get("preview_url")
                        if preview_url and "preview.saavncdn.com" in preview_url:
                            decrypted_url = preview_url.replace("preview.saavncdn.com", "aac.saavncdn.com")

                    if not decrypted_url:
                        continue

                    # Select 320 kbps stream if available, otherwise 160 kbps
                    is_320 = str(more_info.get("320kbps", "")).lower() == "true"
                    if is_320:
                        stream_url = decrypted_url.replace("_96.mp4", "_320.mp4").replace("_160.mp4", "_320.mp4")
                        bitrate = 320
                    else:
                        stream_url = decrypted_url.replace("_96.mp4", "_160.mp4")
                        bitrate = 160

                    candidates.append(
                        CandidateAudio(
                            title=title,
                            artist=artist_str,
                            stream_url=stream_url,
                            extractor="jiosaavn",
                            source_bitrate_kbps=bitrate,
                            source_format="m4a",
                            duration_seconds=dur_sec,
                            is_direct_stream=True,
                            raw_info=item,
                        )
                    )

        except Exception as e:
            logger.warning(f"JioSaavn candidate search error for '{query}': {e}")

        return candidates
