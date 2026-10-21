import {
  ResourceResponse,
  DownloadJobStatus,
  DownloadQueueSummary,
  SettingsModel,
  HistoryItem,
  RecentUrlItem,
} from '../types';

const API_BASE = '/api';

export async function resolveUrl(url: string): Promise<ResourceResponse> {
  const res = await fetch(`${API_BASE}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resolve URL' }));
    throw new Error(err.detail || 'Failed to resolve music link');
  }
  return res.json();
}

export async function getResource(resourceId: string): Promise<ResourceResponse> {
  const res = await fetch(`${API_BASE}/resources/${resourceId}`);
  if (!res.ok) throw new Error('Resource not found');
  return res.json();
}

export async function enqueueDownloads(
  resourceId: string,
  trackIds: string[],
  qualityId: string
): Promise<DownloadJobStatus[]> {
  const res = await fetch(`${API_BASE}/downloads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resource_id: resourceId,
      track_ids: trackIds,
      quality_id: qualityId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Download enqueue failed' }));
    throw new Error(err.detail || 'Download enqueue failed');
  }
  return res.json();
}

export async function getDownloadQueue(): Promise<DownloadQueueSummary> {
  const res = await fetch(`${API_BASE}/downloads`);
  if (!res.ok) throw new Error('Failed to fetch queue');
  return res.json();
}

export async function cancelJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/downloads/${jobId}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to cancel job');
}

export async function retryJob(jobId: string): Promise<DownloadJobStatus> {
  const res = await fetch(`${API_BASE}/downloads/${jobId}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retry job');
  return res.json();
}

export async function getSettings(): Promise<SettingsModel> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: Partial<SettingsModel>): Promise<SettingsModel> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export async function getHistory(search?: string, status?: string): Promise<HistoryItem[]> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  const res = await fetch(`${API_BASE}/history?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function clearHistory(deleteFiles: boolean = false): Promise<void> {
  const res = await fetch(`${API_BASE}/history?delete_files=${deleteFiles}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear history');
}

export async function getRecentUrls(): Promise<RecentUrlItem[]> {
  const res = await fetch(`${API_BASE}/recents`);
  if (!res.ok) return [];
  return res.json();
}

export async function openContainingFolder(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/open-folder/${jobId}`, { method: 'POST' });
}
