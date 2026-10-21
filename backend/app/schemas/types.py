from enum import Enum
from datetime import datetime, date
from typing import List, Optional, Union, Any
from pydantic import BaseModel, Field, field_validator

class ResourceType(str, Enum):
    TRACK = "track"
    ALBUM = "album"
    PLAYLIST = "playlist"
    ARTIST = "artist"
    YOUTUBE = "youtube"
    DIRECT = "direct"
    UNKNOWN = "unknown"

class ProviderType(str, Enum):
    SPOTIFY = "spotify"
    YOUTUBE = "youtube"
    DIRECT = "direct"
    GENERIC = "generic"

class JobStatus(str, Enum):
    PENDING = "pending"
    RESOLVING = "resolving"
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    TRANSCODING = "transcoding"
    TAGGING = "tagging"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class QualityOption(BaseModel):
    id: str
    label: str
    format: str
    bitrate_kbps: Optional[int] = None
    requires_transcoding: bool = False
    description: str
    warning: Optional[str] = None
    is_lossless: bool = False

class TrackMetadata(BaseModel):
    id: str
    title: str
    artist: str
    album: str
    album_art_url: Optional[str] = None
    duration_seconds: int = 0
    release_date: Optional[str] = None
    track_number: Optional[int] = 1
    total_tracks: Optional[int] = 1
    explicit: bool = False
    is_available: bool = True
    provider: str = "spotify"
    source_url: Optional[str] = None
    source_bitrate_kbps: Optional[int] = None
    source_format: Optional[str] = None
    estimated_size_bytes: Optional[int] = None

    @field_validator("release_date", mode="before")
    @classmethod
    def parse_release_date(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, (datetime, date)):
            return v.strftime("%Y-%m-%d")
        return str(v).strip()

class ResourceResponse(BaseModel):
    resource_id: str
    resource_type: ResourceType
    provider: ProviderType
    title: str
    artist: Optional[str] = None
    cover_url: Optional[str] = None
    track_count: int
    tracks: List[TrackMetadata] = []
    original_url: str
    available_qualities: List[QualityOption] = []

class ResolveRequest(BaseModel):
    url: str

class DownloadJobCreate(BaseModel):
    resource_id: str
    track_ids: List[str]
    quality_id: str = "mp3_320"
    custom_output_dir: Optional[str] = None

class DownloadJobStatus(BaseModel):
    job_id: str
    track_id: str
    title: str
    artist: str
    album: str
    cover_url: Optional[str] = None
    status: JobStatus
    progress_percent: float = 0.0
    download_speed: Optional[str] = None
    eta_seconds: Optional[int] = None
    error_message: Optional[str] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    quality_id: str = "mp3_320"
    format: str = "mp3"
    actual_source_bitrate: Optional[int] = None
    is_transcoded: bool = False
    created_at: str
    updated_at: str

class DownloadQueueSummary(BaseModel):
    total_jobs: int
    active_jobs: int
    completed_jobs: int
    failed_jobs: int
    jobs: List[DownloadJobStatus]

class SettingsModel(BaseModel):
    output_directory: str
    temp_directory: str
    max_concurrent_downloads: int
    default_quality: str
    naming_template: str
    ffmpeg_detected: bool
    ffmpeg_path: Optional[str] = None
    spotify_configured: bool = False

class SettingsUpdate(BaseModel):
    output_directory: Optional[str] = None
    temp_directory: Optional[str] = None
    max_concurrent_downloads: Optional[int] = Field(None, ge=1, le=10)
    default_quality: Optional[str] = None
    naming_template: Optional[str] = None
    ffmpeg_path: Optional[str] = None
    spotify_client_id: Optional[str] = None
    spotify_client_secret: Optional[str] = None

class HistoryItem(BaseModel):
    id: str
    track_id: str
    title: str
    artist: str
    album: str
    cover_url: Optional[str] = None
    file_path: Optional[str] = None
    file_size_bytes: Optional[int] = None
    quality_id: str
    status: str
    completed_at: str

class RecentUrlItem(BaseModel):
    url: str
    title: str
    provider: str
    resource_type: str
    cover_url: Optional[str] = None
    visited_at: str
