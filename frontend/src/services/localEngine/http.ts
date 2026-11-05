import { Capacitor, CapacitorHttp } from '@capacitor/core';

export async function httpGetText(
  url: string,
  headers?: Record<string, string>
): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers: headers || {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (res.status >= 400) {
        throw new Error(`Native HTTP request failed with status ${res.status}`);
      }
      return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (e) {
      console.warn('Native CapacitorHttp failed, attempting standard fetch fallback:', e);
    }
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Fetch request failed with status ${res.status}`);
  }
  return res.text();
}

export async function httpGetJson<T = any>(
  url: string,
  headers?: Record<string, string>
): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    try {
      const res = await CapacitorHttp.get({
        url,
        headers: headers || {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      });
      if (res.status >= 400) {
        throw new Error(`Native HTTP request failed with status ${res.status}`);
      }
      if (typeof res.data === 'string') {
        return JSON.parse(res.data) as T;
      }
      return res.data as T;
    } catch (e) {
      console.warn('Native CapacitorHttp failed, attempting standard fetch fallback:', e);
    }
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Fetch request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}
