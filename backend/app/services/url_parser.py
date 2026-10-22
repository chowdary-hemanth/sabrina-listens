import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import Optional, NamedTuple
import httpx
from app.core.security import validate_external_url
from app.schemas.types import ResourceType, ProviderType

class ParsedUrl(NamedTuple):
    is_valid: bool
    provider: ProviderType
    resource_type: ResourceType
    resource_id: str
    cleaned_url: str
    error: Optional[str] = None

# Regex patterns for Spotify
SPOTIFY_TRACK_RE = re.compile(r'open\.spotify\.com/(?:intl-[a-z]+/)?track/([a-zA-Z0-9]+)')
SPOTIFY_ALBUM_RE = re.compile(r'open\.spotify\.com/(?:intl-[a-z]+/)?album/([a-zA-Z0-9]+)')
SPOTIFY_PLAYLIST_RE = re.compile(r'open\.spotify\.com/(?:intl-[a-z]+/)?playlist/([a-zA-Z0-9]+)')
SPOTIFY_ARTIST_RE = re.compile(r'open\.spotify\.com/(?:intl-[a-z]+/)?artist/([a-zA-Z0-9]+)')

# Regex for YouTube
YOUTUBE_RE = re.compile(r'(?:youtube\.com/(?:watch\?v=|embed/|v/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})')
YOUTUBE_PLAYLIST_RE = re.compile(r'youtube\.com/playlist\?list=([a-zA-Z0-9_-]+)')

# Regex for SoundCloud
SOUNDCLOUD_SET_RE = re.compile(r'https?://(?:www\.)?soundcloud\.com/([a-zA-Z0-9_-]+/sets/[a-zA-Z0-9_-]+)')
SOUNDCLOUD_TRACK_RE = re.compile(r'https?://(?:www\.)?soundcloud\.com/([a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+)')

# Regex for Bandcamp
BANDCAMP_ALBUM_RE = re.compile(r'https?://[a-zA-Z0-9_-]+\.bandcamp\.com/album/([a-zA-Z0-9_-]+)')
BANDCAMP_TRACK_RE = re.compile(r'https?://[a-zA-Z0-9_-]+\.bandcamp\.com/track/([a-zA-Z0-9_-]+)')

# Direct audio extensions
AUDIO_EXTENSIONS = ('.mp3', '.m4a', '.flac', '.wav', '.ogg', '.opus', '.aac')

def strip_tracking_params(url: str) -> str:
    """Removes tracking query parameters like ?si=, ?utm_*, ?feature=, etc."""
    try:
        parsed = urlparse(url)
        query_dict = parse_qs(parsed.query)
        # Filter out tracking keys
        filtered = {k: v for k, v in query_dict.items() if not (k.startswith("utm_") or k in ("si", "fbclid", "gclid", "feature"))}
        new_query = urlencode(filtered, doseq=True)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
    except Exception:
        return url

async def expand_short_url(url: str) -> str:
    """Expands shortened URLs (such as spotify.link or tinyurl) securely."""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=5.0) as client:
            resp = await client.head(url)
            return str(resp.url)
    except Exception:
        return url

async def parse_music_url(raw_url: str) -> ParsedUrl:
    """
    Parses, validates, and identifies the target music provider and resource type.
    """
    if not raw_url or not isinstance(raw_url, str):
        return ParsedUrl(False, ProviderType.GENERIC, ResourceType.UNKNOWN, "", "", "Empty URL provided")

    url = raw_url.strip()

    # Convert spotify: URI format to open.spotify.com
    if url.startswith("spotify:"):
        parts = url.split(":")
        if len(parts) >= 3:
            res_type, res_id = parts[1], parts[2]
            url = f"https://open.spotify.com/{res_type}/{res_id}"

    # Pre-SSRF check
    is_safe, error_msg = validate_external_url(url)
    if not is_safe:
        return ParsedUrl(False, ProviderType.GENERIC, ResourceType.UNKNOWN, "", url, error_msg)

    # Handle spotify.link redirection
    if "spotify.link" in url:
        url = await expand_short_url(url)
        # Re-verify after redirect
        is_safe, error_msg = validate_external_url(url)
        if not is_safe:
            return ParsedUrl(False, ProviderType.GENERIC, ResourceType.UNKNOWN, "", url, error_msg)

    cleaned = strip_tracking_params(url)

    # 1. Spotify Track
    match = SPOTIFY_TRACK_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SPOTIFY, ResourceType.TRACK, match.group(1), cleaned)

    # 2. Spotify Album
    match = SPOTIFY_ALBUM_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SPOTIFY, ResourceType.ALBUM, match.group(1), cleaned)

    # 3. Spotify Playlist
    match = SPOTIFY_PLAYLIST_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SPOTIFY, ResourceType.PLAYLIST, match.group(1), cleaned)

    # 4. Spotify Artist
    match = SPOTIFY_ARTIST_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SPOTIFY, ResourceType.ARTIST, match.group(1), cleaned)

    # 5. YouTube Playlist
    match = YOUTUBE_PLAYLIST_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.YOUTUBE, ResourceType.PLAYLIST, match.group(1), cleaned)

    # 6. YouTube Video
    match = YOUTUBE_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.YOUTUBE, ResourceType.YOUTUBE, match.group(1), cleaned)

    # 7. SoundCloud Playlist / Set
    match = SOUNDCLOUD_SET_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SOUNDCLOUD, ResourceType.PLAYLIST, match.group(1), cleaned)

    # 8. SoundCloud Track
    match = SOUNDCLOUD_TRACK_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.SOUNDCLOUD, ResourceType.SOUNDCLOUD, match.group(1), cleaned)

    # 9. Bandcamp Album
    match = BANDCAMP_ALBUM_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.BANDCAMP, ResourceType.ALBUM, match.group(1), cleaned)

    # 10. Bandcamp Track
    match = BANDCAMP_TRACK_RE.search(cleaned)
    if match:
        return ParsedUrl(True, ProviderType.BANDCAMP, ResourceType.BANDCAMP, match.group(1), cleaned)

    # 11. Direct Audio File
    parsed_path = urlparse(cleaned).path.lower()
    if any(parsed_path.endswith(ext) for ext in AUDIO_EXTENSIONS):
        filename = parsed_path.split("/")[-1]
        return ParsedUrl(True, ProviderType.DIRECT, ResourceType.DIRECT, filename, cleaned)

    return ParsedUrl(
        False,
        ProviderType.GENERIC,
        ResourceType.UNKNOWN,
        "",
        cleaned,
        "Unsupported URL format. Please paste a Spotify, YouTube, SoundCloud, Bandcamp, or direct audio link."
    )
