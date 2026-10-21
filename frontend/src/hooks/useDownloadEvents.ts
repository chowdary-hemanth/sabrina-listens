import { useEffect, useState, useCallback } from 'react';
import { DownloadJobStatus, DownloadQueueSummary } from '../types';
import { getDownloadQueue } from '../services/api';

export function useDownloadEvents() {
  const [queueSummary, setQueueSummary] = useState<DownloadQueueSummary>({
    total_jobs: 0,
    active_jobs: 0,
    completed_jobs: 0,
    failed_jobs: 0,
    jobs: [],
  });

  const refreshQueue = useCallback(async () => {
    try {
      const summary = await getDownloadQueue();
      setQueueSummary(summary);
    } catch {
      // Ignore initial poll errors
    }
  }, []);

  useEffect(() => {
    refreshQueue();

    // Setup Server-Sent Events stream
    const eventSource = new EventSource('/api/downloads/events');

    eventSource.onmessage = (event) => {
      try {
        const updatedJob: DownloadJobStatus = JSON.parse(event.data);
        setQueueSummary((prev) => {
          const existingIndex = prev.jobs.findIndex((j) => j.job_id === updatedJob.job_id);
          let newJobs: DownloadJobStatus[];

          if (existingIndex >= 0) {
            newJobs = [...prev.jobs];
            newJobs[existingIndex] = updatedJob;
          } else {
            newJobs = [updatedJob, ...prev.jobs];
          }

          const active = newJobs.filter((j) =>
            ['pending', 'resolving', 'queued', 'downloading', 'transcoding', 'tagging'].includes(j.status)
          ).length;
          const completed = newJobs.filter((j) => j.status === 'completed').length;
          const failed = newJobs.filter((j) => j.status === 'failed').length;

          return {
            total_jobs: newJobs.length,
            active_jobs: active,
            completed_jobs: completed,
            failed_jobs: failed,
            jobs: newJobs,
          };
        });
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      // Reconnection fallback with interval polling if SSE drops
      const interval = setInterval(refreshQueue, 3000);
      return () => clearInterval(interval);
    };

    return () => {
      eventSource.close();
    };
  }, [refreshQueue]);

  return { queueSummary, refreshQueue };
}
