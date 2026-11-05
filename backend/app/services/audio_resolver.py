from typing import Dict, Any, Optional
from app.schemas.types import TrackMetadata
from app.providers.cascade import ProviderCascade

class AudioResolutionResult:
    def __init__(
        self,
        stream_url: str,
        extractor: str,
        source_bitrate_kbps: int,
        source_format: str,
        filesize_approx: Optional[int] = None,
        raw_info: Optional[Dict[str, Any]] = None,
        is_direct_stream: bool = False,
        match_score: float = 100.0,
    ):
        self.stream_url = stream_url
        self.extractor = extractor
        self.source_bitrate_kbps = source_bitrate_kbps
        self.source_format = source_format
        self.filesize_approx = filesize_approx
        self.raw_info = raw_info or {}
        self.is_direct_stream = is_direct_stream
        self.match_score = match_score

class AudioResolver:
    _cascade = None

    @classmethod
    def get_cascade(cls) -> ProviderCascade:
        if cls._cascade is None:
            cls._cascade = ProviderCascade()
        return cls._cascade

    @staticmethod
    async def resolve_audio_source(track: TrackMetadata) -> AudioResolutionResult:
        """
        Resolves a high-fidelity, verified audio stream for a track using the multi-tier
        ProviderCascade (JioSaavn -> YouTube Music -> YouTube Search -> SoundCloud)
        and algorithmic confidence scoring (TrackMatcher).
        """
        cascade = AudioResolver.get_cascade()
        return await cascade.resolve_audio(track)
