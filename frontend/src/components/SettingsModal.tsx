import React, { useState, useEffect } from 'react';
import {
  X,
  Settings as SettingsIcon,
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

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SettingsModel | null;
  onUpdated: (settings: SettingsModel) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
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

  if (!isOpen) return null;

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
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Perfectly calibrated modal container */}
      <div className="relative w-full max-w-xl rounded-3xl bg-black border-2 border-red-600/60 shadow-2xl shadow-red-950/80 overflow-hidden my-8 z-10 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-red-600/30 flex items-center justify-between bg-black/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-600/40">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl font-['Honk'] tracking-wide">SETTINGS</h3>
              <p className="text-xs font-['Courgette'] text-white/80">Configure storage, audio encoding, and concurrency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto font-['Courgette'] flex-1">
          {/* Output Directory */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-red-500" />
              <span>Downloads Destination Folder</span>
            </label>
            <input
              type="text"
              value={outputDir}
              onChange={(e) => setOutputDir(e.target.value)}
              className="w-full bg-black border border-red-600/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
            />
            <p className="text-[11px] text-white/60">
              Files are automatically organized as: <code className="text-red-400">Artist / Album / [Track] - Title.ext</code>
            </p>
          </div>

          {/* Concurrency and Default Quality Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Concurrency */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-red-500" />
                  <span>Concurrent Downloads</span>
                </span>
                <span className="text-red-500 font-mono font-bold text-sm">{concurrency}</span>
              </label>
              <input
                type="range"
                min="1"
                max="8"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="w-full accent-red-600 cursor-pointer"
              />
              <p className="text-[11px] text-white/60">Simultaneous active downloads</p>
            </div>

            {/* Default Quality */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-500" />
                <span>Default Output Format</span>
              </label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value)}
                className="w-full bg-black border border-red-600/40 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
              >
                <option value="original">Original Source Quality (No re-encoding)</option>
                <option value="mp3_320">MP3 320 kbps (High Quality)</option>
                <option value="mp3_256">MP3 256 kbps</option>
                <option value="mp3_192">MP3 192 kbps</option>
                <option value="aac_256">AAC / M4A 256 kbps</option>
                <option value="flac">FLAC (Lossless)</option>
              </select>
            </div>
          </div>

          {/* Filename Naming Pattern */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white">
              Filename Template Pattern
            </label>
            <input
              type="text"
              value={namingTemplate}
              onChange={(e) => setNamingTemplate(e.target.value)}
              className="w-full bg-black border border-red-600/40 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
            />
            <p className="text-[11px] text-white/60">
              Available tags: <code className="text-red-400">{'{track}'}</code>, <code className="text-red-400">{'{title}'}</code>, <code className="text-red-400">{'{artist}'}</code>, <code className="text-red-400">{'{album}'}</code>
            </p>
          </div>

          {/* FFmpeg Status Banner */}
          <div className="p-3.5 rounded-2xl bg-black border border-red-600/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                FFmpeg Audio Transcoder
              </span>
              {settings?.ffmpeg_detected ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-600/20 px-2.5 py-0.5 rounded-md border border-red-600/40">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Detected & Ready</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/60 px-2.5 py-0.5 rounded-md border border-red-600/40">
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
              className="w-full bg-black border border-red-600/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          {/* Optional Spotify Credentials */}
          <div className="p-3.5 rounded-2xl bg-black border border-red-600/30 space-y-2">
            <span className="text-xs font-bold text-white block">
              Optional Spotify Developer Credentials
            </span>
            <p className="text-[11px] text-white/60">
              Leave blank to use anonymous web scraping. No API keys required.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Client ID (optional)"
                className="w-full bg-black border border-red-600/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Client Secret (optional)"
                className="w-full bg-black border border-red-600/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* Free of Cost Banner */}
          <div className="p-3.5 rounded-2xl bg-red-600/10 border border-red-600/30 flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-white/90 leading-relaxed">
              <span className="font-bold text-white">100% Free Local Execution: </span>
              Downloads and FFmpeg audio conversion run on your own CPU without cloud billing or paid tokens.
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-red-600/30">
            {saveSuccess && (
              <span className="text-xs text-red-400 font-medium flex items-center gap-1 mr-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Settings saved!</span>
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all font-['Courgette']"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
