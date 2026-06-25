import React, { useRef, useCallback } from 'react';
import { Play, Volume2, VolumeX, ChevronDown, X } from 'lucide-react';

interface AudioControlBarProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isDragging: boolean;
  dragValue: number;
  onToggle: (e: React.MouseEvent) => void;
  onSeekStart: () => void;
  onSeekMove: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSeekEnd: () => void;
  onSeek: (time: number) => void;
  onMuteToggle: (e: React.MouseEvent) => void;
  onMinimize: () => void;
  onClose: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export function VinylIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
      <circle cx="12" cy="12" r="5.5" stroke="currentColor" strokeWidth="0.5" opacity="0.7" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function formatTime(time: number) {
  if (!time || isNaN(time)) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function AudioControlBar({
  isPlaying, currentTime, duration, volume, isMuted, isDragging, dragValue,
  onToggle, onSeekStart, onSeekMove, onSeekEnd, onSeek, onMuteToggle, onMinimize, onClose,
  children,
}: AudioControlBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const displayTime = isDragging ? dragValue : currentTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;
  const circleLength = 2 * Math.PI * 42;
  const circleOffset = circleLength - (progress / 100) * circleLength;

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    onSeek((percentage / 100) * duration);
  }, [duration, onSeek]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[55] flex flex-col items-center pb-16 md:pb-0">
      <div
        className="w-full max-w-lg rounded-t-[28px] overflow-hidden"
        style={{
          background: 'var(--background)',
          boxShadow: 'var(--shadow-md), var(--shadow-sm)',
        }}
      >
        <div className="px-6 pt-5 pb-3">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={onMinimize}
              className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center min-w-0 px-4">
              {children}
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-6 px-2">
            <div className="relative flex-shrink-0">
              <svg width="104" height="104" viewBox="0 0 104 104" className="transform -rotate-90">
                <circle
                  cx="52" cy="52" r="42"
                  fill="none"
                  stroke="var(--color-text-secondary)"
                  strokeWidth="1.5"
                  opacity="0.12"
                />
                <circle
                  cx="52" cy="52" r="42"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={circleLength}
                  strokeDashoffset={circleOffset}
                  style={{ transition: 'stroke-dashoffset 0.15s ease' }}
                />
              </svg>

              <button
                onClick={onToggle}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500"
                style={{
                  background: 'var(--color-accent)',
                  boxShadow: '0 4px 20px rgba(184,152,136,0.4), 0 1px 4px rgba(184,152,136,0.2)',
                  animation: isPlaying ? 'breathe 3s ease-in-out infinite' : 'none',
                }}
              >
                {isPlaying ? (
                  <VinylIcon />
                ) : (
                  <Play className="w-6 h-6 ml-0.5 text-[var(--color-bg-primary)]" />
                )}
              </button>
            </div>

            <div className="flex-1 min-w-0 space-y-4">
              <div
                ref={progressRef}
                onClick={handleProgressClick}
                className="relative h-2 rounded-full cursor-pointer"
                style={{ background: 'var(--progress-bg)' }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, var(--color-accent-light), var(--color-accent))',
                  }}
                />
                <input
                  type="range" min="0" max={duration || 100}
                  value={isDragging ? dragValue : currentTime}
                  onMouseDown={onSeekStart} onTouchStart={onSeekStart}
                  onChange={onSeekMove} onMouseUp={onSeekEnd} onTouchEnd={onSeekEnd}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)] font-light tracking-wider">
                <span>{formatTime(displayTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onMuteToggle}
                  className="w-9 h-9 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors rounded-full"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <div className="flex-1 h-1 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--secondary)]/60 transition-all duration-150"
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="h-1"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--color-accent-light) 30%, var(--color-accent) 70%, transparent)',
            opacity: 0.3,
          }}
        />
      </div>
    </div>
  );
}
