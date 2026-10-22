import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  FolderOpen,
  Music,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { getHistory, clearHistory, openContainingFolder } from '../services/api';

interface LibraryViewProps {
  isCloudMode?: boolean;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ isCloudMode = false }) => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deleteFilesOnClear, setDeleteFilesOnClear] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const items = await getHistory(searchQuery, statusFilter);
      setHistoryItems(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [searchQuery, statusFilter]);

  const handleClearHistory = async () => {
    try {
      await clearHistory(deleteFilesOnClear);
      setShowClearConfirm(false);
      fetchHistory();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenFolder = async (id: string) => {
    try {
      await openContainingFolder(id);
    } catch (e) {
      console.error(e);
    }
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header card with Search and Clear History button */}
      <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl sm:text-5xl font-['Honk'] tracking-wide flex items-center gap-2">
              <HistoryIcon className="w-7 h-7 text-pink-500" />
              <span>DOWNLOAD HISTORY</span>
            </h2>
            <p className="text-xs sm:text-sm font-['Jost'] text-white/80 pt-1">
              Browse downloaded tracks, play offline music, and open target folders
            </p>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="btn-shady-sm px-5 gap-1.5 self-start sm:self-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR HISTORY</span>
          </button>
        </div>

        {/* Search & Filter row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 font-['Jost']">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-pink-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by song title, artist, or album..."
              className="w-full bg-black/60 border border-pink-600/40 rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-pink-500 transition-colors font-['Google_Sans_Flex',sans-serif]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-black/60 border border-pink-600/40 rounded-full px-5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-pink-500 w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black/90 border-2 border-pink-600/60 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 font-['Jost']">
            <h3 className="text-2xl font-['Honk'] text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-pink-500" />
              <span>CLEAR DOWNLOAD HISTORY</span>
            </h3>
            <p className="text-sm text-white/90">
              Are you sure you want to clear your download history logs?
            </p>

            <label className="flex items-center gap-2 text-xs text-white/90 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={deleteFilesOnClear}
                onChange={(e) => setDeleteFilesOnClear(e.target.checked)}
                className="rounded border-pink-600 text-pink-600 focus:ring-pink-500 accent-pink-600"
              />
              <span>Also delete completed audio files from computer disk</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="btn-shady-sm px-5"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List in Google Sans Flex */}
      {isLoading ? (
        <div className="text-center py-16 bg-black/45 backdrop-blur-md rounded-3xl border border-dashed border-pink-600/30 p-8 font-['Jost']">
          <div className="w-8 h-8 border-2 border-pink-600/30 border-t-pink-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-white/70">Loading history records...</p>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-16 bg-black/45 backdrop-blur-md rounded-3xl border border-dashed border-pink-600/30 p-8 font-['Jost']">
          <HistoryIcon className="w-12 h-12 text-pink-500/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No items found</h3>
          <p className="text-xs text-white/70 mt-1">
            Downloaded audio files will be indexed and listed here.
          </p>
        </div>
      ) : (
        <div className="bg-black/65 backdrop-blur-md rounded-3xl border border-pink-600/35 overflow-hidden shadow-xl divide-y divide-pink-600/20 font-['Google_Sans_Flex',sans-serif]">
          {historyItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 px-6 py-4 hover:bg-pink-600/10 transition-colors group"
            >
              {/* Artwork */}
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/40">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-pink-500" />
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{item.title}</h4>
                <p className="text-xs text-white/70 truncate">
                  {item.artist} {item.album ? `• ${item.album}` : ''}
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-white/60 font-mono">
                  <span className="uppercase text-pink-400 font-bold">{item.quality_id}</span>
                  {item.file_size_bytes && (
                    <>
                      <span>•</span>
                      <span>{formatFileSize(item.file_size_bytes)}</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDate(item.completed_at)}</span>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center gap-3">
                {item.status === 'completed' ? (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-pink-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-pink-500" />
                    <span>Saved</span>
                  </span>
                ) : (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-pink-400 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-pink-500" />
                    <span>Failed</span>
                  </span>
                )}

                {item.status === 'completed' && (
                  <>
                    {/* Cloud Mode: Save button (manual browser download) */}
                    {isCloudMode && (
                      <a
                        href={`/api/download-file/${item.id}`}
                        download
                        className="btn-shady-sm px-3 gap-1.5"
                        title="Save audio file to your device"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </a>
                    )}

                    {/* Desktop (.exe) Mode: Folder button (already auto-saved to PC) */}
                    {!isCloudMode && (
                      <button
                        onClick={() => handleOpenFolder(item.id)}
                        className="btn-shady-secondary-sm px-3.5 gap-1.5"
                        title="Reveal in folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-pink-400" />
                        <span>Folder</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
