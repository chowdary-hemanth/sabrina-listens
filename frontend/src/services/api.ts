import { Capacitor, CapacitorHttp } from '@capacitor/core';
import {
  ResourceResponse,
  DownloadJobStatus,
  DownloadQueueSummary,
  SettingsModel,
  HistoryItem,
  RecentUrlItem,
} from '../types';

export function isNativeMobile(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
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
        connectTimeout: 25000,
        readTimeout: 60000,
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
  return apiRequest<ResourceResponse>('/resolve', {
    method: 'POST',
    body: { url },
  });
}

export async function getResource(resourceId: string): Promise<ResourceResponse> {
  return apiRequest<ResourceResponse>(`/resources/${resourceId}`);
}

export async function enqueueDownloads(
  resourceId: string,
  trackIds: string[],
  qualityId: string
): Promise<DownloadJobStatus[]> {
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
  return apiRequest<DownloadQueueSummary>('/downloads');
}

export async function cancelJob(jobId: string): Promise<void> {
  await apiRequest(`/downloads/${jobId}/cancel`, { method: 'POST' });
}

export async function retryJob(jobId: string): Promise<DownloadJobStatus> {
  return apiRequest<DownloadJobStatus>(`/downloads/${jobId}/retry`, { method: 'POST' });
}

export async function retryAllJobs(): Promise<DownloadJobStatus[]> {
  return apiRequest<DownloadJobStatus[]>('/downloads/retry-all', { method: 'POST' });
}

export async function getSettings(): Promise<SettingsModel> {
  return apiRequest<SettingsModel>('/settings');
}

export async function updateSettings(settings: Partial<SettingsModel>): Promise<SettingsModel> {
  return apiRequest<SettingsModel>('/settings', {
    method: 'PUT',
    body: settings,
  });
}

export async function getHistory(search?: string, status?: string): Promise<HistoryItem[]> {
  const params: Record<string, string> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  return apiRequest<HistoryItem[]>('/history', { method: 'GET', params });
}

export async function clearHistory(deleteFiles: boolean = false): Promise<void> {
  await apiRequest(`/history`, {
    method: 'DELETE',
    params: { delete_files: String(deleteFiles) },
  });
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
