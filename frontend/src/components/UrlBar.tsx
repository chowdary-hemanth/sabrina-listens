import React, { useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';

interface UrlBarProps {
  onResolve: (url: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export const UrlBar: React.FC<UrlBarProps> = ({ onResolve, isLoading, error }) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onResolve(inputUrl.trim());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-black/65 border-2 border-pink-600/45 group-focus-within:border-pink-500 rounded-full shadow-2xl shadow-pink-950/40 p-2 transition-all duration-300 backdrop-blur-md">
          <div className="pl-4 pr-2 text-pink-500">
            <Search className="w-5 h-5 group-focus-within:text-pink-400 transition-colors" />
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Paste Spotify track, album, playlist, artist URL, or YouTube / direct audio link..."
            disabled={isLoading}
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none px-2 py-2 font-['Jost'] font-medium"
          />

          <div className="flex items-center gap-2 pr-1">
            {inputUrl && (
              <button
                type="button"
                onClick={() => setInputUrl('')}
                className="p-1.5 text-white/60 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-shady px-7 text-sm gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>SEARCHING...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 stroke-[2.5]" />
                  <span>SEARCH</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Error alert banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-pink-950/45 border border-pink-600/60 text-white text-sm animate-fade-in backdrop-blur-md">
          <AlertCircle className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
          <div className="space-y-1 font-['Jost']">
            <p className="font-bold text-pink-400">Recognition Error</p>
            <p className="text-white/90">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
};
