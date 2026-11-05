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
import { cancelJob, retryJob, retryAllJobs, openContainingFolder, getApiBase } from '../services/api';

interface QueueViewProps {
  jobs: DownloadJobStatus[];
  onRefresh?: () => void;
  isCloudMode?: boolean;
}

export const QueueView: React.FC<QueueViewProps> = ({ jobs, onRefresh, isCloudMode = false }) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [isRetryingAll, setIsRetryingAll] = useState(false);

  const handleRetryAll = async () => {
    setIsRetryingAll(true);
    try {
      await retryAllJobs();
      onRefresh?.();
    } catch (e) {
      console.error('Failed to retry all jobs:', e);
    } finally {
      setIsRetryingAll(false);
    }
  };

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
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-pink-600/20 text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
            <span>Ready</span>
          </span>
        );
      case 'downloading':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-pink-600/25 text-pink-300 border border-pink-500/50 animate-pulse font-['Google_Sans_Flex',sans-serif]">
            <Zap className="w-3.5 h-3.5 text-pink-400 animate-bounce" />
            <span>Downloading</span>
          </span>
        );
      case 'transcoding':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-pink-950 text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <RotateCw className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            <span>Transcoding</span>
          </span>
        );
      case 'tagging':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-pink-950 text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <Music className="w-3.5 h-3.5 text-pink-400" />
            <span>Tagging</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-red-950/60 text-red-300 border border-red-600/40 font-['Google_Sans_Flex',sans-serif]">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Failed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-zinc-800 text-white/60 border border-white/20 font-['Google_Sans_Flex',sans-serif]">
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancelled</span>
          </span>
        );
      case 'resolving':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-black text-pink-300 border border-pink-600/40 font-['Google_Sans_Flex',sans-serif]">
            <Clock className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            <span>Resolving</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-black text-white/60 border border-pink-600/30 font-['Google_Sans_Flex',sans-serif]">
            <Clock className="w-3.5 h-3.5 text-white/50" />
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Overview Stats Card */}
      <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-2xl sm:text-5xl font-['Honk'] tracking-wide flex items-center gap-2">
              <DownloadCloud className="w-6 h-6 sm:w-7 sm:h-7 text-pink-500" />
              <span>DOWNLOAD QUEUE</span>
            </h2>
            <p className="text-[11px] sm:text-sm font-['Jost'] text-white/80 pt-0.5 sm:pt-1">
              Active background downloads with FFmpeg transcoding and automatic ID3 metadata tagging
            </p>
          </div>

          {/* Filter Pills & Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
            <div className="flex flex-wrap items-center gap-1 bg-black/60 p-1 rounded-2xl border border-pink-600/30 text-xs font-['Jost']">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                  filter === 'all' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                All ({jobs.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                  filter === 'active' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                  filter === 'completed' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Done ({completedCount})
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                  filter === 'failed' ? 'bg-pink-600 text-white shadow-sm' : 'text-white/70 hover:text-white'
                }`}
              >
                Failed ({failedCount})
              </button>
            </div>

            {failedCount > 0 && (
              <button
                onClick={handleRetryAll}
                disabled={isRetryingAll}
                className="btn-shady-sm px-3.5 py-1.5 gap-1.5 text-xs font-bold"
                title="Retry all failed or cancelled downloads"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRetryingAll ? 'animate-spin' : ''}`} />
                <span>Retry All ({failedCount})</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        {jobs.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-pink-600/25">
            <div className="flex justify-between text-xs font-semibold font-['Jost']">
              <span className="text-white/80">Queue Progress ({completedCount}/{jobs.length} completed)</span>
              <span className="text-pink-400 font-mono font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-black border border-pink-600/30 overflow-hidden">
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
        <div className="text-center py-12 sm:py-16 bg-black/45 backdrop-blur-md rounded-3xl border border-dashed border-pink-600/30 p-6 sm:p-8 font-['Jost']">
          <DownloadCloud className="w-10 h-10 sm:w-12 sm:h-12 text-pink-500/60 mx-auto mb-2.5" />
          <h3 className="text-sm sm:text-base font-bold text-white">No jobs in this view</h3>
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
                className="bg-black/65 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-pink-600/35 p-3.5 sm:p-5 shadow-lg space-y-2.5 sm:space-y-3 hover:border-pink-600/60 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Thumbnail and Track info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/40">
                      {job.cover_url ? (
                        <img src={job.cover_url} alt={job.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-5 h-5 text-pink-500" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">{job.title}</h4>
                      <p className="text-[11px] sm:text-xs text-white/70 truncate">
                        {job.artist} • {job.album}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px] text-white/60 font-mono flex-wrap">
                        <span className="uppercase font-semibold text-pink-400">{job.format} ({job.quality_id})</span>
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

                  {/* Right: Badge and Action buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t border-pink-600/15 sm:border-0">
                    {renderStatusBadge(job.status)}

                    {/* Active: Cancel button */}
                    {isActive && (
                      <button
                        onClick={() => handleCancel(job.job_id)}
                        disabled={isCancelling}
                        className="btn-shady-secondary-sm px-3 py-1 gap-1"
                        title="Cancel job"
                      >
                        <XCircle className="w-3.5 h-3.5 text-pink-400" />
                        <span>Cancel</span>
                      </button>
                    )}

                    {/* Failed / Cancelled: Retry button */}
                    {(job.status === 'failed' || job.status === 'cancelled') && (
                      <button
                        onClick={() => handleRetry(job.job_id)}
                        disabled={isRetrying}
                        className="btn-shady-sm px-3.5 py-1 gap-1.5"
                        title="Retry download"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                    )}

                    {/* Completed: Save / Open Folder buttons */}
                    {job.status === 'completed' && (
                      <>
                        {isCloudMode && (
                          <a
                            href={`${getApiBase()}/download-file/${job.job_id}`}
                            download
                            className="btn-shady-sm px-3 py-1 gap-1.5"
                            title="Save audio file to your device"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </a>
                        )}

                        {!isCloudMode && (
                          <button
                            onClick={() => handleOpenFolder(job.job_id)}
                            className="btn-shady-secondary-sm px-3.5 py-1 gap-1.5"
                            title="Open downloaded folder"
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

                {/* Error message */}
                {job.error_message && (
                  <div className="text-[11px] sm:text-xs text-red-300 bg-red-950/40 p-2.5 rounded-xl border border-red-600/30 space-y-1">
                    <div>
                      <span className="font-bold text-pink-400">Error: </span>
                      {job.error_message}
                    </div>
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
