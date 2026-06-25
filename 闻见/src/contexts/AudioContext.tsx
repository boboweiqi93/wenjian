import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioUrl: string | null;
  title: string | null;
  isDragging: boolean;
  buffered: number;
  sourceType: 'article' | 'course' | null;
  sourceId: string | null;
}

interface AudioContextType extends AudioState {
  audioRef: React.RefObject<HTMLAudioElement>;
  play: (url: string, title: string, sourceType?: 'article' | 'course', sourceId?: string) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  updateCurrentTime: (time: number) => void;
  updateDuration: (duration: number) => void;
  setIsDragging: (isDragging: boolean) => void;
  reset: () => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [sourceType, setSourceType] = useState<'article' | 'course' | null>(null);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!audioRef.current && !isInitialized) {
      const audio = new Audio();
      audio.preload = 'auto';
      audioRef.current = audio;
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleProgress = () => {
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isInitialized]);

  const play = useCallback(async (url: string, newTitle: string, newSourceType?: 'article' | 'course', newSourceId?: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audioUrl !== url) {
      audio.src = url;
      audio.preload = 'auto';
      setAudioUrl(url);
      setTitle(newTitle);
      setCurrentTime(0);
      setBuffered(0);
      setSourceType(newSourceType || null);
      setSourceId(newSourceId || null);
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Audio play error:', error);
    }
  }, [audioUrl]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (isPlaying) {
      pause();
    } else if (audio && audioUrl) {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error('Audio toggle play error:', error);
      });
    }
  }, [isPlaying, audioUrl, pause]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.readyState >= 2) {
      audio.currentTime = time;
      setCurrentTime(time);
    } else {
      const handleCanPlay = () => {
        audio.currentTime = time;
        setCurrentTime(time);
      };
      audio.addEventListener('canplay', handleCanPlay, { once: true });
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = newVolume;
    }
    setVolumeState(newVolume);
  }, []);

  const updateCurrentTime = useCallback((time: number) => {
    if (!isDragging) {
      setCurrentTime(time);
    }
  }, [isDragging]);

  const updateDuration = useCallback((newDuration: number) => {
    setDuration(newDuration);
  }, []);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioUrl(null);
    setTitle(null);
    setBuffered(0);
    setSourceType(null);
    setSourceId(null);
    setIsExpanded(false);
  }, []);

  return (
    <AudioContext.Provider
      value={{
        isPlaying,
        currentTime,
        duration,
        volume,
        audioUrl,
        title,
        isDragging,
        buffered,
        sourceType,
        sourceId,
        audioRef,
        play,
        pause,
        toggle,
        seek,
        setVolume,
        updateCurrentTime,
        updateDuration,
        setIsDragging,
        reset,
        isExpanded,
        setIsExpanded,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
