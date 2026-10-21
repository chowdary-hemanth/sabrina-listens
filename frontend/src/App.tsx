import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { UrlBar } from './components/UrlBar';
import { ResourceView } from './components/ResourceView';
import { QueueView } from './components/QueueView';
import { LibraryView } from './components/LibraryView';
import { ArchitectureView } from './components/ArchitectureView';
import { SettingsView } from './components/SettingsView';
import { AudioPlayer, PlayingTrack } from './components/AudioPlayer';
import { useDownloadEvents } from './hooks/useDownloadEvents';
import {
  resolveUrl,
  enqueueDownloads,
  getSettings,
  getRecentUrls,
} from './services/api';
import {
  ResourceResponse,
  SettingsModel,
  RecentUrlItem,
  DownloadJobStatus,
  HistoryItem,
} from './types';
import { History, Music2 } from 'lucide-react';

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'app'>(() => {
    return window.location.hash === '#app' ? 'app' : 'landing';
  });
  const [currentTab, setCurrentTab] = useState<'home' | 'queue' | 'library' | 'architecture' | 'settings'>('home');
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [currentResource, setCurrentResource] = useState<ResourceResponse | null>(null);
  const [isEnqueuing, setIsEnqueuing] = useState(false);
  const [settings, setSettings] = useState<SettingsModel | null>(null);
  const [recentUrls, setRecentUrls] = useState<RecentUrlItem[]>([]);
  const [playingTrack, setPlayingTrack] = useState<PlayingTrack | null>(null);

  const { queueSummary, refreshQueue } = useDownloadEvents();

  // Load settings and recent URLs on mount
  useEffect(() => {
    getSettings().then(setSettings).catch(console.error);
    getRecentUrls().then(setRecentUrls).catch(console.error);

    const onHashChange = () => {
      if (window.location.hash === '#app') {
        setViewMode('app');
      } else if (!window.location.hash) {
        setViewMode('landing');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const handleLaunchCloud = () => {
    setViewMode('app');
    window.location.hash = 'app';
  };

  const handleBackToLanding = () => {
    setViewMode('landing');
    window.location.hash = '';
  };

  const handleResolve = async (url: string) => {
    setIsResolving(true);
    setResolveError(null);
    try {
      const res = await resolveUrl(url);
      setCurrentResource(res);
      setCurrentTab('home');
      getRecentUrls().then(setRecentUrls).catch(console.error);
    } catch (err: any) {
      setResolveError(err.message || 'Failed to resolve URL');
      setCurrentResource(null);
    } finally {
      setIsResolving(false);
    }
  };

  const handleEnqueue = async (trackIds: string[], qualityId: string) => {
    if (!currentResource) return;
    setIsEnqueuing(true);
    try {
      await enqueueDownloads(currentResource.resource_id, trackIds, qualityId);
      refreshQueue();
      setCurrentTab('queue');
    } catch (err: any) {
      alert(err.message || 'Failed to queue downloads');
    } finally {
      setIsEnqueuing(false);
    }
  };

  const handlePlayJob = (job: DownloadJobStatus) => {
    setPlayingTrack({
      id: job.job_id,
      title: job.title,
      artist: job.artist,
      cover_url: job.cover_url,
      audio_url: `/api/stream/${job.job_id}`,
    });
  };

  const handlePlayHistoryItem = (item: HistoryItem) => {
    setPlayingTrack({
      id: item.id,
      title: item.title,
      artist: item.artist,
      cover_url: item.cover_url,
      audio_url: `/api/stream/${item.id}`,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-pink-600 selection:text-white pb-24 relative overflow-x-hidden font-['Jost']">
      {/* Background Animated ASCII Art: Headphones Sound Waves from ASCII Magic */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-center justify-center select-none ascii-bg-container opacity-70">
        <ascii-art piece="headphones-sound-waves" size="14"></ascii-art>
      </div>

      {viewMode === 'landing' ? (
        <LandingView onLaunchCloud={handleLaunchCloud} />
      ) : (
        <>
          {/* Top Navbar */}
          <div className="relative z-20">
            <Navbar
              currentTab={currentTab}
              onSelectTab={setCurrentTab}
              activeDownloadsCount={queueSummary.active_jobs}
              onBackToLanding={handleBackToLanding}
            />
          </div>

          {/* Main Content Area */}
          <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {currentTab === 'home' && (
              <div className="space-y-8 animate-fade-in">
                {/* Hero Header */}
                <div className="text-center space-y-3 pt-2 sm:pt-6">
                  <h1 className="text-4xl sm:text-6xl md:text-7xl font-['Honk'] tracking-wide">
                    SABRINA LISTENS
                  </h1>
                  <p className="text-sm sm:text-base font-['Jost'] text-white max-w-2xl mx-auto">
                    Paste any music link from Spotify, YouTube, or direct audio. Select high-fidelity quality, transcode with FFmpeg, and automatically embed ID3 tags with album art.
                  </p>
                </div>

                <UrlBar
                  onResolve={handleResolve}
                  isLoading={isResolving}
                  error={resolveError}
                />

                {/* Resolved Resource View */}
                {currentResource && (
                  <div className="pt-4">
                    <ResourceView
                      resource={currentResource}
                      onEnqueue={handleEnqueue}
                      isEnqueuing={isEnqueuing}
                    />
                  </div>
                )}

                {/* Recently Processed Links */}
                {!currentResource && recentUrls.length > 0 && (
                  <div className="w-full max-w-4xl mx-auto space-y-3 pt-4">
                    <h3 className="text-xl sm:text-2xl font-['Honk'] tracking-wide text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-pink-500" />
                      <span>RECENTLY PROCESSED LINKS</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-['Google_Sans_Flex',sans-serif]">
                      {recentUrls.slice(0, 6).map((rec, i) => (
                        <button
                          key={i}
                          onClick={() => handleResolve(rec.url)}
                          className="flex items-center gap-3 p-3.5 rounded-2xl bg-black/65 hover:bg-black/80 border border-pink-600/30 hover:border-pink-600 text-left transition-all group shadow-sm backdrop-blur-md"
                        >
                          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/40 flex items-center justify-center">
                            {rec.cover_url ? (
                              <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className="w-5 h-5 text-pink-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                              {rec.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-white/70">
                              <span className="capitalize">{rec.provider}</span>
                              <span>•</span>
                              <span className="capitalize">{rec.resource_type}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Queue Tab */}
            {currentTab === 'queue' && (
              <div className="animate-fade-in">
                <QueueView
                  jobs={queueSummary.jobs}
                  onPlayJob={handlePlayJob}
                  onRefresh={refreshQueue}
                />
              </div>
            )}

            {/* History Tab */}
            {currentTab === 'library' && (
              <div className="animate-fade-in">
                <LibraryView onPlayHistoryItem={handlePlayHistoryItem} />
              </div>
            )}

            {/* Architecture / How it Works Tab */}
            {currentTab === 'architecture' && (
              <div className="animate-fade-in">
                <ArchitectureView />
              </div>
            )}

            {/* Settings Tab (Dedicated Page) */}
            {currentTab === 'settings' && (
              <div className="animate-fade-in">
                <SettingsView
                  settings={settings}
                  onUpdated={(newSettings) => setSettings(newSettings)}
                />
              </div>
            )}
          </main>

          {/* Bottom Sticky Audio Player */}
          <AudioPlayer
            track={playingTrack}
            onClose={() => setPlayingTrack(null)}
          />
        </>
      )}
    </div>
  );
};
