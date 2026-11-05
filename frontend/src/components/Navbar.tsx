import React from 'react';
import {
  ListMusic,
  DownloadCloud,
  History,
  Cpu,
  Settings as SettingsIcon,
  Laptop,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'queue' | 'library' | 'architecture' | 'settings';
  onSelectTab: (tab: 'home' | 'queue' | 'library' | 'architecture' | 'settings') => void;
  activeDownloadsCount: number;
  onBackToLanding?: () => void;
  isCloudMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeDownloadsCount,
  onBackToLanding,
  isCloudMode = false,
}) => {
  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-pink-600/30 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand: Logo Image + SABRINA LISTENS in HONK font */}
          <div
            onClick={() => {
              if (isCloudMode && onBackToLanding) {
                onBackToLanding();
              } else {
                onSelectTab('home');
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none min-w-0"
            title={isCloudMode ? "Return to edition selection" : "Go to Discover"}
          >
            <div className="w-12 h-9 sm:w-16 sm:h-11 rounded-none overflow-hidden border border-pink-500/40 shadow-sm shadow-pink-600/20 group-hover:scale-105 transition-transform bg-black flex items-center justify-center shrink-0 p-0.5">
              <img
                src="/logo.png"
                alt="SABRINA LISTENS"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.jpg';
                }}
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xl sm:text-4xl font-['Honk'] tracking-wide truncate">
                SABRINA LISTENS
              </span>
              {isCloudMode ? (
                <span className="text-[9px] sm:text-[10px] text-pink-400 font-mono tracking-wider -mt-0.5 sm:-mt-1 block">
                  CLOUD WEB EDITION (320 KBPS)
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] text-pink-400 font-mono tracking-wider -mt-0.5 sm:-mt-1 block">
                  DESKTOP & MOBILE EDITION
                </span>
              )}
            </div>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile < md) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <nav className="flex items-center gap-1 sm:gap-2 font-['Jost']">
              <button
                onClick={() => onSelectTab('home')}
                className={
                  currentTab === 'home'
                    ? 'btn-shady-sm px-4 gap-2 text-xs sm:text-sm'
                    : 'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all'
                }
              >
                <ListMusic className="w-4 h-4" />
                <span>Discover</span>
              </button>

              <button
                onClick={() => onSelectTab('queue')}
                className={
                  currentTab === 'queue'
                    ? 'btn-shady-sm px-4 gap-2 text-xs sm:text-sm relative'
                    : 'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all relative'
                }
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Download Queue</span>
                {activeDownloadsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-pink-600 animate-pulse">
                    {activeDownloadsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectTab('library')}
                className={
                  currentTab === 'library'
                    ? 'btn-shady-sm px-4 gap-2 text-xs sm:text-sm'
                    : 'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all'
                }
              >
                <History className="w-4 h-4" />
                <span>History</span>
              </button>

              <button
                onClick={() => onSelectTab('architecture')}
                className={
                  currentTab === 'architecture'
                    ? 'btn-shady-sm px-4 gap-2 text-xs sm:text-sm'
                    : 'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all'
                }
              >
                <Cpu className="w-4 h-4" />
                <span>How it Works</span>
              </button>

              <button
                onClick={() => onSelectTab('settings')}
                className={
                  currentTab === 'settings'
                    ? 'btn-shady-sm px-4 gap-2 text-xs sm:text-sm'
                    : 'flex items-center gap-2 px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all'
                }
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>

            {/* Quick Action: Switch to Desktop / Editions (Cloud mode only) */}
            {isCloudMode && onBackToLanding && (
              <button
                onClick={onBackToLanding}
                title="Switch to Desktop App (.exe) or choose edition"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-900 hover:bg-pink-950 border border-pink-600/40 hover:border-pink-500 text-pink-300 transition-all"
              >
                <Laptop className="w-3.5 h-3.5 text-pink-400" />
                <span>Get Desktop .exe</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-pink-600/35 px-1 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            currentTab === 'home'
              ? 'text-pink-400 font-bold bg-pink-950/40 border border-pink-600/40'
              : 'text-white/65 hover:text-white'
          }`}
        >
          <ListMusic className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Discover</span>
        </button>

        <button
          onClick={() => onSelectTab('queue')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl relative transition-all ${
            currentTab === 'queue'
              ? 'text-pink-400 font-bold bg-pink-950/40 border border-pink-600/40'
              : 'text-white/65 hover:text-white'
          }`}
        >
          <div className="relative">
            <DownloadCloud className="w-5 h-5 mb-0.5" />
            {activeDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold bg-pink-500 text-white flex items-center justify-center animate-pulse">
                {activeDownloadsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Queue</span>
        </button>

        <button
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            currentTab === 'library'
              ? 'text-pink-400 font-bold bg-pink-950/40 border border-pink-600/40'
              : 'text-white/65 hover:text-white'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Library</span>
        </button>

        <button
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            currentTab === 'settings'
              ? 'text-pink-400 font-bold bg-pink-950/40 border border-pink-600/40'
              : 'text-white/65 hover:text-white'
          }`}
        >
          <SettingsIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Settings</span>
        </button>

        <button
          onClick={() => onSelectTab('architecture')}
          className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all ${
            currentTab === 'architecture'
              ? 'text-pink-400 font-bold bg-pink-950/40 border border-pink-600/40'
              : 'text-white/65 hover:text-white'
          }`}
        >
          <Cpu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Arch</span>
        </button>
      </nav>
    </>
  );
};
