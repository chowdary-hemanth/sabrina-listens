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
    return resource.available_qualities.find((q) => q.id === selectedQualityId) || resource.available_qualities[0];
  }, [resource.available_qualities, selectedQualityId]);

  const allSelected = useMemo(() => {
    const available = resource.tracks.filter((t) => t.is_available);
    return available.length > 0 && available.every((t) => selectedTrackIds.has(t.id));
  }, [resource.tracks, selectedTrackIds]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(resource.tracks.filter((t) => t.is_available).map((t) => t.id)));
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
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Collection Header Card */}
      <div className="relative overflow-hidden rounded-3xl bg-black/65 backdrop-blur-md border border-pink-600/35 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Artwork */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-pink-950/70 border-2 border-pink-600/50 group">
            {resource.cover_url ? (
              <img
                src={resource.cover_url}
                alt={resource.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-black flex items-center justify-center">
                <Music className="w-16 h-16 text-pink-500" />
              </div>
            )}
            <div className="absolute top-2 right-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/65 backdrop-blur-md text-pink-400 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
              {resource.provider}
            </div>
          </div>

          {/* Metadata details */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 font-['Google_Sans_Flex',sans-serif]">
              <span className="px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-pink-600/20 text-pink-300 border border-pink-600/40">
                {resource.resource_type}
              </span>
              <span className="text-xs text-white/70">
                {resource.track_count} {resource.track_count === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>

            {/* Song / Album title in Google Sans Flex as requested */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white line-clamp-2 font-['Google_Sans_Flex',sans-serif]">
              {resource.title}
            </h1>

            {resource.artist && (
              <p className="text-base sm:text-lg text-pink-200/90 font-medium font-['Google_Sans_Flex',sans-serif]">
                {resource.artist}
              </p>
            )}

            {/* Quality selection and Action controls */}
            <div className="pt-3 flex flex-col sm:flex-row items-center gap-4">
              {/* Quality Dropdown */}
              <div className="w-full sm:w-auto flex-1 max-w-md font-['Jost']">
                <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-pink-500" />
                  Preferred Audio Quality & Format:
                </label>
                <select
                  value={selectedQualityId}
                  onChange={(e) => setSelectedQualityId(e.target.value)}
                  className="w-full bg-black border border-pink-600/40 rounded-xl px-3.5 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-pink-500 transition-colors font-['Google_Sans_Flex',sans-serif]"
                >
                  {resource.available_qualities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.label} — {q.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shady Download Selected Button */}
              <div className="w-full sm:w-auto self-end">
                <button
                  onClick={handleDownloadSelected}
                  disabled={isEnqueuing || selectedTrackIds.size === 0}
                  className="btn-shady px-8 text-sm gap-2"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isEnqueuing
                      ? 'QUEUEING...'
                      : `DOWNLOAD SELECTED (${selectedTrackIds.size})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Quality Note / Warning Box */}
            {selectedQuality && (
              <div className="mt-3 p-3 rounded-2xl bg-black/55 border border-pink-600/30 text-xs text-white/90 space-y-1 font-['Jost']">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                  <span className="font-semibold text-white font-['Google_Sans_Flex',sans-serif]">
                    Format: {selectedQuality.format.toUpperCase()} {selectedQuality.bitrate_kbps ? `(${selectedQuality.bitrate_kbps} kbps)` : ''}
                  </span>
                  <span className="text-pink-500">•</span>
                  <span>{selectedQuality.requires_transcoding ? 'FFmpeg Transcoding' : 'Native Stream Passthrough'}</span>
                </div>
                {selectedQuality.warning && (
                  <div className="flex items-start gap-1.5 text-pink-300 pt-1 font-['Jost']">
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
        <div className="px-6 py-4 border-b border-pink-600/25 flex items-center justify-between font-['Jost']">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-semibold text-white hover:text-pink-400 transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-4 h-4 text-pink-500" />
              ) : (
                <Square className="w-4 h-4 text-white/50" />
              )}
              <span>{allSelected ? 'Deselect All' : 'Select All Tracks'}</span>
            </button>
            <span className="text-xs text-pink-500">•</span>
            <span className="text-xs text-white/80 font-medium">
              {selectedTrackIds.size} of {resource.tracks.length} selected
            </span>
          </div>

          <div className="text-xs text-white/80 font-medium flex items-center gap-1.5">
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
                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-pink-600/10 transition-colors group ${
                  isSelected ? 'bg-pink-600/15' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleTrack(track.id)}
                  disabled={!track.is_available}
                  className="p-1 text-white hover:text-pink-400 disabled:opacity-40 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-pink-500" />
                  ) : (
                    <Square className="w-4 h-4 text-white/40" />
                  )}
                </button>

                {/* Index / Track Number */}
                <span className="w-6 text-xs font-mono text-white/60 text-right">
                  {track.track_number || index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/35">
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white truncate group-hover:text-pink-300 transition-colors">
                      {track.title}
                    </span>
                    {track.explicit && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-pink-600 text-white">
                        E
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 truncate">
                    {track.artist} {track.album ? `• ${track.album}` : ''}
                  </p>
                </div>

                {/* Duration */}
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/70 font-mono">
                  <Clock className="w-3.5 h-3.5 text-pink-500" />
                  <span>{formatDuration(track.duration_seconds)}</span>
                </div>

                {/* Actions with Shady button shape */}
                <div className="flex items-center gap-2">
                  {onPlayTrack && (
                    <button
                      onClick={() => onPlayTrack(track)}
                      className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                      title="Preview track"
                    >
                      <Play className="w-4 h-4 text-pink-500" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDownloadSingle(track.id)}
                    disabled={isEnqueuing}
                    className="btn-shady-sm px-4 gap-1.5"
                    title="Download this track"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
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
