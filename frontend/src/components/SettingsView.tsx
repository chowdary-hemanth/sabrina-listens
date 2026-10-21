import React, { useState, useEffect } from 'react';
import {
  Folder,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  HelpCircle,
} from 'lucide-react';
import { SettingsModel } from '../types';
import { updateSettings } from '../services/api';

interface SettingsViewProps {
  settings: SettingsModel | null;
  onUpdated: (settings: SettingsModel) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdated,
}) => {
  const [outputDir, setOutputDir] = useState('');
  const [tempDir, setTempDir] = useState('');
  const [concurrency, setConcurrency] = useState(3);
  const [defaultQuality, setDefaultQuality] = useState('mp3_320');
  const [namingTemplate, setNamingTemplate] = useState('{track} - {title}');
  const [ffmpegPath, setFfmpegPath] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (settings) {
      setOutputDir(settings.output_directory);
      setTempDir(settings.temp_directory);
      setConcurrency(settings.max_concurrent_downloads);
      setDefaultQuality(settings.default_quality);
      setNamingTemplate(settings.naming_template);
      setFfmpegPath(settings.ffmpeg_path || '');
      setClientId(settings.spotify_client_id || '');
      setClientSecret(settings.spotify_client_secret || '');
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateSettings({
        output_directory: outputDir,
        temp_directory: tempDir,
        max_concurrent_downloads: concurrency,
        default_quality: defaultQuality,
        naming_template: namingTemplate,
        ffmpeg_path: ffmpegPath || undefined,
        spotify_client_id: clientId || undefined,
        spotify_client_secret: clientSecret || undefined,
      });
      onUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in font-['Jost']">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-5xl font-['Honk'] tracking-wide">
          SETTINGS
        </h2>
        <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto">
          Configure storage paths, simultaneous downloads, default bitrates, and transcoding preferences.
        </p>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSave} className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Output Directory */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <Folder className="w-4 h-4 text-pink-500" />
            <span>Downloads Destination Folder</span>
          </label>
          <input
            type="text"
            value={outputDir}
            onChange={(e) => setOutputDir(e.target.value)}
            className="w-full bg-black/60 border border-pink-600/40 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
          />
          <p className="text-xs text-white/60">
            Files are automatically organized as: <code className="text-pink-400">Artist / Album / [Track] - Title.ext</code>
          </p>
        </div>

        {/* Concurrency and Default Quality Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Concurrency */}
          <div className="space-y-2 bg-black/45 p-4 rounded-2xl border border-pink-600/25">
            <label className="text-sm font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-500" />
                <span>Concurrent Downloads</span>
              </span>
              <span className="text-pink-400 font-mono font-bold text-base">{concurrency}</span>
            </label>
            <input
              type="range"
              min="1"
              max="8"
              value={concurrency}
              onChange={(e) => setConcurrency(Number(e.target.value))}
              className="w-full accent-pink-600 cursor-pointer"
            />
            <p className="text-xs text-white/60">Simultaneous active downloads</p>
          </div>

          {/* Default Quality */}
          <div className="space-y-2 bg-black/45 p-4 rounded-2xl border border-pink-600/25">
            <label className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-pink-500" />
              <span>Default Output Format</span>
            </label>
            <select
              value={defaultQuality}
              onChange={(e) => setDefaultQuality(e.target.value)}
              className="w-full bg-black/60 border border-pink-600/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
            >
              <option value="original">Original Source Quality (No re-encoding)</option>
              <option value="mp3_320">MP3 320 kbps (High Quality)</option>
              <option value="mp3_256">MP3 256 kbps</option>
              <option value="mp3_192">MP3 192 kbps</option>
              <option value="aac_256">AAC / M4A 256 kbps</option>
              <option value="flac">FLAC (Lossless Container)</option>
            </select>
          </div>
        </div>

        {/* Filename Naming Pattern */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">
            Filename Template Pattern
          </label>
          <input
            type="text"
            value={namingTemplate}
            onChange={(e) => setNamingTemplate(e.target.value)}
            className="w-full bg-black/60 border border-pink-600/40 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500 transition-colors font-mono"
          />
          <p className="text-xs text-white/60">
            Available tags: <code className="text-pink-400">{'{track}'}</code>, <code className="text-pink-400">{'{title}'}</code>, <code className="text-pink-400">{'{artist}'}</code>, <code className="text-pink-400">{'{album}'}</code>
          </p>
        </div>

        {/* FFmpeg Status Banner */}
        <div className="p-4 rounded-2xl bg-black/50 border border-pink-600/30 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              FFmpeg Audio Transcoder
            </span>
            {settings?.ffmpeg_detected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-pink-300 bg-pink-950/70 px-3 py-1 rounded-full border border-pink-600/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                <span>Detected & Ready</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-pink-400 bg-pink-950/70 px-3 py-1 rounded-full border border-pink-600/50">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Not Found</span>
              </span>
            )}
          </div>
          <input
            type="text"
            value={ffmpegPath}
            onChange={(e) => setFfmpegPath(e.target.value)}
            placeholder="Auto-detected (or enter custom ffmpeg.exe path)"
            className="w-full bg-black/60 border border-pink-600/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
          />
        </div>

        {/* Optional Spotify Developer Credentials */}
        <div className="p-4 rounded-2xl bg-black/50 border border-pink-600/30 space-y-2.5">
          <span className="text-sm font-bold text-white block">
            Optional Spotify Developer Credentials
          </span>
          <p className="text-xs text-white/60">
            Leave blank to use anonymous web metadata. No API keys required for full functionality.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="Client ID (optional)"
              className="w-full bg-black/60 border border-pink-600/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
            />
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="Client Secret (optional)"
              className="w-full bg-black/60 border border-pink-600/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
            />
          </div>
        </div>

        {/* Free of Cost Banner */}
        <div className="p-4 rounded-2xl bg-pink-950/30 border border-pink-600/35 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-pink-500 shrink-0 mt-0.5" />
          <div className="text-xs text-white/90 leading-relaxed">
            <span className="font-bold text-white">100% Free Local Execution: </span>
            Downloads, FFmpeg audio transcoding, and metadata resolution run entirely offline/locally without requiring any paid subscriptions or cloud server bills.
          </div>
        </div>

        {/* Action Row */}
        <div className="pt-3 flex items-center justify-between border-t border-pink-600/30">
          <div>
            {saveSuccess && (
              <span className="text-sm text-pink-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pink-500" />
                <span>Settings saved successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="btn-shady px-9 text-sm gap-2"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>{isSaving ? 'Saving...' : 'SAVE SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
