import React, { useState } from 'react';
import {
  Download,
  Cloud,
  Check,
  Laptop,
  Globe,
  Smartphone,
} from 'lucide-react';

interface LandingViewProps {
  onLaunchCloud: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onLaunchCloud }) => {
  const [downloadingExe, setDownloadingExe] = useState(false);
  const [downloadingApk, setDownloadingApk] = useState(false);

  const handleDownloadExe = () => {
    setDownloadingExe(true);
    const link = document.createElement('a');
    link.href = '/api/download-desktop-app';
    link.download = 'SabrinaListens.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingExe(false);
    }, 3500);
  };

  const handleDownloadApk = () => {
    setDownloadingApk(true);
    const link = document.createElement('a');
    link.href = '/api/download-android-app';
    link.download = 'SabrinaListens.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingApk(false);
    }, 3500);
  };

  return (
    <div className="min-h-full flex flex-col justify-center items-center py-6 sm:py-12 px-4 sm:px-6 font-['Jost'] relative z-10 animate-fade-in pb-12">
      {/* Brand Hero */}
      <div className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto">
        {/* Logo Box */}
        <div className="w-24 h-16 sm:w-36 sm:h-24 mx-auto rounded-none overflow-hidden border border-pink-500/40 shadow-md shadow-pink-600/20 bg-black flex items-center justify-center p-1">
          <img
            src="/logo.png"
            alt="SABRINA LISTENS"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo.jpg';
            }}
          />
        </div>

        <h1 className="text-4xl sm:text-7xl md:text-8xl font-['Honk'] tracking-wide">
          SABRINA LISTENS
        </h1>

        <p className="text-sm sm:text-lg text-white font-['Jost'] max-w-2xl mx-auto leading-relaxed px-2">
          High-Fidelity Audio Extractor & Streamer for Spotify, YouTube, and Direct Links.
          Choose how you want to experience Sabrina Listens:
        </p>
      </div>

      {/* 2 Primary Mode Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 max-w-5xl w-full mx-auto mt-8 sm:mt-10">
        
        {/* Option 1: Run Locally (.exe & .apk) */}
        <div className="bg-black/75 backdrop-blur-md rounded-3xl border-2 border-pink-600/50 hover:border-pink-500 p-5 sm:p-8 flex flex-col justify-between transition-all group shadow-2xl relative overflow-hidden">
          {/* Subtle Top Glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-5 sm:space-y-6">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-600/20 text-pink-300 font-mono border border-pink-600/40">
                Local Apps
              </span>
              <span className="text-xs text-white/60 font-mono">Option 1</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-pink-950/60 border border-pink-600/40 flex items-center justify-center text-pink-400">
                <Laptop className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Run Locally</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-pink-300 font-mono font-normal">EXE / APK</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Download the standalone app for Windows PC or Android phone. Runs directly on your device with high-fidelity audio downloads.
              </p>
            </div>

            {/* Feature List */}
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-white/90 font-['Google_Sans_Flex']">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>All Audio Formats:</strong> FLAC Lossless, MP3 (320k, 256k, 192k), AAC M4A</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Fast Transcoding:</strong> High-performance multi-threaded processing</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Direct Device Storage:</strong> Saves directly to your hard drive or phone storage</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Zero Cloud Restrictions:</strong> Reliable playback with automated fallback providers</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons: Desktop .EXE and Android .APK directly below */}
          <div className="pt-6 sm:pt-8 space-y-2.5">
            <button
              onClick={handleDownloadExe}
              disabled={downloadingExe}
              className="w-full btn-shady text-sm sm:text-base py-3 gap-2.5 justify-center shadow-lg hover:shadow-pink-600/30"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>
                {downloadingExe ? 'Starting Download...' : 'Download Desktop App (.exe)'}
              </span>
            </button>

            {/* Android APK Button directly below .exe in Run Locally */}
            <button
              onClick={handleDownloadApk}
              disabled={downloadingApk}
              className="w-full btn-shady-secondary text-sm sm:text-base py-3 gap-2.5 justify-center border border-pink-500/40 hover:border-pink-400 shadow-md"
            >
              <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
              <span>
                {downloadingApk ? 'Starting Download...' : 'Download Android App (.apk)'}
              </span>
            </button>

            <p className="text-center text-[11px] text-white/50 font-mono">
              Windows 10/11 (61 MB) • Android 10+ (6.1 MB)
            </p>
          </div>
        </div>

        {/* Option 2: Use in Cloud (Web App) */}
        <div className="bg-black/75 backdrop-blur-md rounded-3xl border-2 border-pink-600/50 hover:border-pink-500 p-5 sm:p-8 flex flex-col justify-between transition-all group shadow-2xl relative overflow-hidden">
          {/* Subtle Top Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-5 sm:space-y-6">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-600/20 text-pink-300 font-mono border border-pink-600/40">
                Online Web
              </span>
              <span className="text-xs text-white/60 font-mono">Option 2</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-pink-950/60 border border-pink-600/40 flex items-center justify-center text-pink-400">
                <Cloud className="w-6 h-6" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Use in Cloud</span>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-pink-300 font-mono font-normal">320 KBPS</span>
              </h2>
              <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
                Launch directly inside your browser. No downloading or installation needed. Optimized for high-speed direct 320 kbps audio delivery.
              </p>
            </div>

            {/* Feature List */}
            <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-white/90 font-['Google_Sans_Flex']">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Instant Browser Access:</strong> Zero setup — opens immediately on any device</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Fixed 320 kbps Audio:</strong> High-definition audio ready to stream & download</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Full Web App Experience:</strong> Discover, Download Queue, History & How it Works</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Browser Save Button:</strong> Save files straight to your browser downloads folder</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span><strong>Render Cloud Bandwidth:</strong> High-speed direct streaming and downloads</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="pt-6 sm:pt-8 space-y-2.5">
            <button
              onClick={onLaunchCloud}
              className="w-full btn-shady text-sm sm:text-base py-3 gap-2.5 justify-center shadow-lg hover:shadow-pink-600/30"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
              <span>Launch Cloud Web App (320 kbps)</span>
            </button>
            <p className="text-center text-[11px] text-white/50 font-mono">
              Redirects to Web Player • Works on PC, Mac, Android & iOS
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Switch Note */}
      <div className="mt-8 text-center text-xs text-white/70 max-w-lg mx-auto font-['Google_Sans_Flex'] px-4">
        💡 You can switch between the Cloud Web App, Desktop Edition, and Android App at any time.
      </div>
    </div>
  );
};
