import React, { useState, useEffect } from 'react';
import {
  Folder,
  Layers,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Save,
  HelpCircle,
  ShieldCheck,
  Download,
  Key,
  Trash2,
  Upload,
} from 'lucide-react';
import { SettingsModel } from '../types';
import { updateSettings, getCookieStatus, saveCookies, clearCookies, CookieStatus } from '../services/api';

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

  // YouTube Cookies State
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);
  const [cookieInput, setCookieInput] = useState('');
  const [showCookieEditor, setShowCookieEditor] = useState(false);
  const [isSavingCookies, setIsSavingCookies] = useState(false);
  const [cookieSuccess, setCookieSuccess] = useState<string | null>(null);

  useEffect(() => {
    getCookieStatus().then(setCookieStatus).catch(console.error);
  }, []);

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

  const handleSaveCookies = async () => {
    if (!cookieInput.trim()) return;
    setIsSavingCookies(true);
    try {
      const res = await saveCookies(cookieInput);
      setCookieStatus(res);
      setCookieSuccess(`Successfully activated ${res.cookie_count} YouTube cookies!`);
      setCookieInput('');
      setShowCookieEditor(false);
      setTimeout(() => setCookieSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save cookies');
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleClearCookies = async () => {
    if (!confirm('Are you sure you want to clear your saved YouTube cookies?')) return;
    try {
      const res = await clearCookies();
      setCookieStatus(res);
      setCookieSuccess('Cookies cleared successfully.');
      setTimeout(() => setCookieSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to clear cookies');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCookieInput(content);
        setShowCookieEditor(true);
      }
    };
    reader.readAsText(file);
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

        {/* YouTube Cloud Cookies & Datacenter Bot Protection */}
        <div className="p-5 rounded-2xl bg-black/60 border border-pink-600/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-pink-500" />
              <span>YouTube Cloud Authentication (Cookies)</span>
            </span>
            {cookieStatus?.has_cookies ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 px-3 py-1 rounded-full border border-emerald-500/50">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cookies Active ({cookieStatus.cookie_count} loaded)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/70 px-3 py-1 rounded-full border border-amber-500/50">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>No Cookies (Fallback Active)</span>
              </span>
            )}
          </div>

          <p className="text-xs text-white/80 leading-relaxed">
            On cloud servers (like Render.com), YouTube blocks datacenter IP addresses with <em>"Sign in to confirm you're not a bot"</em>. Sabrina Listens automatically uses SoundCloud fallback streams, but if you want 100% direct YouTube video extraction, paste your YouTube cookies below.
          </p>

          {cookieSuccess && (
            <div className="p-3 rounded-xl bg-pink-950/60 border border-pink-500 text-xs text-pink-200 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-pink-400" />
              <span>{cookieSuccess}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowCookieEditor(!showCookieEditor)}
              className="btn-shady-secondary text-xs px-3.5 py-1.5 gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-pink-400" />
              <span>{showCookieEditor ? 'Hide Cookie Box' : 'Paste / Update Cookies'}</span>
            </button>

            <label className="btn-shady-secondary text-xs px-3.5 py-1.5 gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-pink-400" />
              <span>Upload cookies.txt</span>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {cookieStatus?.has_cookies && (
              <button
                type="button"
                onClick={handleClearCookies}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Cookies</span>
              </button>
            )}
          </div>

          {/* Expandable Cookie Editor */}
          {showCookieEditor && (
            <div className="space-y-3 pt-2 border-t border-pink-600/25 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Paste exported Netscape cookies below:</span>
                <a
                  href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-400 hover:underline"
                >
                  Get Chrome/Firefox Extension ↗
                </a>
              </div>
              <textarea
                rows={5}
                value={cookieInput}
                onChange={(e) => setCookieInput(e.target.value)}
                placeholder="# Netscape HTTP Cookie File&#10;.youtube.com&#9;TRUE&#9;/&#9;TRUE&#9;1745...&#9;VISITOR_INFO1_LIVE&#9;..."
                className="w-full bg-black/80 border border-pink-600/40 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={handleSaveCookies}
                disabled={isSavingCookies || !cookieInput.trim()}
                className="btn-shady text-xs px-5 py-2 gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingCookies ? 'Saving Cookies...' : 'Save & Activate Cookies'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Standalone Desktop Executable Download */}
        <div className="p-4 rounded-2xl bg-black/50 border border-pink-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-sm font-bold text-white block">
              Prefer Desktop Offline Mode?
            </span>
            <p className="text-xs text-white/70">
              Get full uncompressed FLAC audio, 192k/256k/320k choices, and local disk folders with zero cloud restrictions.
            </p>
          </div>
          <a
            href="/api/download-desktop-app"
            download="SabrinaListens.exe"
            className="btn-shady-secondary text-xs px-4 py-2 shrink-0 gap-2 border border-pink-600/40 hover:border-pink-500"
          >
            <Download className="w-3.5 h-3.5 text-pink-400" />
            <span>Download .exe (60.5 MB)</span>
          </a>
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
