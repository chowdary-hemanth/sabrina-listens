import React, { useState } from 'react';
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCw,
  FolderOpen,
  Clock,
  Zap,
  Music,
  Download,
} from 'lucide-react';
import { DownloadJobStatus, JobStatus } from '../types';
import { cancelJob, retryJob, openContainingFolder } from '../services/api';

interface QueueViewProps {
  jobs: DownloadJobStatus[];
  onRefresh?: () => void;
  isCloudMode?: boolean;
}

export const QueueView: React.FC<QueueViewProps> = ({ jobs, onRefresh, isCloudMode = false }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  const handleCancel = async (jobId: string) => {
    setCancellingIds((prev) => new Set(prev).add(jobId));
    try {
      await cancelJob(jobId);
      onRefresh?.();
    } finally {
      setCancellingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleRetry = async (jobId: string) => {
    setRetryingIds((prev) => new Set(prev).add(jobId));
    try {
      await retryJob(jobId);
      onRefresh?.();
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleOpenFolder = async (jobId: string) => {
    try {
      await openContainingFolder(jobId);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (filter === 'active') {
      return ['pending', 'resolving', 'queued', 'downloading', 'transcoding', 'tagging'].includes(j.status);
    }
    if (filter === 'completed') return j.status === 'completed';
    if (filter === 'failed') return j.status === 'failed' || j.status === 'cancelled';
    return true;
  });

  const activeCount = jobs.filter((j) =>
    ['pending', 'resolving', 'queued', 'downloading', 'transcoding', 'tagging'].includes(j.status)
  ).length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed' || j.status === 'cancelled').length;

  const overallProgress = jobs.length > 0
    ? Math.round(jobs.reduce((acc, j) => acc + (j.status === 'completed' ? 100 : j.progress_percent), 0) / jobs.length)
    : 0;

  const renderStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-600/20 text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
            <span>Completed</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-950/80 text-pink-400 border border-pink-600/50 font-['Google_Sans_Flex',sans-serif]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white/60 border border-white/20 font-['Google_Sans_Flex',sans-serif]">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'downloading':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-600 text-white animate-pulse font-['Google_Sans_Flex',sans-serif]">
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>Downloading</span>
          </span>
        );
      case 'transcoding':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-700 text-white animate-pulse font-['Google_Sans_Flex',sans-serif]">
            <Zap className="w-3.5 h-3.5" />
            <span>Transcoding</span>
          </span>
        );
      case 'tagging':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-600/30 text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <Music className="w-3.5 h-3.5 text-pink-400" />
            <span>Embedding Tags</span>
          </span>
        );
      case 'resolving':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-950/60 text-pink-300 border border-pink-600/35 font-['Google_Sans_Flex',sans-serif]">
            <Clock className="w-3.5 h-3.5 animate-spin text-pink-400" />
            <span>Resolving Source</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white/70 border border-white/20 font-['Google_Sans_Flex',sans-serif]">
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Overview Stats Card */}
      <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-5xl font-['Honk'] tracking-wide flex items-center gap-2">
              <DownloadCloud className="w-7 h-7 text-pink-500" />
              <span>DOWNLOAD QUEUE</span>
            </h2>
            <p className="text-xs sm:text-sm font-['Jost'] text-white/80 pt-1">
              Active background downloads with FFmpeg transcoding and automatic ID3 metadata tagging
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-full border border-pink-600/30 text-xs font-['Jost']">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                filter === 'all' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                filter === 'active' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                filter === 'completed' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Done ({completedCount})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3.5 py-1.5 rounded-full font-bold transition-all ${
                filter === 'failed' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              Failed ({failedCount})
            </button>
          </div>
        </div>

        {/* Global Progress Bar */}
        {jobs.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-pink-600/25">
            <div className="flex justify-between text-xs font-semibold font-['Jost']">
              <span className="text-white/80">Total Queue Progress ({completedCount}/{jobs.length} completed)</span>
              <span className="text-pink-400 font-mono font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-black border border-pink-600/30 overflow-hidden">
              <div
                className="h-full bg-pink-600 transition-all duration-300 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-black/45 backdrop-blur-md rounded-3xl border border-dashed border-pink-600/30 p-8 font-['Jost']">
          <DownloadCloud className="w-12 h-12 text-pink-500/60 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No jobs in this view</h3>
          <p className="text-xs text-white/70 mt-1">
            Search for a song, album, or playlist on the discover tab to start downloading.
          </p>
        </div>
      ) : (
        <div className="space-y-3 font-['Google_Sans_Flex',sans-serif]">
          {filteredJobs.map((job) => {
            const isActive = ['pending', 'resolving', 'queued', 'downloading', 'transcoding', 'tagging'].includes(job.status);
            const isCancelling = cancellingIds.has(job.job_id);
            const isRetrying = retryingIds.has(job.job_id);

            return (
              <div
                key={job.job_id}
                className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-4 sm:p-5 shadow-lg space-y-3 hover:border-pink-600/60 transition-all"
              >
                <div className="flex items-start sm:items-center justify-between gap-4">
                  {/* Left: Thumbnail and Track info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/40">
                      {job.cover_url ? (
                        <img src={job.cover_url} alt={job.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-pink-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{job.title}</h4>
                      <p className="text-xs text-white/70 truncate">
                        {job.artist} • {job.album}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-white/60 font-mono">
                        <span className="uppercase font-semibold text-pink-400">{job.format} ({job.quality_id})</span>
                        {job.actual_source_bitrate && (
                          <>
                            <span>•</span>
                            <span>Source: ~{job.actual_source_bitrate} kbps</span>
                          </>
                        )}
                        {job.download_speed && (
                          <>
                            <span>•</span>
                            <span className="text-pink-400 font-bold">{job.download_speed}</span>
                          </>
                        )}
                        {job.eta_seconds !== null && job.eta_seconds !== undefined && job.eta_seconds > 0 && (
                          <>
                            <span>•</span>
                            <span>{job.eta_seconds}s left</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge and Action buttons with Shady styles */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    {renderStatusBadge(job.status)}

                    {/* Active: Cancel button */}
                    {isActive && (
                      <button
                        onClick={() => handleCancel(job.job_id)}
                        disabled={isCancelling}
                        className="btn-shady-secondary-sm px-3 gap-1"
                        title="Cancel job"
                      >
                        <XCircle className="w-3.5 h-3.5 text-pink-400" />
                        <span className="hidden sm:inline">Cancel</span>
                      </button>
                    )}

                    {/* Failed / Cancelled: Retry button */}
                    {(job.status === 'failed' || job.status === 'cancelled') && (
                      <button
                        onClick={() => handleRetry(job.job_id)}
                        disabled={isRetrying}
                        className="btn-shady-sm px-3.5 gap-1.5"
                        title="Retry download"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Retry</span>
                      </button>
                    )}

                    {/* Completed: Conditional buttons for Cloud vs Desktop Mode */}
                    {job.status === 'completed' && (
                      <>
                        {/* Cloud Mode: Save button only (manual browser download) */}
                        {isCloudMode && (
                          <a
                            href={`/api/download-file/${job.job_id}`}
                            download
                            className="btn-shady-sm px-3 gap-1.5"
                            title="Save audio file to your device"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </a>
                        )}

                        {/* Desktop (.exe) Mode: Folder button only (file is already auto-saved to PC) */}
                        {!isCloudMode && (
                          <button
                            onClick={() => handleOpenFolder(job.job_id)}
                            className="btn-shady-secondary-sm px-3.5 gap-1.5"
                            title="Open downloaded folder in Explorer"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-pink-400" />
                            <span>Open Folder</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Per-job progress bar */}
                {isActive && (
                  <div className="w-full h-1.5 rounded-full bg-black border border-pink-600/20 overflow-hidden">
                    <div
                      className="h-full bg-pink-600 transition-all duration-200 rounded-full"
                      style={{ width: `${job.progress_percent}%` }}
                    />
                  </div>
                )}

                {/* Error message box if failed */}
                {job.status === 'failed' && job.error_message && (
                  <div className="p-3.5 rounded-2xl bg-pink-950/70 border border-pink-600/50 text-xs text-white font-['Jost'] space-y-2">
                    <div>
                      <span className="font-bold text-pink-400">Error: </span>
                      {job.error_message}
                    </div>
                    {job.error_message.toLowerCase().includes('bot') && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 font-['Google_Sans_Flex']">
                        <a
                          href="/api/download-desktop-app"
                          download="SabrinaListens.exe"
                          className="btn-shady-sm px-3 py-1 text-[11px] gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download Desktop .exe (Runs without cloud bot checks)</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
