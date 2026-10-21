import pytest
from app.core.security import (
    validate_external_url,
    sanitize_filename,
    sanitize_path_component,
    is_ip_private_or_restricted,
)

def test_ip_restriction():
    assert is_ip_private_or_restricted("127.0.0.1") is True
    assert is_ip_private_or_restricted("10.0.0.1") is True
    assert is_ip_private_or_restricted("192.168.1.1") is True
    assert is_ip_private_or_restricted("172.16.0.1") is True
    assert is_ip_private_or_restricted("169.254.169.254") is True
    assert is_ip_private_or_restricted("8.8.8.8") is False
    assert is_ip_private_or_restricted("open.spotify.com") is False

def test_ssrf_blocking():
    # Blocked schemes
    valid, _ = validate_external_url("file:///etc/passwd")
    assert not valid

    valid, _ = validate_external_url("ftp://example.com/audio.mp3")
    assert not valid

    # Blocked hosts
    valid, _ = validate_external_url("http://localhost:8000/api")
    assert not valid

    valid, _ = validate_external_url("http://127.0.0.1/status")
    assert not valid

    valid, _ = validate_external_url("http://169.254.169.254/latest/meta-data/")
    assert not valid

    # Credentials in URL blocked
    valid, _ = validate_external_url("http://admin:secret@spotify.com")
    assert not valid

    # Valid external URLs allowed
    valid, err = validate_external_url("https://open.spotify.com/track/2HRqTpkrJO5ggZyyK6NPWz")
    assert valid, f"Expected valid URL, got error: {err}"

    valid, err = validate_external_url("https://www.youtube.com/watch?v=eVli-tstM5E")
    assert valid, f"Expected valid URL, got error: {err}"

def test_filename_sanitization():
    # Removes dangerous filesystem characters
    cleaned = sanitize_filename('AC/DC - Back in Black: Live?*<>|"')
    assert "/" not in cleaned and ":" not in cleaned and "?" not in cleaned and "*" not in cleaned
    assert sanitize_filename('../../etc/passwd') == "-..-etc-passwd"
    assert sanitize_filename('Song \x00\x1f With Control Chars') == "Song With Control Chars"
    assert sanitize_filename('') == "track"

def test_path_component_sanitization():
    assert sanitize_path_component('..') == "unnamed"
    assert sanitize_path_component('.') == "unnamed"
    assert sanitize_path_component('Sabrina Carpenter') == "Sabrina Carpenter"
