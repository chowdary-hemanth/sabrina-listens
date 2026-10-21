import asyncio
import os
import subprocess
from pathlib import Path
from typing import Optional
from app.core.config import settings
from app.core.logging import logger

class TranscodingError(Exception):
    pass

class TranscodingService:
    @staticmethod
    def is_ffmpeg_available() -> bool:
        """Checks whether a valid FFmpeg binary is discovered."""
        return settings.detected_ffmpeg is not None

    @staticmethod
    def get_ffmpeg_path() -> str:
        """Returns the resolved FFmpeg path or raises TranscodingError."""
        path = settings.detected_ffmpeg
        if not path:
            raise TranscodingError(
                "FFmpeg is not available. Please install FFmpeg or set FFMPEG_PATH in settings."
            )
        return path

    @staticmethod
    async def transcode(
        input_path: Path,
        output_path: Path,
        target_format: str = "mp3",
        bitrate_kbps: Optional[int] = 320,
    ) -> Path:
        """
        Transcodes an input audio file to the target format and bitrate using FFmpeg.
        Uses safe subprocess argument arrays (never shell=True).
        """
        ffmpeg_bin = TranscodingService.get_ffmpeg_path()

        if not input_path.exists():
            raise TranscodingError(f"Input file not found: {input_path}")

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            ffmpeg_bin,
            "-y",               # Overwrite output without prompting
            "-v", "error",      # Only log errors
            "-i", str(input_path),
        ]

        fmt = target_format.lower()
        if fmt == "mp3":
            cmd.extend([
                "-c:a", "libmp3lame",
                "-b:a", f"{bitrate_kbps or 320}k",
            ])
        elif fmt in ("m4a", "aac"):
            cmd.extend([
                "-c:a", "aac",
                "-b:a", f"{bitrate_kbps or 256}k",
            ])
        elif fmt == "flac":
            cmd.extend([
                "-c:a", "flac",
            ])
        elif fmt in ("ogg", "opus"):
            cmd.extend([
                "-c:a", "libopus",
                "-b:a", f"{bitrate_kbps or 160}k",
            ])
        else:
            # Default copy or standard conversion
            cmd.extend(["-c:a", "copy"])

        cmd.append(str(output_path))

        logger.info(f"Executing FFmpeg transcoding: {' '.join(cmd[:4])} ... -> {output_path.name}")

        loop = asyncio.get_event_loop()

        def _run_subprocess():
            # Never shell=True
            result = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
            )
            if result.returncode != 0:
                raise TranscodingError(
                    f"FFmpeg failed with exit code {result.returncode}: {result.stderr.strip()}"
                )
            if not output_path.exists() or output_path.stat().st_size == 0:
                raise TranscodingError("FFmpeg completed but output file is empty or missing.")

        await loop.run_in_executor(None, _run_subprocess)
        return output_path
