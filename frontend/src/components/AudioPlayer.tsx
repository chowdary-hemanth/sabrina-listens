import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Music } from 'lucide-react';

export interface PlayingTrack {
  id: string;
  title: string;
  artist: string;
  cover_url?: string | null;
  audio_url: string;
}

interface AudioPlayerProps {
  track: PlayingTrack | null;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, onClose }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (track && audioRef.current) {
      audioRef.current.src = track.audio_url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [track]);

  if (!track) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-t border-pink-600/35 px-4 py-3 shadow-2xl">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Track Info in Google Sans Flex */}
        <div className="flex items-center gap-3 w-1/4 min-w-[160px] font-['Google_Sans_Flex',sans-serif]">
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-black border border-pink-600/40">
            {track.cover_url ? (
              <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-5 h-5 text-pink-500" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h5 className="font-bold text-sm text-white truncate">{track.title}</h5>
            <p className="text-xs text-white/70 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Center Playback Controls */}
        <div className="flex-1 max-w-xl flex flex-col items-center gap-1.5 font-['Jost']">
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="btn-shady w-11 h-11 p-0 rounded-full"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>
          </div>

          {/* Scrub Bar */}
          <div className="w-full flex items-center gap-2 text-[11px] font-mono text-white/60">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-black border border-pink-600/30 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right Volume & Close */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={toggleMute} className="text-white/80 hover:text-white">
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-pink-500" /> : <Volume2 className="w-4 h-4 text-pink-500" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1.5 bg-black border border-pink-600/30 rounded-lg appearance-none cursor-pointer accent-pink-600"
            />
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            title="Close player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
