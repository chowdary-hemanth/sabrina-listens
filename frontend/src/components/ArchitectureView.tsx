import React from 'react';
import {
  ShieldCheck,
  Search,
  Sliders,
  Radio,
  Cpu,
  Tags,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in font-['Jost']">
      {/* Title Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-5xl font-['Honk'] tracking-wide">
          HOW IT WORKS
        </h2>
        <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto">
          A high-performance, two-tier local architecture designed for zero cloud billing, extreme privacy, and authentic high-fidelity audio transcoding.
        </p>
      </div>

      {/* 6-Stage Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Step 1 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              01
            </span>
            <ShieldCheck className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">URL Parsing & SSRF Guard</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Inbound URLs are sanitized, stripped of tracking parameters (<code className="text-pink-400">?si=...</code>), and passed through an SSRF security layer blocking loopback, internal subnets, and cloud metadata before network dispatch.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              02
            </span>
            <Search className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">Metadata Resolution</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Extracts rich metadata (track title, artist catalog, album art, release year, track numbering, explicit tags) from Spotify tracks, albums, and playlists using unauthenticated open scraping without requiring paid API keys.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              03
            </span>
            <Sliders className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">Bitrate & Format Selector</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Users select preferred target qualities: MP3 320k, 256k, 192k, AAC, or FLAC. The UI maintains complete honesty by alerting the user if transcoding exceeds the native source bitrate without fabricating quality claims.
          </p>
        </div>

        {/* Step 4 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              04
            </span>
            <Radio className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">Audio Stream Matcher</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Resolves authorized high-fidelity audio streams for Spotify songs via matching search algorithms and yt-dlp stream extraction, measuring exact source bitrate and size before download.
          </p>
        </div>

        {/* Step 5 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              05
            </span>
            <Cpu className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">FFmpeg Audio Engine</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Transcodes the audio file using safe subprocess arguments directly into the user's desired format (libmp3lame with CBR 320k, AAC, or FLAC), reporting live conversion health and handling errors gracefully.
          </p>
        </div>

        {/* Step 6 */}
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-5 space-y-3 hover:border-pink-600 transition-all shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="w-8 h-8 rounded-full bg-pink-600/20 text-pink-400 border border-pink-600/40 flex items-center justify-center font-bold text-xs">
              06
            </span>
            <Tags className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-xl font-['Honk'] text-white">ID3 Tagging & Cover Art</h3>
          <p className="text-xs text-white/90 leading-relaxed">
            Embeds full ID3v2 tags (Title, Artist, Album, Year, Track number) and high-resolution cover artwork into the audio container with mutagen, saving to a sanitized directory structure: <code className="text-pink-400">Artist / Album / [Track] - Title.mp3</code>.
          </p>
        </div>
      </div>

      {/* Zero Cost & Local Privacy Highlights */}
      <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/40 p-6 sm:p-8 space-y-5 shadow-2xl">
        <h3 className="text-2xl sm:text-3xl font-['Honk'] text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-pink-500" />
          <span>ZERO COST & PRIVATE LOCAL ARCHITECTURE</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-white/90 leading-relaxed">
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Runs 100% on Your Machine: </strong>
                All downloads, conversions, and tagging happen directly on your local computer CPU.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Zero Server Invoices: </strong>
                No paid Spotify developer accounts, no paid proxy services, and no billable cloud functions required.
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">No Telemetry or User Tracking: </strong>
                Your download history is saved in a local SQLite file (<code className="text-pink-400">sabrina_listens.db</code>) on your own device.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Offline Playback & Direct Access: </strong>
                Integrated HTML5 browser audio player with instant "Open Folder" action in Windows Explorer.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
