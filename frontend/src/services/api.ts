import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  ResourceResponse,
  DownloadJobStatus,
  DownloadQueueSummary,
  SettingsModel,
  HistoryItem,
  RecentUrlItem,
} from '../types';
import { resolveSpotifyLocal } from './localEngine/spotify';
import { processLocalDownload, getLocalQueue, subscribeLocalQueue } from './localEngine/downloader';

export { subscribeLocalQueue };

// Local in-memory resource cache for on-device resolution
const localResources = new Map<string, ResourceResponse>();

export function isNativeMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    Capacitor.isNativePlatform() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port)
  );
}

export function getCustomServerUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sabrina_custom_api_base') || '';
  }
  return '';
}

export function setCustomServerUrl(url: string) {
  if (typeof window !== 'undefined') {
    if (url.trim()) {
      localStorage.setItem('sabrina_custom_api_base', url.trim());
    } else {
      localStorage.removeItem('sabrina_custom_api_base');
    }
  }
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('sabrina_custom_api_base');
    if (custom) return custom.replace(/\/+$/, '') + (custom.endsWith('/api') ? '' : '/api');

    if (
      Capacitor.isNativePlatform() ||
      window.location.protocol === 'capacitor:' ||
      (window.location.hostname === 'localhost' && !window.location.port)
    ) {
      return 'https://sabrina-listens.onrender.com/api';
    }
  }
  return '/api';
}

