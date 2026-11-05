import pytest
import asyncio
from app.schemas.types import TrackMetadata
from app.providers.base import CandidateAudio
from app.providers.jiosaavn import JioSaavnProvider
from app.providers.youtube_music import parse_duration_str
from app.providers.cascade import ProviderCascade

def test_jiosaavn_des_decryption():
    sample_enc = "ID2ieOjCrwfgWvL5sXl4B1ImC5QfbsDyV6VkM+rwbvAtsP8Nd+VT9HRgFwRqP1KBkmC+Xfn9Drvey47IELV+nhw7tS9a8Gtq"
    decrypted = JioSaavnProvider._decrypt_media_url(sample_enc)
    assert decrypted is not None
    assert "https://aac.saavncdn.com/" in decrypted
    assert "_96.mp4" in decrypted

def test_youtube_music_duration_parser():
    assert parse_duration_str("3:02") == 182
    assert parse_duration_str("0:45") == 45
    assert parse_duration_str("1:12:30") == 4350
    assert parse_duration_str("invalid") is None
    assert parse_duration_str("") is None

@pytest.mark.asyncio
async def test_provider_cascade_ordering():
    cascade = ProviderCascade()
    names = [p.name for p in cascade.providers]
    assert names == ["jiosaavn", "youtube_music", "youtube_search", "soundcloud"]

@pytest.mark.asyncio
async def test_provider_cascade_direct_url():
    cascade = ProviderCascade()
    track = TrackMetadata(
        id="direct_1",
        title="Direct Audio Track",
        artist="Direct Artist",
        album="Direct Album",
        provider="direct",
        source_url="https://example.com/audio.mp3",
        duration_seconds=200,
    )
    res = await cascade.resolve_audio(track)
    assert res.extractor == "direct"
    assert res.stream_url == "https://example.com/audio.mp3"
    assert res.is_direct_stream is True
    assert res.match_score == 100.0
