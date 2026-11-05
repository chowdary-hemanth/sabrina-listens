import { ResourceResponse, TrackMetadata, QualityOption } from '../../types';
import { httpGetText } from './http';
import { searchJioSaavn } from './jiosaavn';

const DEFAULT_QUALITIES: QualityOption[] = [
  {
    id: 'source',
    label: 'Source Passthrough',
    format: 'm4a',
    bitrate_kbps: null,
    requires_transcoding: false,
    description: 'Direct 320k/160k AAC stream as provided by CDN with zero quality loss',
    is_lossless: false,
  },
  {
    id: 'mp3_320',
    label: 'High Quality AAC / MP3 (320 kbps)',
    format: 'm4a',
    bitrate_kbps: 320,
    requires_transcoding: false,
    description: 'High-fidelity audio stream with embedded metadata',
    is_lossless: false,
  },
];

export function parseSpotifyUrl(url: string): { type: string; id: string } | null {
  const cleanUrl = url.trim().split('?')[0];
  const match = cleanUrl.match(
    /(?:open\.spotify\.com\/(?:intl-[a-zA-Z0-9-]+\/)?|spotify:)(track|album|playlist|artist)(?:\/|:)([a-zA-Z0-9]+)/i
  );
  if (!match) return null;
  return { type: match[1].toLowerCase(), id: match[2] };
}

export async function resolveSpotifyLocal(url: string): Promise<ResourceResponse | null> {
  const parsed = parseSpotifyUrl(url);

  // If not a Spotify link, check if it's a general text search query (e.g. song name or artist)
  if (!parsed) {
    if (!url.startsWith('http://') && !url.startsWith('https://') && url.trim().length > 1) {
      try {
        const candidates = await searchJioSaavn({ title: url.trim() });
        if (candidates.length > 0) {
          const tracks: TrackMetadata[] = candidates.map((cand, idx) => ({
            id: `search_${idx}_${Date.now()}`,
            title: cand.title,
            artist: cand.artist || 'Unknown Artist',
            album: cand.album || cand.title,
            album_art_url: null,
            duration_seconds: cand.duration_seconds || 180,
            track_number: idx + 1,
            total_tracks: candidates.length,
            explicit: false,
            is_available: true,
            provider: 'jiosaavn',
            source_url: cand.source_url,
          }));

          return {
            resource_id: `local_query_${Date.now()}`,
            resource_type: 'track',
            provider: 'jiosaavn',
            title: tracks[0].title,
            artist: tracks[0].artist,
            cover_url: null,
            track_count: tracks.length,
            tracks,
            original_url: url,
            available_qualities: DEFAULT_QUALITIES,
          };
        }
      } catch (err) {
        console.warn('Local search query failed:', err);
      }
    }
    return null;
  }

  try {
    const embedUrl = `https://open.spotify.com/embed/${parsed.type}/${parsed.id}`;
    const html = await httpGetText(embedUrl, {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      throw new Error('Could not parse Spotify metadata');
    }

    const data = JSON.parse(scriptMatch[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity;
    if (!entity) {
      throw new Error('Spotify entity not found');
    }

    const title = entity.title || entity.name || 'Untitled';
    const artist = entity.subtitle || entity.artist || '';
    const coverUrl = entity.coverArt?.sources?.[0]?.url || entity.visualIdentity?.image?.[0]?.url || null;

    const tracks: TrackMetadata[] = [];
    const trackList = entity.trackList || [];

    if (parsed.type === 'track') {
      tracks.push({
        id: parsed.id,
        title,
        artist,
        album: entity.album?.name || title,
        album_art_url: coverUrl,
        duration_seconds: Math.round((entity.duration || 180000) / 1000),
        explicit: !!entity.isExplicit,
        is_available: true,
        provider: 'spotify',
        source_url: `https://open.spotify.com/track/${parsed.id}`,
      });
    } else {
      for (let i = 0; i < trackList.length; i++) {
        const trk = trackList[i];
        const trkUri = trk.uri || '';
        const trkId = trkUri.split(':').pop() || `trk_${i + 1}`;
        tracks.push({
          id: trkId,
          title: trk.title || `Track ${i + 1}`,
          artist: trk.subtitle || artist || 'Unknown Artist',
          album: title,
          album_art_url: coverUrl,
          duration_seconds: Math.round((trk.duration || 180000) / 1000),
          track_number: i + 1,
          total_tracks: trackList.length,
          explicit: !!trk.isExplicit,
          is_available: true,
          provider: 'spotify',
          source_url: `https://open.spotify.com/track/${trkId}`,
        });
      }
    }

    return {
      resource_id: `local_${parsed.type}_${parsed.id}`,
      resource_type: parsed.type as any,
      provider: 'spotify',
      title,
      artist,
      cover_url: coverUrl,
      track_count: tracks.length,
      tracks,
      original_url: url,
      available_qualities: DEFAULT_QUALITIES,
    };
  } catch (e: any) {
    console.warn('Local Spotify resolver error:', e);
    return null;
  }
}
