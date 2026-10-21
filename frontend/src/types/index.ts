export type ResourceType = 'track' | 'album' | 'playlist' | 'artist' | 'youtube' | 'direct' | 'unknown';
export type ProviderType = 'spotify' | 'youtube' | 'direct' | 'generic';

export type JobStatus = 
  | 'pending'
  | 'resolving'
  | 'queued'
  | 'downloading'
  | 'transcoding'
  | 'tagging'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface QualityOption {
  id: string;
  label: string;
  format: string;
  bitrate_kbps: number | null;
  requires_transcoding: boolean;
  description: string;
  warning?: string | null;
  is_lossless: boolean;
}

export interface TrackMetadata {
  id: string;
  title: string;
  artist: string;
  album: string;
  album_art_url?: string | null;
  duration_seconds: number;
  release_date?: string | null;
  track_number?: number;
  total_tracks?: number;
  explicit: boolean;
  is_available: boolean;
  provider: string;
  source_url?: string | null;
  source_bitrate_kbps?: number | null;
  source_format?: string | null;
  estimated_size_bytes?: number | null;
}

export interface ResourceResponse {
  resource_id: string;
  resource_type: ResourceType;
  provider: ProviderType;
  title: string;
  artist?: string | null;
  cover_url?: string | null;
  track_count: number;
  tracks: TrackMetadata[];
  original_url: string;
  available_qualities: QualityOption[];
}

export interface DownloadJobStatus {
  job_id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string | null;
  status: JobStatus;
  progress_percent: number;
  download_speed?: string | null;
  eta_seconds?: number | null;
  error_message?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  quality_id: string;
  format: string;
  actual_source_bitrate?: number | null;
  is_transcoded: boolean;
  created_at: string;
  updated_at: string;
}

export interface DownloadQueueSummary {
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  jobs: DownloadJobStatus[];
}

export interface SettingsModel {
  output_directory: string;
  temp_directory: string;
  max_concurrent_downloads: number;
  default_quality: string;
  naming_template: string;
  ffmpeg_detected: boolean;
  ffmpeg_path?: string | null;
  spotify_configured: boolean;
  spotify_client_id?: string;
  spotify_client_secret?: string;
}

export interface HistoryItem {
  id: string;
  track_id: string;
  title: string;
  artist: string;
  album: string;
  cover_url?: string | null;
  file_path?: string | null;
  file_size_bytes?: number | null;
  quality_id: string;
  status: string;
  completed_at: string;
}

export interface RecentUrlItem {
  url: string;
  title: string;
  provider: string;
  resource_type: string;
  cover_url?: string | null;
  visited_at: string;
}

// Global declaration for custom ascii-art web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ascii-art': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          piece?: string;
          size?: string;
        },
        HTMLElement
      >;
    }
  }
}
