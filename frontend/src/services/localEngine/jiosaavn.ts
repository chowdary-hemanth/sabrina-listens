import CryptoJS from 'crypto-js';
import { CandidateAudio } from '../../types';
import { httpGetJson } from './http';

const JIOSAAVN_API_URL = 'https://www.jiosaavn.com/api.php';
const DES_KEY = CryptoJS.enc.Utf8.parse('38346591');

export function decryptJioSaavnUrl(encUrl: string): string | null {
  try {
    const decrypted = CryptoJS.DES.decrypt(
      encUrl,
      DES_KEY,
      { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }
    );
    const raw = decrypted.toString(CryptoJS.enc.Utf8);
    if (!raw) return null;
    return raw.replace(/_96\./g, '_320.').replace(/_160\./g, '_320.');
  } catch (e) {
    console.debug('JioSaavn decryption error:', e);
    return null;
  }
}

export async function searchJioSaavn(track: {
  title: string;
  artist?: string;
  duration_seconds?: number;
}): Promise<CandidateAudio[]> {
  const query = track.artist ? `${track.artist} ${track.title}` : track.title;
  const params = new URLSearchParams({
    __call: 'search.getResults',
    _format: 'json',
    _marker: '0',
    api_version: '4',
    p: '1',
    n: '8',
    q: query,
  });

  try {
    const targetUrl = `${JIOSAAVN_API_URL}?${params.toString()}`;
    const data = await httpGetJson<any>(targetUrl);
    const results = data.results || [];
    const candidates: CandidateAudio[] = [];

    for (const item of results) {
      const moreInfo = item.more_info || {};
      const encUrl = moreInfo.encrypted_media_url;
      if (!encUrl) continue;

      const directUrl = decryptJioSaavnUrl(encUrl);
      if (!directUrl) continue;

      const duration = parseInt(item.duration || '0', 10);
      const is320k = moreInfo['320kbps'] === 'true' || moreInfo.has_320 === 'true';

      candidates.push({
        provider: 'jiosaavn',
        source_url: directUrl,
        stream_url: directUrl,
        title: item.title?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || '',
        artist: item.more_info?.artistMap?.primary_artists?.[0]?.name || item.subtitle || '',
        album: moreInfo.album?.replace(/&quot;/g, '"')?.replace(/&amp;/g, '&') || '',
        duration_seconds: duration,
        format: 'm4a',
        bitrate_kbps: is320k ? 320 : 160,
        is_direct: true,
      });
    }

    return candidates;
  } catch (err) {
    console.warn('JioSaavn search failed:', err);
    return [];
  }
}
