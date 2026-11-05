import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Download,
  Play,
  Clock,
  Music,
  Info,
  AlertTriangle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ResourceResponse, QualityOption, TrackMetadata } from '../types';

interface ResourceViewProps {
  resource: ResourceResponse;
  onEnqueue: (trackIds: string[], qualityId: string) => Promise<void>;
  onPlayTrack?: (track: TrackMetadata) => void;
  isEnqueuing: boolean;
}

export const ResourceView: React.FC<ResourceViewProps> = ({
  resource,
  onEnqueue,
  onPlayTrack,
  isEnqueuing,
}) => {
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(() => {
    return new Set(resource.tracks.filter((t) => t.is_available).map((t) => t.id));
  });

  const [selectedQualityId, setSelectedQualityId] = useState<string>(
    resource.available_qualities[1]?.id || 'mp3_320'
  );

  const selectedQuality = useMemo<QualityOption | undefined>(() => {
    return (
      resource.available_qualities.find((q) => q.id === selectedQualityId) ||
      resource.available_qualities[0]
    );
  }, [resource.available_qualities, selectedQualityId]);

  const allSelected = useMemo(() => {
    const available = resource.tracks.filter((t) => t.is_available);
    return available.length > 0 && available.every((t) => selectedTrackIds.has(t.id));
  }, [resource.tracks, selectedTrackIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(
        new Set(resource.tracks.filter((t) => t.is_available).map((t) => t.id))
      );
    }
  };

  const toggleTrack = (id: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDownloadSelected = () => {
    if (selectedTrackIds.size > 0) {
      onEnqueue(Array.from(selectedTrackIds), selectedQualityId);
    }
  };

  const handleDownloadSingle = (trackId: string) => {
    onEnqueue([trackId], selectedQualityId);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Collection Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-black/65 backdrop-blur-md border border-pink-600/35 p-4 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-4 sm:gap-8">
          {/* Artwork */}
          <div className="relative w-32 h-32 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-pink-950/70 border-2 border-pink-600/50 group">
            {resource.cover_url ? (
              <img
                src={resource.cover_url}
                alt={resource.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <Music className="w-12 h-12 sm:w-16 sm:h-16 text-pink-500" />
              </div>
            )}
            <div className="absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/75 backdrop-blur-md text-pink-400 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
              {resource.provider}
            </div>
          </div>

          {/* Metadata details */}
          <div className="flex-1 text-center md:text-left space-y-2.5 sm:space-y-3 w-full min-w-0">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 font-['Google_Sans_Flex',sans-serif]">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-pink-600/20 text-pink-300 border border-pink-600/40">
                {resource.resource_type}
              </span>
              <span className="text-xs text-white/70">
                {resource.track_count} {resource.track_count === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>

            {/* Song / Album title in Google Sans Flex */}
            <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white line-clamp-2 font-['Google_Sans_Flex',sans-serif]">
              {resource.title}
            </h1>

            {resource.artist && (
              <p className="text-sm sm:text-lg text-pink-200/90 font-medium font-['Google_Sans_Flex',sans-serif]">
                {resource.artist}
              </p>
            )}

            {/* Quality selection and Action controls */}
            <div className="pt-2 sm:pt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
              {/* Quality Dropdown */}
              <div className="flex-1 min-w-0 font-['Jost']">
                <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-500" />
                  <span>Audio Quality & Format:</span>
                </label>
                <select
                  value={selectedQualityId}
                  onChange={(e) => setSelectedQualityId(e.target.value)}
                  className="w-full bg-black border border-pink-600/40 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm font-medium text-white focus:outline-none focus:border-pink-500 transition-colors font-['Google_Sans_Flex',sans-serif]"
                >
                  {resource.available_qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label} — {q.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Download Selected Button */}
              <div className="w-full sm:w-auto shrink-0">
                <button
                  onClick={handleDownloadSelected}
                  disabled={isEnqueuing || selectedTrackIds.size === 0}
                  className="w-full sm:w-auto btn-shady px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm gap-2 justify-center"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isEnqueuing
                      ? 'QUEUEING...'
                      : `DOWNLOAD (${selectedTrackIds.size})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Quality Note Box */}
            {selectedQuality && (
              <div className="mt-2 p-2.5 sm:p-3 rounded-2xl bg-black/55 border border-pink-600/30 text-[11px] sm:text-xs text-white/90 space-y-1 font-['Jost']">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Info className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span className="font-semibold text-white font-['Google_Sans_Flex',sans-serif]">
                    Format: {selectedQuality.format.toUpperCase()}{' '}
                    {selectedQuality.bitrate_kbps ? `(${selectedQuality.bitrate_kbps} kbps)` : ''}
                  </span>
                  <span className="text-pink-500">•</span>
                  <span>
                    {selectedQuality.requires_transcoding
                      ? 'FFmpeg Transcoding'
                      : 'Native Stream Passthrough'}
                  </span>
                </div>
                {selectedQuality.warning && (
                  <div className="flex items-start gap-1.5 text-pink-300 pt-0.5 font-['Jost']">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-pink-400" />
                    <span>{selectedQuality.warning}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Track Selection & Listing Table */}
      <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 overflow-hidden shadow-xl">
        {/* Table Toolbar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-pink-600/25 flex items-center justify-between font-['Jost']">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-white hover:text-pink-400 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-pink-500" />
              ) : (
                <Square className="w-4 h-4 text-white/50" />
              )}
              <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-xs text-pink-500">•</span>
            <span className="text-xs text-white/80 font-medium">
              {selectedTrackIds.size}/{resource.tracks.length}
            </span>
          </div>

          <div className="hidden sm:flex text-xs text-white/80 font-medium items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>ID3 Tags & Cover Embedded</span>
          </div>
        </div>

        {/* Track Rows in Google Sans Flex */}
        <div className="divide-y divide-pink-600/20 font-['Google_Sans_Flex',sans-serif]">
          {resource.tracks.map((track, index) => {
            const isSelected = selectedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                className={`flex items-center gap-2.5 sm:gap-4 px-3 sm:px-6 py-3 hover:bg-pink-600/10 transition-colors group ${
                  isSelected ? 'bg-pink-600/15' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  disabled={!track.is_available}
                  className="p-1 text-white hover:text-pink-400 disabled:opacity-40 transition-colors shrink-0"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-pink-500" />
                  ) : (
                    <Square className="w-4 h-4 text-white/40" />
                  )}
                </button>

                {/* Index / Track Number (Desktop only to preserve mobile width) */}
                <span className="hidden sm:inline-block w-6 text-xs font-mono text-white/60 text-right shrink-0">
                  {track.track_number || index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/35">
                  {track.album_art_url || resource.cover_url ? (
                    <img
                      src={track.album_art_url || resource.cover_url || ''}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-4 h-4 text-pink-500" />
                    </div>
                  )}
                </div>

                {/* Track Details in Google Sans Flex */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-pink-300 transition-colors">
                      {track.title}
                    </span>
                    {track.explicit && (
                      <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-pink-600 text-white shrink-0">
                        E
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] sm:text-xs text-white/70 truncate">
                    {track.artist} {track.album ? `• ${track.album}` : ''}
                  </p>
                </div>

                {/* Duration (Desktop only) */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 font-mono shrink-0">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  <span>{formatDuration(track.duration_seconds)}</span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {onPlayTrack && (
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      title="Preview track"
                    >
                      <Play className="w-3.5 h-3.5 text-pink-500" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDownloadSingle(track.id)}
                    disabled={isEnqueuing}
                    className="btn-shady-sm px-3 sm:px-4 py-1.5 gap-1 text-[11px] sm:text-xs"
                    title="Download this track"
                  >
                    <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                    <span>GET</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
