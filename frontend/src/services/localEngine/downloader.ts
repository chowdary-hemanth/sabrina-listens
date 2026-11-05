import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ID3Writer } from 'browser-id3-writer';
import { TrackMetadata, DownloadJobStatus } from '../../types';
import { searchJioSaavn } from './jiosaavn';
import { pickBestCandidate } from './matcher';

// Local active jobs map
const localJobs = new Map<string, DownloadJobStatus>();
const listeners = new Set<(jobs: DownloadJobStatus[]) => void>();

export function subscribeLocalQueue(fn: (jobs: DownloadJobStatus[]) => void): () => void {
  listeners.add(fn);
  fn(Array.from(localJobs.values()));
  return () => listeners.delete(fn);
}

function notifyQueue() {
  const list = Array.from(localJobs.values());
  listeners.forEach((fn) => fn(list));
}

export function getLocalQueue(): DownloadJobStatus[] {
  return Array.from(localJobs.values());
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function processLocalDownload(track: TrackMetadata, qualityId: string): Promise<DownloadJobStatus> {
  const jobId = `local_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const job: DownloadJobStatus = {
    job_id: jobId,
    track_id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album || track.title,
    cover_url: track.album_art_url,
    status: 'resolving',
    progress_percent: 5,
    quality_id: qualityId,
    format: 'm4a',
    is_transcoded: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localJobs.set(jobId, job);
  notifyQueue();

  try {
    // 1. Resolve candidate via JioSaavn direct 320k AAC
    job.progress_percent = 15;
    notifyQueue();

    const candidates = await searchJioSaavn(track);
    const best = pickBestCandidate(track, candidates, 0.45);

    if (!best || !best.stream_url) {
      throw new Error('No matching audio stream found for track');
    }

    job.status = 'downloading';
    job.progress_percent = 30;
    job.actual_source_bitrate = best.bitrate_kbps;
    job.format = best.format;
    notifyQueue();

    // 2. Download audio bytes
    let audioBuffer: ArrayBuffer;
    const streamUrl = best.stream_url;

    if (Capacitor.isNativePlatform()) {
      // Use native CapacitorHttp for direct download
      const res = await CapacitorHttp.get({
        url: streamUrl,
        responseType: 'blob',
      });
      if (typeof res.data === 'string') {
        // base64 data
        const binaryStr = window.atob(res.data);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        audioBuffer = bytes.buffer;
      } else {
        const blob = res.data as Blob;
        audioBuffer = await blob.arrayBuffer();
      }
    } else {
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error(`Download failed with HTTP ${res.status}`);
      audioBuffer = await res.arrayBuffer();
    }

    job.progress_percent = 75;
    job.status = 'tagging';
    notifyQueue();

    // 3. Optional ID3 tagging (for MP3/M4A)
    try {
      if (track.title) {
        const writer = new ID3Writer(audioBuffer);
        writer.setFrame('TIT2', track.title);
        if (track.artist) writer.setFrame('TPE1', [track.artist]);
        if (track.album) writer.setFrame('TALB', track.album);
        writer.addTag();
        const taggedBlob = writer.getBlob();
        audioBuffer = await taggedBlob.arrayBuffer();
      }
    } catch (e) {
      console.debug('ID3 tagging note:', e);
    }

    job.progress_percent = 90;
    notifyQueue();

    // 4. Save to device
    const cleanArtist = sanitizeFilename(track.artist || 'Unknown Artist');
    const cleanTitle = sanitizeFilename(track.title || 'Untitled');
    const filename = `${cleanTitle}.${best.format || 'm4a'}`;

    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.requestPermissions();
      } catch (_) {
        // Ignored if permissions are already granted or not required
      }
      // Save directly to device storage on Android
      const base64Data = arrayBufferToBase64(audioBuffer);
      const filePath = `SabrinaListens/${cleanArtist}/${filename}`;

      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      job.file_path = `Documents/${filePath}`;
    } else {
      // Browser trigger download
      const blob = new Blob([audioBuffer], { type: 'audio/mp4' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
      job.file_path = filename;
    }

    job.status = 'completed';
    job.progress_percent = 100;
    job.file_size_bytes = audioBuffer.byteLength;
    job.updated_at = new Date().toISOString();
    notifyQueue();
  } catch (err: any) {
    console.error('Local download failed:', err);
    job.status = 'failed';
    job.error_message = err.message || 'Local download failed';
    job.updated_at = new Date().toISOString();
    notifyQueue();
  }

  return job;
}
