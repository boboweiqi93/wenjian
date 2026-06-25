import React, { useEffect, useState, useCallback } from 'react';
import { Headphones, ListMusic } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';
import AudioControlBar, { VinylIcon } from './AudioControlBar';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  sourceType?: 'article' | 'course';
  sourceId?: string;
}

export default function AudioPlayer({ audioUrl, title, sourceType, sourceId }: AudioPlayerProps) {
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    audioUrl: currentAudioUrl,
    audioRef,
    isDragging,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    setIsDragging,
    updateCurrentTime,
    updateDuration,
    isExpanded,
    setIsExpanded,
  } = useAudio();

  const [isMuted, setIsMuted] = useState(false);
  const [dragValue, setDragValue] = useState(0);
  const isCurrentAudio = currentAudioUrl === audioUrl;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => updateCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => { if (audio.duration && !isNaN(audio.duration)) updateDuration(audio.duration); };
    const handleDurationChange = () => { if (audio.duration && !isNaN(audio.duration)) updateDuration(audio.duration); };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);
    if (audio.duration && !isNaN(audio.duration)) updateDuration(audio.duration);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [audioRef, updateCurrentTime, updateDuration]);

  const handlePlayPause = useCallback(() => {
    if (isCurrentAudio) { toggle(); }
    else { play(audioUrl, title, sourceType, sourceId); }
  }, [isCurrentAudio, audioUrl, title, sourceType, sourceId, play, toggle]);

  const handleSeekStart = useCallback(() => { setIsDragging(true); setDragValue(currentTime); }, [currentTime, setIsDragging]);
  const handleSeekMove = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setDragValue(parseFloat(e.target.value)); }, []);
  const handleSeekEnd = useCallback(() => { seek(dragValue); setIsDragging(false); }, [dragValue, seek, setIsDragging]);

  const toggleMute = () => {
    if (isMuted) { setVolume(1); setIsMuted(false); }
    else { setVolume(0); setIsMuted(true); }
  };

  const handleCloseAudio = () => { pause(); setIsExpanded(false); };
  const handleBarToggle = useCallback((_e: React.MouseEvent) => { handlePlayPause(); }, [handlePlayPause]);
  const handleBarMuteToggle = useCallback((_e: React.MouseEvent) => { toggleMute(); }, [toggleMute]);
  const handleBarClose = useCallback((_e: React.MouseEvent) => { handleCloseAudio(); }, [handleCloseAudio]);

  const handleBottomButtonClick = () => {
    if (isCurrentAudio) {
      setIsExpanded(true);
      if (!isPlaying) toggle();
    } else {
      play(audioUrl, title, sourceType, sourceId);
      setIsExpanded(true);
    }
  };

  const isActive = isCurrentAudio && isPlaying;

  return (
    <>
      {!isExpanded && (
        <div className="fixed bottom-20 right-20 z-[40]">
          <button
            onClick={handleBottomButtonClick}
            className="relative group"
            aria-label="打开音频播放器"
          >
            <div
              className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'radial-gradient(circle, rgba(184,152,136,0.2) 0%, transparent 70%)',
                transform: 'scale(1.8)',
              }}
            />
            <div
              className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-105' : ''}`}
              style={{
                background: isActive
                  ? 'var(--color-accent)'
                  : 'var(--muted)',
                border: isActive
                  ? 'none'
                  : '1px solid var(--color-accent)',
                boxShadow: isActive
                  ? '0 4px 20px rgba(184,152,136,0.5), 0 1px 4px rgba(184,152,136,0.3)'
                  : 'var(--shadow-sm)',
                animation: isActive ? 'breathe 3s ease-in-out infinite' : 'none',
              }}
            >
              {isActive ? (
                <VinylIcon />
              ) : (
                <Headphones className="w-5 h-5 text-[var(--secondary)]" />
              )}
            </div>

            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 transition-opacity duration-300"
              style={{
                background: 'var(--color-bg-primary)',
                borderColor: 'var(--color-accent)',
                opacity: isCurrentAudio ? 1 : 0,
              }}
            />
          </button>
        </div>
      )}

      {isExpanded && (
        <AudioControlBar
          isPlaying={isCurrentAudio && isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isDragging={isDragging}
          dragValue={dragValue}
          onToggle={handleBarToggle}
          onSeekStart={handleSeekStart}
          onSeekMove={handleSeekMove}
          onSeekEnd={handleSeekEnd}
          onSeek={seek}
          onMuteToggle={handleBarMuteToggle}
          onMinimize={() => setIsExpanded(false)}
          onClose={handleBarClose}
        >
          <div className="flex items-center justify-center gap-2">
            <ListMusic className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
            <span
              className="text-sm font-light tracking-wide truncate"
              style={{
                fontFamily: 'var(--font-serif)',
                color: 'var(--color-text-primary)',
              }}
            >
              {title}
            </span>
          </div>
        </AudioControlBar>
      )}
    </>
  );
}
