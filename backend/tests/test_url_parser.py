import pytest
from app.services.url_parser import parse_music_url, strip_tracking_params
from app.schemas.types import ProviderType, ResourceType

def test_strip_tracking_params():
    url = "https://open.spotify.com/track/2HRqTpkrJO5ggZyyK6NPWz?si=abcd1234efgh&utm_source=copy-link"
    cleaned = strip_tracking_params(url)
    assert "si=" not in cleaned
    assert "utm_source" not in cleaned
    assert "2HRqTpkrJO5ggZyyK6NPWz" in cleaned

@pytest.mark.asyncio
async def test_parse_spotify_track():
    url = "https://open.spotify.com/track/2HRqTpkrJO5ggZyyK6NPWz?si=12345"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.SPOTIFY
    assert parsed.resource_type == ResourceType.TRACK
    assert parsed.resource_id == "2HRqTpkrJO5ggZyyK6NPWz"

@pytest.mark.asyncio
async def test_parse_spotify_album():
    url = "https://open.spotify.com/album/3iPSVi54hsacKKl1xIR2eH"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.SPOTIFY
    assert parsed.resource_type == ResourceType.ALBUM
    assert parsed.resource_id == "3iPSVi54hsacKKl1xIR2eH"

@pytest.mark.asyncio
async def test_parse_spotify_playlist():
    url = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.SPOTIFY
    assert parsed.resource_type == ResourceType.PLAYLIST

@pytest.mark.asyncio
async def test_parse_spotify_artist():
    url = "https://open.spotify.com/artist/74KM79TiuVKeVCqs8QtB0B"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.SPOTIFY
    assert parsed.resource_type == ResourceType.ARTIST

@pytest.mark.asyncio
async def test_parse_youtube():
    url = "https://www.youtube.com/watch?v=eVli-tstM5E"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.YOUTUBE
    assert parsed.resource_type == ResourceType.YOUTUBE
    assert parsed.resource_id == "eVli-tstM5E"

@pytest.mark.asyncio
async def test_parse_direct_audio():
    url = "https://example.com/audio/song.mp3"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is True
    assert parsed.provider == ProviderType.DIRECT
    assert parsed.resource_type == ResourceType.DIRECT

@pytest.mark.asyncio
async def test_parse_invalid_url():
    url = "not-a-valid-url"
    parsed = await parse_music_url(url)
    assert parsed.is_valid is False
