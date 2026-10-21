import os
import shutil
from pathlib import Path
from typing import Optional
from app.core.config import settings
from app.core.security import sanitize_filename, sanitize_path_component
from app.schemas.types import TrackMetadata

class FileManager:
    @staticmethod
    def get_output_path(
        track: TrackMetadata,
        extension: str = "mp3",
        custom_base_dir: Optional[str] = None,
        naming_template: Optional[str] = None,
    ) -> Path:
        """
        Computes the target file path according to the organizational structure:
        BaseDir / SanitizedArtist / SanitizedAlbum / {track:02d} - {title}.ext
        Guarantees that path traversal or illegal filename characters are impossible.
        """
        if custom_base_dir:
            base_dir = Path(os.path.expanduser(os.path.expandvars(custom_base_dir)))
        else:
            base_dir = settings.resolved_output_dir

        artist_folder = sanitize_path_component(track.artist or "Unknown Artist")
        album_folder = sanitize_path_component(track.album or "Singles")

        target_dir = base_dir / artist_folder / album_folder
        target_dir.mkdir(parents=True, exist_ok=True)

        track_num = f"{track.track_number:02d}" if track.track_number else "01"
        sanitized_title = sanitize_filename(track.title)

        if naming_template:
            # Simple placeholder substitution
            filename_str = (
                naming_template
                .replace("{track}", track_num)
                .replace("{title}", sanitized_title)
                .replace("{artist}", sanitize_filename(track.artist))
                .replace("{album}", sanitize_filename(track.album))
            )
            filename_str = sanitize_filename(filename_str)
        else:
            filename_str = f"{track_num} - {sanitized_title}"

        ext_clean = extension.lstrip('.').lower()
        candidate = target_dir / f"{filename_str}.{ext_clean}"

        # Prevent accidental overwrites
        counter = 1
        while candidate.exists():
            candidate = target_dir / f"{filename_str} ({counter}).{ext_clean}"
            counter += 1

        return candidate

    @staticmethod
    def create_temp_file(prefix: str = "sabrina_", suffix: str = ".tmp") -> Path:
        """Creates a temporary file inside the configured temporary directory."""
        temp_dir = settings.resolved_temp_dir
        temp_dir.mkdir(parents=True, exist_ok=True)
        import uuid
        temp_file = temp_dir / f"{prefix}{uuid.uuid4().hex[:8]}{suffix}"
        return temp_file

    @staticmethod
    def cleanup_file(path: Optional[Path]) -> None:
        """Safely removes a file if it exists."""
        if path and path.exists():
            try:
                path.unlink(missing_ok=True)
            except Exception:
                pass

    @staticmethod
    def cleanup_temp_dir() -> None:
        """Cleans up all files in the temp directory."""
        temp_dir = settings.resolved_temp_dir
        if temp_dir.exists():
            for item in temp_dir.iterdir():
                try:
                    if item.is_file():
                        item.unlink()
                    elif item.is_dir():
                        shutil.rmtree(item)
                except Exception:
                    pass
