import os
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.logging import logger
from app.services.transcoding_service import TranscodingService

_cached_cookie_path: Optional[str] = None

def get_cookie_file_path() -> Optional[str]:
    """
    Finds or creates a cookie file from:
    1. Local app cookie file (/tmp or backend/cookies.txt)
    2. YOUTUBE_COOKIES env var (raw text of cookies.txt)
    3. YOUTUBE_COOKIES_FILE env var (path to cookies file)
    """
    global _cached_cookie_path
    if _cached_cookie_path and os.path.exists(_cached_cookie_path):
        return _cached_cookie_path

    # Check dedicated temp cookie file
    temp_cookie = Path(tempfile.gettempdir()) / "sabrina_yt_cookies.txt"
    if temp_cookie.is_file() and temp_cookie.stat().st_size > 10:
        _cached_cookie_path = str(temp_cookie)
        return _cached_cookie_path

    # Check raw env var containing the full cookies text (e.g. pasted into Render dashboard)
    raw_cookies = os.environ.get("YOUTUBE_COOKIES")
    if raw_cookies and raw_cookies.strip():
        try:
            temp_cookie.write_text(raw_cookies.strip(), encoding="utf-8")
            _cached_cookie_path = str(temp_cookie)
            logger.info(f"Loaded YouTube cookies from YOUTUBE_COOKIES environment variable -> {_cached_cookie_path}")
            return _cached_cookie_path
        except Exception as e:
            logger.warning(f"Failed to write YOUTUBE_COOKIES to temp file: {e}")

    # Check file path env var
    cookie_file_env = os.environ.get("YOUTUBE_COOKIES_FILE")
    if cookie_file_env and os.path.isfile(cookie_file_env):
        _cached_cookie_path = cookie_file_env
        logger.info(f"Using cookies file from YOUTUBE_COOKIES_FILE -> {_cached_cookie_path}")
        return _cached_cookie_path

    # Check common local file locations
    for candidate in [
        Path("cookies.txt"),
        Path("backend/cookies.txt"),
        Path("../cookies.txt"),
        Path("/app/cookies.txt"),
        Path("/app/backend/cookies.txt")
    ]:
        if candidate.is_file():
            _cached_cookie_path = str(candidate.resolve())
            logger.info(f"Found local cookies file -> {_cached_cookie_path}")
            return _cached_cookie_path

    return None

def save_cookie_content(content: str) -> Dict[str, Any]:
    """
    Saves Netscape format cookie content to disk and activates it immediately.
    """
    global _cached_cookie_path
    temp_cookie = Path(tempfile.gettempdir()) / "sabrina_yt_cookies.txt"
    clean_text = content.strip()
    temp_cookie.write_text(clean_text, encoding="utf-8")
    _cached_cookie_path = str(temp_cookie)
    logger.info(f"Saved {len(clean_text.splitlines())} lines to {_cached_cookie_path}")
    return get_cookie_status()

def clear_cookies() -> Dict[str, Any]:
    """
    Clears cached cookies from disk.
    """
    global _cached_cookie_path
    temp_cookie = Path(tempfile.gettempdir()) / "sabrina_yt_cookies.txt"
    if temp_cookie.is_file():
        try:
            temp_cookie.unlink()
        except Exception as e:
            logger.warning(f"Could not delete cookie file: {e}")
    _cached_cookie_path = None
    return get_cookie_status()

def get_cookie_status() -> Dict[str, Any]:
    """
    Returns the status and count of valid cookies.
    """
    path = get_cookie_file_path()
    if path and os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                lines = [l for l in f if l.strip() and not l.startswith("#")]
            return {
                "has_cookies": len(lines) > 0,
                "cookie_count": len(lines),
                "path": path,
            }
        except Exception:
            return {"has_cookies": True, "cookie_count": 0, "path": path}
    return {"has_cookies": False, "cookie_count": 0, "path": None}

def get_default_ydl_opts(extra_opts: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Returns standard yt-dlp options configured to prevent bot-detection errors
    on cloud/datacenter IPs (such as Render.com).
    """
    try:
        ffmpeg_bin = TranscodingService.get_ffmpeg_path()
    except Exception:
        ffmpeg_bin = None

    opts: Dict[str, Any] = {
        'quiet': True,
        'no_warnings': True,
        'remote_components': ['ejs:github'],
        'js_runtimes': {'node': {}},
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'visionos', 'web'],
                'player_skip': ['webpage', 'configs'],
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
        'socket_timeout': 30,
    }

    if ffmpeg_bin:
        opts['ffmpeg_location'] = ffmpeg_bin

    cookie_file = get_cookie_file_path()
    if cookie_file:
        opts['cookiefile'] = cookie_file

    po_token = os.environ.get("YOUTUBE_PO_TOKEN")
    if po_token and po_token.strip():
        opts['extractor_args']['youtube']['po_token'] = [f"web+{po_token.strip()}"]

    if extra_opts:
        # Deep merge extractor_args if present
        if 'extractor_args' in extra_opts and 'youtube' in extra_opts['extractor_args']:
            opts['extractor_args']['youtube'].update(extra_opts['extractor_args']['youtube'])
            extra_opts = {k: v for k, v in extra_opts.items() if k != 'extractor_args'}
        opts.update(extra_opts)

    return opts
