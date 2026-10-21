import asyncio
from pathlib import Path
from typing import Optional
import httpx
import mutagen
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TRCK, TDRC, APIC, ID3NoHeaderError
from mutagen.mp4 import MP4, MP4Cover
from mutagen.flac import FLAC, Picture
from app.core.logging import logger
from app.schemas.types import TrackMetadata

class TaggingService:
    @staticmethod
    async def apply_metadata_and_artwork(
        file_path: Path,
        track: TrackMetadata,
        album_art_bytes: Optional[bytes] = None,
    ) -> None:
        """
        Applies metadata tags and embeds album artwork in the audio file.
        Supports MP3, M4A, and FLAC containers.
        """
        loop = asyncio.get_event_loop()

        # If album art URL is provided and bytes not pre-fetched, download them
        if not album_art_bytes and track.album_art_url:
            try:
                async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                    resp = await client.get(track.album_art_url)
                    if resp.status_code == 200:
                        album_art_bytes = resp.content
            except Exception as e:
                logger.warning(f"Could not download album artwork: {e}")

        def _tag():
            ext = file_path.suffix.lower()

            try:
                if ext == ".mp3":
                    TaggingService._tag_mp3(file_path, track, album_art_bytes)
                elif ext in (".m4a", ".mp4", ".aac"):
                    TaggingService._tag_mp4(file_path, track, album_art_bytes)
                elif ext == ".flac":
                    TaggingService._tag_flac(file_path, track, album_art_bytes)
                else:
                    logger.info(f"Skipping tagging for unsupported extension: {ext}")
            except Exception as e:
                logger.error(f"Error applying tags to {file_path.name}: {e}")

        await loop.run_in_executor(None, _tag)

    @staticmethod
    def _tag_mp3(file_path: Path, track: TrackMetadata, art_bytes: Optional[bytes]):
        try:
            tags = ID3(file_path)
        except ID3NoHeaderError:
            tags = ID3()

        tags.add(TIT2(encoding=3, text=track.title))
        tags.add(TPE1(encoding=3, text=track.artist))
        tags.add(TALB(encoding=3, text=track.album))
        if track.track_number:
            tags.add(TRCK(encoding=3, text=str(track.track_number)))
        if track.release_date:
            year = track.release_date.split("-")[0]
            tags.add(TDRC(encoding=3, text=year))

        if art_bytes:
            tags.add(
                APIC(
                    encoding=3,
                    mime="image/jpeg",
                    type=3,  # Cover (front)
                    desc="Cover",
                    data=art_bytes,
                )
            )

        tags.save(file_path)

    @staticmethod
    def _tag_mp4(file_path: Path, track: TrackMetadata, art_bytes: Optional[bytes]):
        audio = MP4(file_path)
        audio["\xa9nam"] = [track.title]
        audio["\xa9ART"] = [track.artist]
        audio["\xa9alb"] = [track.album]
        if track.track_number:
            audio["trkn"] = [(track.track_number, track.total_tracks or 0)]
        if track.release_date:
            year = track.release_date.split("-")[0]
            audio["\xa9day"] = [year]

        if art_bytes:
            audio["covr"] = [
                MP4Cover(art_bytes, imageformat=MP4Cover.FORMAT_JPEG)
            ]

        audio.save()

    @staticmethod
    def _tag_flac(file_path: Path, track: TrackMetadata, art_bytes: Optional[bytes]):
        audio = FLAC(file_path)
        audio["title"] = track.title
        audio["artist"] = track.artist
        audio["album"] = track.album
        if track.track_number:
            audio["tracknumber"] = str(track.track_number)
        if track.release_date:
            year = track.release_date.split("-")[0]
            audio["date"] = year

        if art_bytes:
            image = Picture()
            image.type = 3
            image.mime = "image/jpeg"
            image.desc = "Cover"
            image.data = art_bytes
            audio.clear_pictures()
            audio.add_picture(image)

        audio.save()