async function apiRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    params?: Record<string, string>;
  } = {}
): Promise<T> {
  const base = getApiBase();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrlStr = base.startsWith('http') ? `${base}${cleanPath}` : `${base}${cleanPath}`;

  // When running on Android via Capacitor, use native HTTP to bypass any browser CORS restrictions
  if (isNativeMobile()) {
    try {
      const res = await CapacitorHttp.request({
        url: fullUrlStr,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: options.body,
        params: options.params,
        connectTimeout: 20000,
        readTimeout: 45000,
      });

      if (res.status >= 400) {
        const detail = res.data?.detail || res.data?.message || `Server returned error (${res.status})`;
        throw new Error(detail);
      }
      return res.data as T;
    } catch (nativeErr: any) {
      console.warn('Native CapacitorHttp failed, attempting standard fetch:', nativeErr);
      if (nativeErr.message && !nativeErr.message.includes('fetch')) {
        throw nativeErr;
      }
    }
  }

  // Standard web browser fetch
  const urlObj = base.startsWith('http')
    ? new URL(`${base}${cleanPath}`)
    : new URL(`${base}${cleanPath}`, window.location.origin);

  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => urlObj.searchParams.append(k, v));
  }

  const res = await fetch(urlObj.toString(), {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status} Error` }));
    throw new Error(err.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function resolveUrl(url: string): Promise<ResourceResponse> {
  // If running in standalone mobile mode or on Android, try local Spotify / JioSaavn resolution first
  const isMobile = isNativeMobile();
  if (isMobile) {
    try {
      const localRes = await resolveSpotifyLocal(url);
      if (localRes) {
        localResources.set(localRes.resource_id, localRes);
        return localRes;
      }
    } catch (e) {
      console.warn('Local resolver skipped, trying server:', e);
    }
  }

  // Fallback to server resolution (FastAPI)
  try {
    const res = await apiRequest<ResourceResponse>('/resolve', {
      method: 'POST',
      body: { url },
    });
    return res;
  } catch (err: any) {
    // If server is unreachable (offline or down), fallback to client-side resolution
    const localRes = await resolveSpotifyLocal(url);
    if (localRes) {
      localResources.set(localRes.resource_id, localRes);
      return localRes;
    }
    throw err;
  }
}

export async function getResource(resourceId: string): Promise<ResourceResponse> {
  const cached = localResources.get(resourceId);
  if (cached) return cached;
  return apiRequest<ResourceResponse>(`/resources/${resourceId}`);
}

export async function enqueueDownloads(
  resourceId: string,
  trackIds: string[],
  qualityId: string
): Promise<DownloadJobStatus[]> {
  const localRes = localResources.get(resourceId);
  if (localRes) {
    const selectedTracks = localRes.tracks.filter((t) => trackIds.includes(t.id));
    for (const track of selectedTracks) {
      processLocalDownload(track, qualityId).catch(console.error);
    }
    return getLocalQueue();
  }

  return apiRequest<DownloadJobStatus[]>('/downloads', {
    method: 'POST',
    body: {
      resource_id: resourceId,
      track_ids: trackIds,
      quality_id: qualityId,
    },
  });
}

export async function getDownloadQueue(): Promise<DownloadQueueSummary> {
  const local = getLocalQueue();
  let serverJobs: DownloadJobStatus[] = [];
  try {
    const serverSummary = await apiRequest<DownloadQueueSummary>('/downloads');
    serverJobs = serverSummary.jobs || [];
  } catch {
    // Server offline or not used
  }

  const allJobs = [...local, ...serverJobs];
  const active = allJobs.filter((j) =>
    ['pending', 'resolving', 'queued', 'downloading', 'transcoding', 'tagging'].includes(j.status)
  ).length;
  const completed = allJobs.filter((j) => j.status === 'completed').length;
  const failed = allJobs.filter((j) => j.status === 'failed' || j.status === 'cancelled').length;

  return {
    total_jobs: allJobs.length,
    active_jobs: active,
    completed_jobs: completed,
    failed_jobs: failed,
    jobs: allJobs,
  };
}

export async function cancelJob(jobId: string): Promise<void> {
  await apiRequest(`/downloads/${jobId}/cancel`, { method: 'POST' }).catch(() => {});
}

export async function retryJob(jobId: string): Promise<DownloadJobStatus> {
  return apiRequest<DownloadJobStatus>(`/downloads/${jobId}/retry`, { method: 'POST' });
}

export async function retryAllJobs(): Promise<DownloadJobStatus[]> {
  return apiRequest<DownloadJobStatus[]>('/downloads/retry-all', { method: 'POST' });
}

export async function getSettings(): Promise<SettingsModel> {
  try {
    return await apiRequest<SettingsModel>('/settings');
  } catch {
    // Return sensible local fallback settings when running standalone
    return {
      output_directory: 'Documents/SabrinaListens',
      temp_directory: 'Cache',
      max_concurrent_downloads: 3,
      default_quality: 'mp3_320',
      naming_template: '{track} - {title}',
      ffmpeg_detected: false,
      ffmpeg_path: null,
      spotify_configured: false,
      cloud_mode: false,
    };
  }
}

export async function updateSettings(settings: Partial<SettingsModel>): Promise<SettingsModel> {
  try {
    return await apiRequest<SettingsModel>('/settings', {
      method: 'PUT',
      body: settings,
    });
  } catch {
    return {
      output_directory: 'Documents/SabrinaListens',
      temp_directory: 'Cache',
      max_concurrent_downloads: 3,
      default_quality: 'mp3_320',
      naming_template: '{track} - {title}',
      ffmpeg_detected: false,
      ffmpeg_path: null,
      spotify_configured: false,
      cloud_mode: false,
      ...settings,
    } as SettingsModel;
  }
}

export async function getHistory(search?: string, status?: string): Promise<HistoryItem[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  return apiRequest<HistoryItem[]>('/history', { method: 'GET', params }).catch(() => []);
}

export async function clearHistory(deleteFiles: boolean = false): Promise<void> {
  await apiRequest(`/history`, {
    method: 'DELETE',
    params: { delete_files: String(deleteFiles) },
  }).catch(() => {});
}

export async function getRecentUrls(): Promise<RecentUrlItem[]> {
  return apiRequest<RecentUrlItem[]>('/recents').catch(() => []);
}

export async function openContainingFolder(jobId: string): Promise<void> {
  await apiRequest(`/open-folder/${jobId}`, { method: 'POST' }).catch(() => {});
}

export interface CookieStatus {
  has_cookies: boolean;
  cookie_count: number;
  path: string | null;
}

export async function getCookieStatus(): Promise<CookieStatus> {
  return apiRequest<CookieStatus>('/settings/cookies/status').catch(() => ({
    has_cookies: false,
    cookie_count: 0,
    path: null,
  }));
}

export async function saveCookies(cookiesText: string): Promise<CookieStatus> {
  return apiRequest<CookieStatus>('/settings/cookies', {
    method: 'POST',
    body: { cookies_text: cookiesText },
  });
}

export async function clearCookies(): Promise<CookieStatus> {
  return apiRequest<CookieStatus>('/settings/cookies', { method: 'DELETE' });
}
