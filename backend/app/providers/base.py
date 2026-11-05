from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from app.schemas.types import TrackMetadata

class CandidateAudio:
    """Represents a potential audio stream source candidate found by a provider."""
    def __init__(
        self,
        title: str,
        artist: str,
        stream_url: str,
        extractor: str,
        source_bitrate_kbps: int = 320,
        source_format: str = "mp3",
        duration_seconds: Optional[int] = None,
        filesize_approx: Optional[int] = None,
        raw_info: Optional[Dict[str, Any]] = None,
        match_score: float = 0.0,
        match_reasons: Optional[List[str]] = None,
        uploader: Optional[str] = None,
        is_direct_stream: bool = False,
    ):
        self.title = title
        self.artist = artist
        self.stream_url = stream_url
        self.extractor = extractor
        self.source_bitrate_kbps = source_bitrate_kbps
        self.source_format = source_format
        self.duration_seconds = duration_seconds
        self.filesize_approx = filesize_approx
        self.raw_info = raw_info or {}
        self.match_score = match_score
        self.match_reasons = match_reasons or []
        self.uploader = uploader
        self.is_direct_stream = is_direct_stream

    def __repr__(self) -> str:
        return (
            f"<CandidateAudio {self.extractor} title={self.title!r} "
            f"score={self.match_score:.1f} dur={self.duration_seconds}s "
            f"bitrate={self.source_bitrate_kbps}k>"
        )

class BaseAudioProvider:
    """Abstract base class for modular audio source providers."""
    name: str = "base"
    priority: int = 99  # Lower number = higher priority

    def is_available(self) -> bool:
        """Returns True if this provider is operational and enabled."""
        return True

    async def search_candidates(self, track: TrackMetadata) -> List[CandidateAudio]:
        """
        Searches the provider for audio candidates matching the track metadata.
        Returns a list of raw CandidateAudio objects.
        """
        raise NotImplementedError
