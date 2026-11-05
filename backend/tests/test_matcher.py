import pytest
from app.schemas.types import TrackMetadata
from app.providers.base import CandidateAudio
from app.providers.matcher import TrackMatcher, clean_text, extract_tokens

def test_clean_text_and_tokens():
    raw = "Espresso (Official Audio) [feat. Artist]!"
    cleaned = clean_text(raw)
    assert cleaned == "espresso official audio feat artist"
    tokens = extract_tokens(raw, remove_stopwords=True)
    assert "espresso" in tokens
    assert "artist" in tokens
    assert "official" not in tokens
    assert "audio" not in tokens

def test_track_matcher_exact_match():
    target = TrackMetadata(
        id="t1",
        title="Espresso",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=175
    )
    cand = CandidateAudio(
        title="Espresso",
        artist="Sabrina Carpenter",
        stream_url="https://example.com/audio.mp3",
        extractor="jiosaavn",
        duration_seconds=175
    )

    score, reasons = TrackMatcher.score_candidate(target, cand)
    assert score == 100.0
    assert any("Duration exact match" in r for r in reasons)

def test_track_matcher_penalizes_live_version():
    target = TrackMetadata(
        id="t2",
        title="Espresso",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=175
    )
    cand_live = CandidateAudio(
        title="Espresso - Live at Coachella 2026",
        artist="Sabrina Carpenter",
        stream_url="https://example.com/live.mp3",
        extractor="youtube",
        duration_seconds=184
    )

    score, reasons = TrackMatcher.score_candidate(target, cand_live)
    assert score < TrackMatcher.MATCH_THRESHOLD
    assert any("Forbidden modifier penalty" in r and "live" in r for r in reasons)

def test_track_matcher_penalizes_slowed_and_reverb():
    target = TrackMetadata(
        id="t3",
        title="Espresso",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=175
    )
    cand_slowed = CandidateAudio(
        title="Sabrina Carpenter - Espresso (slowed + reverb)",
        artist="DJ Slowed",
        stream_url="https://example.com/slowed.mp3",
        extractor="youtube",
        duration_seconds=198
    )

    score, reasons = TrackMatcher.score_candidate(target, cand_slowed)
    assert score < 50.0
    assert any("slowed" in r for r in reasons)
    assert any("reverb" in r for r in reasons)

def test_track_matcher_rejects_ambient_noise():
    target = TrackMetadata(
        id="t4",
        title="Espresso",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=175
    )
    cand_noise = CandidateAudio(
        title="Espresso - 10 Hours Relaxing Rain Sounds for Deep Sleep",
        artist="Sleep Sound",
        stream_url="https://example.com/noise.mp3",
        extractor="youtube",
        duration_seconds=36000
    )

    score, reasons = TrackMatcher.score_candidate(target, cand_noise)
    assert score == 0.0
    assert any("Ambient/noise keyword" in r for r in reasons)

def test_track_matcher_rejects_duration_extreme_mismatch():
    target = TrackMetadata(
        id="t5",
        title="Espresso",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=175
    )
    cand_long = CandidateAudio(
        title="Espresso - Full Album Mix Compilation",
        artist="Sabrina Carpenter",
        stream_url="https://example.com/full_album.mp3",
        extractor="youtube",
        duration_seconds=2400
    )

    score, reasons = TrackMatcher.score_candidate(target, cand_long)
    assert score == 0.0
    assert any("Duration mismatch" in r for r in reasons)

def test_track_matcher_rewards_requested_remix():
    target = TrackMetadata(
        id="t6",
        title="Espresso (Mark Ronson Remix)",
        artist="Sabrina Carpenter",
        album="Short n' Sweet",
        duration_seconds=185
    )
    cand_remix = CandidateAudio(
        title="Espresso (Mark Ronson Remix)",
        artist="Sabrina Carpenter",
        stream_url="https://example.com/remix.mp3",
        extractor="youtube",
        duration_seconds=185
    )
    cand_orig = CandidateAudio(
        title="Espresso",
        artist="Sabrina Carpenter",
        stream_url="https://example.com/orig.mp3",
        extractor="youtube",
        duration_seconds=175
    )

    ranked = TrackMatcher.rank_candidates(target, [cand_orig, cand_remix])
    assert ranked[0].title == "Espresso (Mark Ronson Remix)"
    assert ranked[0].match_score > ranked[1].match_score
