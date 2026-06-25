import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudio } from '../contexts/AudioContext';
import AudioControlBar from './AudioControlBar';

export default function GlobalAudioIndicator() {
  const {
    isPlaying, title, audioUrl, sourceType, sourceId,
    currentTime, duration, volume, isDragging,
    toggle, reset, seek, setVolume, setIsDragging,
    updateCurrentTime, updateDuration, audioRef,
    isExpanded, setIsExpanded,
  } = useAudio();
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [dragValue, setDragValue] = useState(0);

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

  const handleNavigate = useCallback(() => {
    if (sourceType && sourceId) {
      navigate(sourceType === 'article' ? `/article/${sourceId}` : `/course/${sourceId}`);
    }
  }, [sourceType, sourceId, navigate]);

  const handleClose = useCallback((e: React.MouseEvent) => { e.stopPropagation(); reset(); }, [reset]);
  const handleToggle = useCallback((e: React.MouseEvent) => { e.stopPropagation(); toggle(); }, [toggle]);
  const handleSeekStart = useCallback(() => { setIsDragging(true); setDragValue(currentTime); }, [currentTime, setIsDragging]);
  const handleSeekMove = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setDragValue(parseFloat(e.target.value)); }, []);
  const handleSeekEnd = useCallback(() => { seek(dragValue); setIsDragging(false); }, [dragValue, seek, setIsDragging]);
  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMuted) { setVolume(1); setIsMuted(false); }
    else { setVolume(0); setIsMuted(true); }
  }, [isMuted, setVolume]);

  if (!audioUrl) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {isExpanded ? (
        <AudioControlBar
          isPlaying={isPlaying} currentTime={currentTime} duration={duration}
          volume={volume} isMuted={isMuted} isDragging={isDragging} dragValue={dragValue}
          onToggle={handleToggle} onSeekStart={handleSeekStart} onSeekMove={handleSeekMove}
          onSeekEnd={handleSeekEnd} onSeek={seek} onMuteToggle={toggleMute}
          onMinimize={() => setIsExpanded(false)} onClose={handleClose}
        >
          <button
            onClick={handleNavigate}
            className="text-sm font-light tracking-wide truncate max-w-[240px] hover:opacity-70 transition-opacity"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-text-primary)' }}
          >
            {title || '未知音频'}
          </button>
        </AudioControlBar>
      ) : (
        <div className="fixed top-20 left-4 z-50">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: isPlaying
                ? 'var(--color-accent)'
                : 'var(--muted)/90',
              backdropFilter: 'blur(12px)',
              boxShadow: isPlaying
                ? '0 4px 20px rgba(184,152,136,0.4), 0 1px 4px rgba(184,152,136,0.2)'
                : 'var(--shadow-sm)',
              border: isPlaying ? 'none' : '1px solid var(--color-border)',
              animation: isPlaying ? 'breathe 3s ease-in-out infinite' : 'none',
            }}
          >
            <span
              className="text-xs font-light tracking-wider truncate max-w-[120px]"
              style={{
                color: isPlaying ? 'var(--color-bg-primary)' : 'var(--color-text-secondary)',
              }}
            >
              {title || '未知音频'}
            </span>

            <div className="relative flex-shrink-0">
              <div
                className="w-6 h-6 rounded-full"
                style={{
                  background: isPlaying ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
                }}
              />
              {isPlaying && (
                <svg
                  className="absolute inset-0 w-6 h-6 -rotate-90"
                  viewBox="0 0 24 24"
                >
                  <circle
                    cx="12" cy="12" r="9"
                    fill="none"
                    stroke="rgba(255,255,255,0.6)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 9}
                    strokeDashoffset={2 * Math.PI * 9 * (1 - progress / 100)}
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
              )}
            </div>

            {!isPlaying && (
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-accent)' }} />
            )}
          </button>
        </div>
      )}
    </>
  );
}
