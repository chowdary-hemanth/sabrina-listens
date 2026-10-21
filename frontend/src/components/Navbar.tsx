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
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  activeDownloadsCount,
  onBackToLanding,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-pink-600/30 bg-black/65 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 py-2 flex items-center justify-between">
        {/* Brand: Logo Image + SABRINA LISTENS in HONK font */}
        <div 
          onClick={() => {
            if (onBackToLanding) {
              onBackToLanding();
            } else {
              onSelectTab('home');
            }
          }}
          className="flex items-center gap-3 cursor-pointer group select-none"
          title="Return to edition selection"
        >
          <div className="w-12 h-12 rounded-none overflow-hidden border-2 border-pink-600 shadow-lg shadow-pink-600/40 group-hover:scale-105 transition-transform bg-black flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="SABRINA LISTENS"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/logo.jpg';
              }}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl sm:text-4xl font-['Honk'] tracking-wide">
              SABRINA LISTENS
            </span>
            <span className="text-[10px] text-pink-400 font-mono tracking-wider -mt-1 hidden sm:inline">
              CLOUD WEB EDITION (320 KBPS)
            </span>
          </div>
        </div>

        {/* Navigation Tabs + Desktop App Switcher */}
        <div className="flex items-center gap-2 sm:gap-4">
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
              <span className="hidden sm:inline">How it Works</span>
              <span className="sm:hidden">Arch</span>
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

          {/* Quick Action: Switch to Desktop / Editions */}
          {onBackToLanding && (
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
  );
};
