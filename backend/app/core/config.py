import os
import shutil
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings

def resolve_ffmpeg_binary(configured_path: Optional[str] = None) -> Optional[str]:
    """
    Locates a working ffmpeg binary on the system with fallbacks:
    1. Configured path from environment/settings
    2. System PATH (via shutil.which)
    3. imageio_ffmpeg bundled binary
    4. Known Windows installation directories (e.g. Stremio, Jellyfin, Scoop, Winget)
    """
    if configured_path and os.path.exists(configured_path):
        return str(Path(configured_path).resolve())

    # 1. System PATH
    which_ffmpeg = shutil.which("ffmpeg")
    if which_ffmpeg:
        return str(Path(which_ffmpeg).resolve())

    # 2. imageio-ffmpeg python package
    try:
        import imageio_ffmpeg
        img_ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        if img_ffmpeg and os.path.exists(img_ffmpeg):
            return str(Path(img_ffmpeg).resolve())
    except Exception:
        pass

    # 3. Known local Windows paths
    candidates = [
        os.path.expanduser(r"~\AppData\Local\Programs\Stremio\ffmpeg.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\WinGet\Links\ffmpeg.exe"),
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe",
        r"C:\ffmpeg\bin\ffmpeg.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return str(Path(c).resolve())

    return None

class Settings(BaseSettings):
    APP_ENV: str = "development"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./sabrina_listens.db"

    # Deployment mode: True when deployed on Render/Docker (bypasses CPU transcoding, uses fixed 320k)
    CLOUD_MODE: bool = False

    # Optional credentials
    SPOTIFY_CLIENT_ID: Optional[str] = None
    SPOTIFY_CLIENT_SECRET: Optional[str] = None

    # Paths
    OUTPUT_DIRECTORY: str = "~/Downloads/SabrinaListens"
    TEMP_DIRECTORY: str = "./temp_downloads"

    # Limits
    MAX_CONCURRENT_DOWNLOADS: int = 3
    MAX_FILE_SIZE_MB: int = 500
    REQUEST_TIMEOUT_SECONDS: int = 30

    # FFmpeg
    FFMPEG_PATH: Optional[str] = None

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def resolved_output_dir(self) -> Path:
        expanded = Path(os.path.expanduser(os.path.expandvars(self.OUTPUT_DIRECTORY)))
        expanded.mkdir(parents=True, exist_ok=True)
        return expanded

    @property
    def resolved_temp_dir(self) -> Path:
        expanded = Path(os.path.expanduser(os.path.expandvars(self.TEMP_DIRECTORY)))
        expanded.mkdir(parents=True, exist_ok=True)
        return expanded

    @property
    def detected_ffmpeg(self) -> Optional[str]:
        return resolve_ffmpeg_binary(self.FFMPEG_PATH)

settings = Settings()
