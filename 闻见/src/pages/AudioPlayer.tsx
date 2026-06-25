import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Lock, Loader2, ListMusic, RotateCcw, RotateCw, X, ChevronDown, Headphones } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCourseStudyProgress, getCourseStudyProgressStats, markAudioSectionCompleted, type StudyUnitLike } from '../utils/courseStudyProgress';

interface Course {
  id: string;
  title: string;
  cover: string | null;
  category: string | null;
}

interface Section {
  id: string;
  title: string;
  audio_url: string | null;
  audio_duration: number | null;
  is_preview: boolean | null;
  sort_order: number | null;
  chapter_title?: string;
}

interface ChapterWithSections {
  id: string;
  title: string;
  sort_order: number | null;
  sections: Section[];
}

type PlaybackMode = 'sequence' | 'single-repeat' | 'course-repeat';

interface CoursePlaybackMemory {
  sectionId: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

interface PlaybackMemoryStore {
  lastPlayedCourseId: string | null;
  courses: Record<string, CoursePlaybackMemory>;
}

const PLAYBACK_MEMORY_KEY = 'wenjian-audio-playback-memory-v1';
const PLAYBACK_MEMORY_SAVE_STEP = 5;
const PLAYBACK_MEMORY_COMPLETION_RATIO = 0.95;

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function VinylDisc({ progress, size = 180, isPlaying = false }: { progress: number; size?: number; isPlaying?: boolean }) {
  const r = (size / 2) - 8;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className={isPlaying ? 'animate-spin-slow' : ''}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
      <defs>
        <radialGradient id={`discGrad`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="var(--color-bg-primary)" />
          <stop offset="60%" stopColor="var(--muted)" />
          <stop offset="100%" stopColor="var(--card)" />
        </radialGradient>
        <filter id={`glow`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={`url(#discGrad)`} stroke="var(--color-border)" strokeWidth="1" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        filter={`url(#glow)`}
        style={{ transition: 'stroke-dashoffset 0.2s ease', filter: 'drop-shadow(0 0 4px rgba(184,152,136,0.3))' }} />
      <circle cx={size / 2} cy={size / 2} r={r * 0.18} fill="var(--color-accent)" opacity="0.9" />
      </svg>
    </div>
  );
}

export default function AudioPlayer() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [chapters, setChapters] = useState<ChapterWithSections[]>([]);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [courseUnlocked, setCourseUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistTab, setPlaylistTab] = useState<'courses' | 'chapters'>('courses');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('sequence');
  const [endedCount, setEndedCount] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [restoreHint, setRestoreHint] = useState('');
  const [studyProgressVersion, setStudyProgressVersion] = useState(0);
  const [courseStudyUnits, setCourseStudyUnits] = useState<Record<string, StudyUnitLike[]>>({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadingRef = useRef(false);
  const hasAttemptedInitialRestoreRef = useRef(false);
  const lastSavedTimeRef = useRef(0);
  const playbackRates = [1, 1.25, 1.5, 2];

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const readPlaybackMemory = (): PlaybackMemoryStore => {
    try {
      const raw = window.localStorage.getItem(PLAYBACK_MEMORY_KEY);
      if (!raw) return { lastPlayedCourseId: null, courses: {} };
      const parsed = JSON.parse(raw) as PlaybackMemoryStore;
      return { lastPlayedCourseId: parsed.lastPlayedCourseId || null, courses: parsed.courses || {} };
    } catch { return { lastPlayedCourseId: null, courses: {} }; }
  };

  const writePlaybackMemory = (store: PlaybackMemoryStore) => {
    try { window.localStorage.setItem(PLAYBACK_MEMORY_KEY, JSON.stringify(store)); } catch {}
  };

  const findPlayableSections = useCallback((chapterList: ChapterWithSections[], unlocked: boolean) => {
    return chapterList.flatMap(c => c.sections).filter(s => s.audio_url && (unlocked || s.is_preview));
  }, []);

  const resolveRememberedPlayback = useCallback((
    courseId: string, chapterList: ChapterWithSections[], unlocked: boolean
  ) => {
    const allPlayableSections = findPlayableSections(chapterList, unlocked);
    const fallbackSection = allPlayableSections[0] || null;
    const memory = readPlaybackMemory().courses[courseId];
    if (!memory) return { section: fallbackSection, currentTime: 0, restored: false };
    const currentIndex = allPlayableSections.findIndex(s => s.id === memory.sectionId);
    if (currentIndex === -1) return { section: fallbackSection, currentTime: 0, restored: false };
    const rememberedSection = allPlayableSections[currentIndex];
    const rememberedDuration = memory.duration || rememberedSection.audio_duration || 0;
    const completionRatio = rememberedDuration > 0 ? memory.currentTime / rememberedDuration : 0;
    if (completionRatio >= PLAYBACK_MEMORY_COMPLETION_RATIO) {
      const nextSection = allPlayableSections[currentIndex + 1] || rememberedSection;
      return { section: nextSection, currentTime: nextSection.id === rememberedSection.id ? 0 : 0, restored: nextSection.id !== rememberedSection.id || memory.currentTime > 0 };
    }
    return { section: rememberedSection, currentTime: Math.max(0, Math.min(memory.currentTime || 0, rememberedDuration || memory.currentTime || 0)), restored: true };
  }, [findPlayableSections]);

  const persistPlaybackMemory = useCallback((courseId: string, section: Section, time: number, mediaDuration: number) => {
    if (!courseId || !section.id) return;
    const safeTime = Math.max(0, time);
    const safeDuration = Math.max(mediaDuration || section.audio_duration || 0, 0);
    const store = readPlaybackMemory();
    store.lastPlayedCourseId = courseId;
    store.courses[courseId] = { sectionId: section.id, currentTime: safeTime, duration: safeDuration, updatedAt: Date.now() };
    writePlaybackMemory(store);
    lastSavedTimeRef.current = safeTime;
  }, []);

  useEffect(() => { loadCourses(); hasAttemptedInitialRestoreRef.current = false; }, [user]);

  const checkMembership = async (userId: string): Promise<boolean> => {
    const { data: memberships } = await supabase.from('user_memberships').select('tier, expires_at, is_active').eq('user_id', userId).eq('is_active', true);
    if (!memberships || memberships.length === 0) return false;
    for (const m of memberships) {
      if (m.tier === 'founder' && m.is_active) return true;
      if (m.tier === 'yearly' && m.is_active && m.expires_at && new Date(m.expires_at) > new Date()) return true;
    }
    return false;
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      if (!user) { setCourses([]); setCourseStudyUnits({}); return; }
      const isMember = await checkMembership(user.id);
      let data: any[] | null = null;
      if (isMember) {
        const { data: allCourses } = await supabase.from('courses').select('id, title, cover, category').eq('is_published', true).order('sort_order', { ascending: true });
        data = allCourses;
      } else {
        const { data: userCourses } = await supabase.from('user_courses').select('course_id').eq('user_id', user.id);
        if (!userCourses || userCourses.length === 0) { setCourses([]); return; }
        const unlockedCourseIds = userCourses.map(uc => uc.course_id);
        const { data: fetched } = await supabase.from('courses').select('id, title, cover, category').eq('is_published', true).in('id', unlockedCourseIds).order('sort_order', { ascending: true });
        data = fetched;
      }
      const coursesWithAudio: Course[] = [];
      const nextCourseStudyUnits: Record<string, StudyUnitLike[]> = {};
      for (const course of data || []) {
        const { data: chaptersData } = await supabase.from('chapters').select('id').eq('course_id', course.id).eq('is_published', true);
        if (chaptersData && chaptersData.length > 0) {
          const chapterIds = chaptersData.map(c => c.id);
          const { data: sections } = await supabase.from('sections').select('id, audio_url, content').in('chapter_id', chapterIds).eq('is_published', true);
          if (sections && sections.some(s => s.audio_url)) { coursesWithAudio.push(course); nextCourseStudyUnits[course.id] = sections; }
        }
      }
      setCourses(coursesWithAudio);
      setCourseStudyUnits(nextCourseStudyUnits);
    } catch (err) { console.error('加载课程异常:', err); }
    finally { setLoading(false); }
  };

  const checkCourseAccess = async (courseId: string): Promise<boolean> => {
    if (!user) return false;
    const isMember = await checkMembership(user.id);
    if (isMember) return true;
    const { data } = await supabase.from('user_courses').select('id').eq('user_id', user.id).eq('course_id', courseId).maybeSingle();
    return !!data;
  };

  const loadChapters = async (courseId: string): Promise<{ chapters: ChapterWithSections[]; unlocked: boolean }> => {
    setLoading(true); setError('');
    try {
      const unlocked = await checkCourseAccess(courseId); setCourseUnlocked(unlocked);
      const { data: chaptersData } = await supabase.from('chapters').select('id, title, sort_order').eq('course_id', courseId).eq('is_published', true).order('sort_order', { ascending: true });
      const chapterIds = (chaptersData || []).map(c => c.id);
      const { data: sectionsData } = await supabase.from('sections').select('id, title, audio_url, audio_duration, is_preview, sort_order, chapter_id').in('chapter_id', chapterIds).eq('is_published', true).order('sort_order', { ascending: true });
      const chaptersWithSections: ChapterWithSections[] = (chaptersData || []).map(chapter => ({
        ...chapter, sections: (sectionsData || []).filter(s => s.chapter_id === chapter.id).map(s => ({ ...s, chapter_title: chapter.title }))
      })).filter(c => c.sections.length > 0);
      setChapters(chaptersWithSections);
      return { chapters: chaptersWithSections, unlocked };
    } catch (err) { setError('加载失败，请重试'); return { chapters: [], unlocked: false }; }
    finally { setLoading(false); }
  };

  const handleCourseChange = async (courseId: string, options?: { autoPlay?: boolean; preferMemory?: boolean; showHint?: boolean }) => {
    const autoPlay = options?.autoPlay ?? true;
    const preferMemory = options?.preferMemory ?? true;
    const showHint = options?.showHint ?? false;
    setSelectedCourseId(courseId); setPlaylistTab(courseId ? 'chapters' : 'courses');
    setCurrentSection(null); setIsPlaying(false); setIsAudioLoading(false); setError(''); setRestoreHint('');
    if (audioRef.current) {
      if (selectedCourseId && currentSection) persistPlaybackMemory(selectedCourseId, currentSection, audioRef.current.currentTime, audioRef.current.duration || duration);
      audioRef.current.pause(); audioRef.current.currentTime = 0;
    }
    if (courseId) {
      const result = await loadChapters(courseId);
      const restoredPlayback = preferMemory ? resolveRememberedPlayback(courseId, result.chapters, result.unlocked) : { section: findPlayableSections(result.chapters, result.unlocked)[0] || null, currentTime: 0, restored: false };
      if (restoredPlayback.section) {
        const audio = audioRef.current;
        if (audio && restoredPlayback.section.audio_url) {
          audio.src = restoredPlayback.section.audio_url; audio.volume = isMuted ? 0 : volume; audio.playbackRate = playbackRate;
          audio.currentTime = restoredPlayback.currentTime;
          setCurrentTime(restoredPlayback.currentTime); setCurrentSection(restoredPlayback.section); setIsAudioLoading(autoPlay);
          if (showHint && restoredPlayback.restored) setRestoreHint('已恢复上次播放位置');
          if (autoPlay) { try { await audio.play(); } catch (err) { setIsAudioLoading(false); } }
        }
      }
    } else { setChapters([]); }
  };

  const playSection = useCallback(async (section: Section) => {
    if (!section.audio_url) { setError('该章节暂无音频'); return; }
    if (!courseUnlocked && !section.is_preview) { setError('请先开通课程以收听完整内容'); return; }
    setError('');
    if (audioRef.current && selectedCourseId && currentSection) persistPlaybackMemory(selectedCourseId, currentSection, audioRef.current.currentTime, audioRef.current.duration || duration);
    setCurrentSection(section); setCurrentTime(0); setDuration(0); setIsAudioLoading(true); isLoadingRef.current = true;
    const audio = audioRef.current;
    if (audio) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      audio.src = section.audio_url; audio.volume = isMuted ? 0 : volume; audio.playbackRate = playbackRate;
      loadTimeoutRef.current = setTimeout(() => { if (isLoadingRef.current) { setError('音频加载超时，请检查网络后重试'); setIsAudioLoading(false); isLoadingRef.current = false; } }, 10000);
      try { await audio.play(); } catch (err) {}
    }
  }, [courseUnlocked, currentSection, duration, isMuted, persistPlaybackMemory, playbackRate, selectedCourseId, volume]);

  const playNextSection = useCallback((options?: { loopToStart?: boolean }) => {
    if (!currentSection || chapters.length === 0) return;
    const allSections = chapters.flatMap(c => c.sections);
    const currentIdx = allSections.findIndex(s => s.id === currentSection.id);
    for (let i = currentIdx + 1; i < allSections.length; i++) {
      if (allSections[i].audio_url && (courseUnlocked || allSections[i].is_preview)) { playSection(allSections[i]); return; }
    }
    if (options?.loopToStart) {
      const firstPlayable = allSections.find(s => s.audio_url && (courseUnlocked || s.is_preview));
      if (firstPlayable) { playSection(firstPlayable); return; }
    }
    if (!options?.loopToStart) {
      setError(courseUnlocked ? '已是最后一节' : '后续章节需开通课程');
    }
  }, [currentSection, chapters, courseUnlocked, playSection]);

  const playPrevSection = useCallback(() => {
    if (!currentSection || chapters.length === 0) return;
    const allSections = chapters.flatMap(c => c.sections);
    const currentIdx = allSections.findIndex(s => s.id === currentSection.id);
    for (let i = currentIdx - 1; i >= 0; i--) {
      if (allSections[i].audio_url && (courseUnlocked || allSections[i].is_preview)) { playSection(allSections[i]); return; }
    }
    setError('已是第一节');
  }, [currentSection, chapters, courseUnlocked, playSection]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !currentSection) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { if (isAudioLoading) return; setIsAudioLoading(true); audio.play().then(() => {}).catch(() => { setIsAudioLoading(false); setError('播放失败，请重试'); }); }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pct * duration;
    if (audioRef.current) { audioRef.current.currentTime = newTime; setCurrentTime(newTime); }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value); setVolume(v); setIsMuted(v === 0);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const toggleMute = () => {
    if (isMuted) { setVolume(0.8); setIsMuted(false); if (audioRef.current) audioRef.current.volume = 0.8; }
    else { setVolume(0); setIsMuted(true); if (audioRef.current) audioRef.current.volume = 0; }
  };

  const cyclePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextRate = playbackRates[(currentIndex + 1) % playbackRates.length];
    setPlaybackRate(nextRate); if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  const seekBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), duration);
    audio.currentTime = nextTime; setCurrentTime(nextTime);
  };

  const cyclePlaybackMode = () => {
    setPlaybackMode(m => m === 'sequence' ? 'single-repeat' : m === 'single-repeat' ? 'course-repeat' : 'sequence');
  };

  useEffect(() => {
    audioRef.current = new Audio(); audioRef.current.preload = 'auto';
    const audio = audioRef.current;
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => { if (audio.duration && !isNaN(audio.duration)) setDuration(audio.duration); setIsAudioLoading(false); isLoadingRef.current = false; };
    const handleCanPlay = () => { setIsAudioLoading(false); isLoadingRef.current = false; if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; } };
    const handleEnded = () => { setIsPlaying(false); setEndedCount(c => c + 1); };
    const handleError = (e: Event) => {
      const target = e.target as HTMLAudioElement;
      if (target.error && (target.error.code === 2 || target.error.code === 4)) setError('音频加载失败，请检查网络或稍后重试');
      setIsAudioLoading(false); isLoadingRef.current = false; setIsPlaying(false);
    };
    const handleWaiting = () => { setIsAudioLoading(true); isLoadingRef.current = true; };
    const handlePlaying = () => { setIsAudioLoading(false); isLoadingRef.current = false; setIsPlaying(true); if (loadTimeoutRef.current) { clearTimeout(loadTimeoutRef.current); loadTimeoutRef.current = null; } };
    audio.addEventListener('timeupdate', handleTimeUpdate); audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay); audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError); audio.addEventListener('waiting', handleWaiting); audio.addEventListener('playing', handlePlaying);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate); audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay); audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError); audio.removeEventListener('waiting', handleWaiting); audio.removeEventListener('playing', handlePlaying);
      audio.pause(); if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate; }, [playbackRate]);
  useEffect(() => {
    if (!user || loading || courses.length === 0 || selectedCourseId || hasAttemptedInitialRestoreRef.current) return;
    hasAttemptedInitialRestoreRef.current = true;
    const lastPlayedCourseId = readPlaybackMemory().lastPlayedCourseId;
    if (!lastPlayedCourseId) return;
    if (!courses.some(c => c.id === lastPlayedCourseId)) return;
    handleCourseChange(lastPlayedCourseId, { autoPlay: true, preferMemory: true, showHint: true });
  }, [courses, loading, selectedCourseId, user]);
  useEffect(() => {
    if (endedCount === 0 || !currentSection) return;
    if (playbackMode === 'single-repeat') { playSection(currentSection); return; }
    if (playbackMode === 'course-repeat') { playNextSection({ loopToStart: true }); return; }
    playNextSection();
  }, [endedCount, currentSection, playbackMode, playNextSection, playSection]);
  useEffect(() => { if (!restoreHint) return; const timeout = window.setTimeout(() => setRestoreHint(''), 2200); return () => window.clearTimeout(timeout); }, [restoreHint]);
  useEffect(() => {
    if (!selectedCourseId || !currentSection) return;
    const elapsedSinceSave = Math.abs(currentTime - lastSavedTimeRef.current);
    if (elapsedSinceSave < PLAYBACK_MEMORY_SAVE_STEP) return;
    persistPlaybackMemory(selectedCourseId, currentSection, currentTime, duration);
  }, [currentSection, currentTime, duration, persistPlaybackMemory, selectedCourseId]);
  useEffect(() => {
    if (isPlaying || !selectedCourseId || !currentSection) return;
    persistPlaybackMemory(selectedCourseId, currentSection, currentTime, duration);
  }, [currentSection, currentTime, duration, isPlaying, persistPlaybackMemory, selectedCourseId]);
  useEffect(() => {
    const handleBeforeUnload = () => { if (!audioRef.current || !selectedCourseId || !currentSection) return; persistPlaybackMemory(selectedCourseId, currentSection, audioRef.current.currentTime, audioRef.current.duration || duration); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSection, duration, persistPlaybackMemory, selectedCourseId]);

  const currentStudyProgress = useMemo(() => (selectedCourseId ? getCourseStudyProgress(selectedCourseId) : null), [selectedCourseId, studyProgressVersion]);
  const currentPlaybackMemory = useMemo(() => (selectedCourseId ? readPlaybackMemory().courses[selectedCourseId] || null : null), [selectedCourseId, currentTime, duration]);
  const currentCourseStudyStats = useMemo(() => (selectedCourseId ? getCourseStudyProgressStats(selectedCourseId, chapters.flatMap(c => c.sections)) : null), [chapters, selectedCourseId, studyProgressVersion]);

  useEffect(() => {
    if (!selectedCourseId || !currentSection?.audio_url || !duration || !currentStudyProgress) return;
    const completionRatio = currentTime / duration;
    if (completionRatio < PLAYBACK_MEMORY_COMPLETION_RATIO) return;
    if (currentStudyProgress.audioCompletedSectionIds.includes(currentSection.id)) return;
    markAudioSectionCompleted(selectedCourseId, currentSection.id);
    setStudyProgressVersion(v => v + 1);
  }, [currentSection, currentStudyProgress, currentTime, duration, selectedCourseId]);

  const formatPlaybackRate = (rate: number) => (Number.isInteger(rate) ? `${rate.toFixed(1)}x` : `${rate}x`);
  const canPlay = (section: Section) => !!(section.audio_url && (courseUnlocked || section.is_preview));

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const allCourseSections = chapters.flatMap(c => c.sections);
  const currentChapter = chapters.find(c => c.sections.some(s => s.id === currentSection?.id));
  const currentCourseSectionIndex = allCourseSections.findIndex(s => s.id === currentSection?.id);
  const currentCourseSectionProgress = currentCourseSectionIndex >= 0 && allCourseSections.length > 0 ? `${currentCourseSectionIndex + 1}/${allCourseSections.length}` : '';
  const playbackModeLabel = playbackMode === 'sequence' ? '顺序播' : playbackMode === 'single-repeat' ? '单曲循环' : '课程循环';
  const compactPlaybackModeLabel = playbackMode === 'sequence' ? '顺序' : playbackMode === 'single-repeat' ? '单曲' : '循环';
  const currentSectionMeta = currentChapter ? [currentChapter.title, currentCourseSectionProgress].filter(Boolean).join(' · ') : currentCourseSectionProgress;
  const compactCourseMeta = [selectedCourse?.title, currentSectionMeta].filter(Boolean).join(' · ');
  const currentProgressTone = !currentCourseStudyStats ? '' : currentCourseStudyStats.overallPercent >= 100 ? '已完成' : currentCourseStudyStats.overallPercent >= 70 ? '接近完成' : currentCourseStudyStats.overallPercent >= 30 ? '进行中' : '刚开始';
  const rememberedSection = useMemo(() => chapters.flatMap(c => c.sections).find(s => s.id === currentPlaybackMemory?.sectionId) || null, [chapters, currentPlaybackMemory]);

  const groupedCourses = useMemo(() => {
    const groups = new Map<string, Course[]>();
    courses.forEach(c => { const cat = c.category?.trim() || '未分类'; const bucket = groups.get(cat); if (bucket) bucket.push(c); else groups.set(cat, [c]); });
    return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
  }, [courses]);

  const courseProgressLookup = useMemo(() => {
    const lookup: Record<string, ReturnType<typeof getCourseStudyProgressStats> & { statusLabel: string }> = {};
    courses.forEach(c => {
      const stats = getCourseStudyProgressStats(c.id, courseStudyUnits[c.id] || []);
      const statusLabel = stats.overallPercent >= 100 ? '已完成' : stats.overallCompletedCount > 0 ? '学习中' : '未开始';
      lookup[c.id] = { ...stats, statusLabel };
    });
    return lookup;
  }, [courseStudyUnits, courses, studyProgressVersion]);

  const handleRestartCourse = async () => {
    if (!selectedCourseId) return;
    const firstPlayableSection = findPlayableSections(chapters, courseUnlocked)[0];
    if (!firstPlayableSection) return;
    if (audioRef.current) audioRef.current.currentTime = 0;
    setCurrentTime(0);
    await playSection(firstPlayableSection);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative" style={{ background: 'var(--background)' }}>
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")` }} />

      <main className="relative z-10 w-full max-w-lg mx-auto px-6 pt-2 md:pt-4 pb-8 flex flex-col items-center justify-start">
        {!currentSection ? (
          /* ---------- Empty state ---------- */
          <div className="text-center w-full min-h-[60vh] flex flex-col items-center justify-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} className="w-full">
              <div className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-10" style={{ background: 'var(--muted)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                <Headphones className="w-10 h-10 text-[var(--secondary)]" strokeWidth={1} />
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-secondary)] font-light tracking-widest">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </div>
              ) : courses.length === 0 ? (
                <div>
                  <p className="text-base font-light tracking-wide mb-3 text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-serif)' }}>
                    {!user ? '请先登录以查看课程' : '暂无已开通的课程'}
                  </p>
                  {!user && <p className="text-[10px] tracking-wider text-[var(--text-muted)]">登录后即可收听已购买的课程音频</p>}
                </div>
              ) : (
                <>
                  <p className="text-base font-light tracking-wide mb-10 text-[var(--color-text-secondary)]" style={{ fontFamily: 'var(--font-serif)' }}>
                    选择课程，开始聆听
                  </p>
                  <div className="w-full max-w-xs mx-auto">
                    <select value={selectedCourseId} onChange={e => handleCourseChange(e.target.value)}
                      className="w-full bg-transparent border-b border-[var(--color-border)] focus:border-[var(--secondary)] py-3 px-4 text-sm outline-none cursor-pointer text-center appearance-none transition-colors text-[var(--color-text-primary)] font-light"
                      style={{ fontFamily: 'var(--font-serif)' }}>
                      <option value="">选择一门课程</option>
                      {groupedCourses.map(({ category, items }) => (
                        <optgroup key={category} label={category}>
                          {items.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        ) : (
          /* ---------- Player state ---------- */
          <div className="w-full flex flex-col items-center">
            {/* Error / hint */}
            {error && !isAudioLoading && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center text-xs px-4 py-2.5 rounded-full text-[var(--color-danger)]"
                style={{ background: 'rgba(184,138,138,0.08)' }}>
                {error}
              </motion.div>
            )}
            {restoreHint && !error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-6 text-center text-[11px] px-4 py-2 rounded-full text-[var(--secondary)] font-light tracking-wide"
                style={{ background: 'var(--muted)' }}>
                {restoreHint}
              </motion.div>
            )}

            {/* Loading indicator */}
            {isAudioLoading && (
              <div className="mb-6 flex items-center justify-center gap-2 text-[10px] text-[var(--color-text-secondary)] tracking-widest">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> 加载中...
              </div>
            )}

            {/* --- Vinyl disc + play button --- */}
            <motion.div key={currentSection.id} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-10">
              <VinylDisc progress={progressPercent} size={180} isPlaying={isPlaying && !isAudioLoading} />

              <button onClick={togglePlay} disabled={isAudioLoading}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] rounded-full flex items-center justify-center transition-all duration-500 hover:scale-110 active:scale-95"
                style={{
                  background: 'linear-gradient(145deg, var(--color-bg-primary), var(--card))',
                  boxShadow: 'var(--shadow-md), 0 1px 3px var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.9)',
                }}>
                {isAudioLoading ? <Loader2 className="w-6 h-6 animate-spin text-[var(--secondary)]" /> :
                 isPlaying ? <Pause className="w-6 h-6 text-[var(--secondary)]" /> :
                 <Play className="w-6 h-6 ml-0.5 text-[var(--secondary)]" />}
              </button>
            </motion.div>

            {/* Section title & meta — slide transition */}
            <AnimatePresence mode="wait">
              <motion.button key={currentSection.id} onClick={() => setShowPlaylist(!showPlaylist)}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-center w-full max-w-[320px] mb-8 transition-opacity hover:opacity-70">
                <h2 className="text-xl font-light tracking-wide mb-1.5 text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-serif)' }}>
                  {currentSection.title}
                </h2>
                <p className="text-[10px] tracking-[2px] text-[var(--color-text-secondary)] font-light">
                  {compactCourseMeta}
                  {currentSection.is_preview && !courseUnlocked && <span className="ml-2 text-[var(--secondary)]">· 试听</span>}
                </p>
              </motion.button>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="w-full mb-5">
              <div className="h-[2px] cursor-pointer relative group rounded-full" style={{ background: 'var(--progress-bg)' }}
                onClick={handleSeek}
                onMouseMove={e => { const rect = e.currentTarget.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); setHoverTime(Math.floor(p * duration)); }}
                onMouseLeave={() => setHoverTime(null)}>
                <div className="h-full rounded-full transition-all duration-150" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--color-accent-light), var(--color-accent))' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--secondary)] shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${progressPercent}% - 6px)` }} />
                </div>
                {hoverTime !== null && duration > 0 && (
                  <div className="absolute -top-9 px-2.5 py-1 text-xs rounded-full shadow-lg pointer-events-none z-10 bg-[var(--muted)] text-[var(--color-text-primary)] border border-[var(--color-border)]" style={{ left: `${(hoverTime / duration) * 100}%`, transform: 'translateX(-50%)' }}>
                    {formatTime(hoverTime)}
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 text-[11px] tracking-widest text-[var(--color-text-secondary)] font-light">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Study progress */}
            {currentCourseStudyStats && currentCourseStudyStats.overallTotalCount > 0 && (
              <div className="w-full text-center mb-7">
                <div className="text-[11px] tracking-[1px] text-[var(--color-text-secondary)] font-light">
                  {currentProgressTone} · 学习进度 {currentCourseStudyStats.overallPercent}%
                </div>
                <div className="flex items-center justify-center gap-2 mt-1.5 text-[9px] tracking-[0.6px] text-[var(--text-muted)] font-light overflow-x-auto whitespace-nowrap">
                  {currentPlaybackMemory && rememberedSection && currentPlaybackMemory.currentTime > 3 && (
                    <>
                      <span>上次听到 {formatTime(currentPlaybackMemory.currentTime)}</span>
                      <button onClick={handleRestartCourse} className="text-[var(--secondary)] hover:opacity-70">从头</button>
                      <span className="opacity-30">·</span>
                    </>
                  )}
                  <span>音频 {currentCourseStudyStats.audioPercent}%</span>
                  <span className="opacity-30">·</span>
                  <span>图文 {currentCourseStudyStats.textPercent}%</span>
                </div>
                <div className="mx-auto mt-2 h-[1px] max-w-[108px] rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${currentCourseStudyStats.overallPercent}%`, background: 'var(--color-accent)' }} />
                </div>
              </div>
            )}

            {/* Controls row — staggered entrance */}
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
              className="flex items-center justify-center gap-2 md:gap-3 mb-6 w-full">
              <motion.button variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                onClick={playPrevSection} disabled={isAudioLoading} className="w-10 h-10 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] disabled:opacity-30 transition-colors" title="上一节">
                <SkipBack className="w-5 h-5" />
              </motion.button>
              <motion.button variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                onClick={() => seekBy(-15)} disabled={isAudioLoading}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)' }} title="快退 15 秒">
                <RotateCcw className="w-4 h-4" />
              </motion.button>

              <div className="w-[72px]" />

              <motion.button variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                onClick={() => seekBy(15)} disabled={isAudioLoading}
                className="w-11 h-11 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-all disabled:opacity-30"
                style={{ border: '1px solid var(--color-border)' }} title="快进 15 秒">
                <RotateCw className="w-4 h-4" />
              </motion.button>
              <motion.button variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                onClick={() => playNextSection()} disabled={isAudioLoading} className="w-10 h-10 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] disabled:opacity-30 transition-colors" title="下一节">
                <SkipForward className="w-5 h-5" />
              </motion.button>
            </motion.div>

            {/* Toolbar — staggered */}
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
              className="flex items-center justify-center gap-4 w-full border-t border-[var(--color-border)] pt-5">
              <motion.button variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                onClick={toggleMute} className="text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors" title="静音">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </motion.button>
              <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}>
                <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange}
                  className="w-20 h-[1px] accent-[var(--secondary)] cursor-pointer"
                  style={{ background: 'var(--color-border)', borderRadius: '1px' }} />
              </motion.div>

              <motion.span variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} className="text-[10px] text-[var(--color-border)]">·</motion.span>

              <motion.button variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                onClick={cyclePlaybackRate}
                className="text-[10px] tracking-[1.5px] font-light text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors"
                style={{ fontFamily: 'var(--font-serif)' }}>
                <span>{formatPlaybackRate(playbackRate)}</span>
              </motion.button>

              <motion.span variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} className="text-[10px] text-[var(--color-border)]">·</motion.span>

              <motion.button variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                onClick={cyclePlaybackMode}
                className="text-[10px] tracking-[1.2px] font-light hover:text-[var(--secondary)] transition-colors"
                style={{ fontFamily: 'var(--font-serif)', color: playbackMode === 'sequence' ? 'var(--color-text-secondary)' : 'var(--secondary)' }}>
                <span>{compactPlaybackModeLabel}</span>
              </motion.button>

              <motion.span variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} className="text-[10px] text-[var(--color-border)]">·</motion.span>

              <motion.button variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
                onClick={() => setShowPlaylist(!showPlaylist)}
                className="flex items-center gap-1 text-[10px] tracking-[1.5px] font-light hover:text-[var(--secondary)] transition-colors"
                style={{ color: showPlaylist ? 'var(--secondary)' : 'var(--color-text-secondary)', fontFamily: 'var(--font-serif)' }}>
                <ListMusic className="w-3 h-3" /> 列表
              </motion.button>
            </motion.div>

            {/* Playlist drawer */}
            <AnimatePresence>
              {showPlaylist && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="w-full mt-5 overflow-hidden">
                  <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--muted)', boxShadow: 'inset 0 1px 0 var(--card)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-6">
                        {(['courses', 'chapters'] as const).map(tab => (
                          <button key={tab} onClick={() => setPlaylistTab(tab)}
                            className={`text-xs font-light tracking-widest transition-colors ${playlistTab === tab ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}
                            style={{ fontFamily: 'var(--font-serif)' }}>
                            {tab === 'courses' ? '课程' : '章节'}
                            {playlistTab === tab && <div className="h-[1px] mt-0.5 bg-[var(--secondary)]" />}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setShowPlaylist(false)} className="text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors">
                        <ChevronDown className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="max-h-[42vh] overflow-y-auto space-y-0">
                      {loading && <div className="py-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto text-[var(--secondary)]" /></div>}

                      {!loading && playlistTab === 'courses' && courses.length > 0 && groupedCourses.map(({ category, items }) => (
                        <div key={category} className="mb-4">
                          <p className="text-[10px] tracking-[2px] text-[var(--text-muted)] font-light mb-1.5 px-1">{category}</p>
                          <div className="border-t border-[var(--color-border)]">
                            {items.map(course => {
                              const progress = courseProgressLookup[course.id];
                              const isSelected = selectedCourseId === course.id;
                              return (
                                <button key={course.id} onClick={() => handleCourseChange(course.id)}
                                  className="w-full text-left py-2.5 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--card)]/50">
                                  <div className="flex items-center justify-between px-1">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-light block truncate" style={{ fontFamily: 'var(--font-serif)', color: isSelected ? 'var(--secondary)' : 'var(--color-text-primary)' }}>{course.title}</span>
                                      {progress && progress.overallTotalCount > 0 && (
                                        <span className="text-[9px] tracking-[1px] text-[var(--text-muted)]">{progress.statusLabel} · {progress.overallPercent}%</span>
                                      )}
                                    </div>
                                    {isSelected && <span className="text-[9px] tracking-[1px] text-[var(--secondary)]">当前</span>}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {!loading && playlistTab === 'chapters' && chapters.length > 0 && chapters.map(chapter => (
                        <div key={chapter.id} className="mb-3">
                          <p className="text-[10px] tracking-[2px] text-[var(--secondary)] font-light py-1.5 px-1">{chapter.title}</p>
                          <div className="border-t border-[var(--color-border)]">
                            {chapter.sections.map(section => {
                              const isActive = currentSection?.id === section.id;
                              const playable = canPlay(section);
                              const isCompleted = Boolean(currentStudyProgress?.audioCompletedSectionIds.includes(section.id));
                              return (
                                <div key={section.id}
                                  onClick={() => { if (playable) { playSection(section); setShowPlaylist(false); } }}
                                  className={`py-3 flex items-center justify-between border-b border-[var(--color-border)] transition-colors cursor-pointer ${playable ? 'hover:bg-[var(--card)]/50' : 'opacity-35 cursor-not-allowed'} ${isActive ? 'pl-2 bg-[var(--card)]/30' : ''}`}>
                                  <div className="min-w-0 flex-1 pr-2">
                                    <span className="text-xs font-light block truncate text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-serif)' }}>{section.title}</span>
                                    {!isActive && <span className="text-[9px] tracking-[1px] mt-0.5 block" style={{ color: isCompleted ? 'var(--secondary)' : 'var(--text-muted)' }}>{isCompleted ? '已学完' : '未开始'}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)]" />}
                                    {section.is_preview && !courseUnlocked && <span className="text-[8px] px-1.5 py-0.5 border border-[var(--secondary)]/30 rounded-sm text-[var(--secondary)] tracking-[1px]">试听</span>}
                                    {!playable && <Lock className="w-3 h-3 text-[var(--color-text-secondary)]" />}
                                    {isActive && (isPlaying || isAudioLoading) && (
                                      isAudioLoading ? <Loader2 className="w-3 h-3 animate-spin text-[var(--secondary)]" /> :
                                      <div className="flex items-end gap-[1.5px] h-2.5">
                                        <span className="w-[1.5px] animate-pulse bg-[var(--secondary)]" style={{ height: '40%', animationDelay: '0s' }} />
                                        <span className="w-[1.5px] animate-pulse bg-[var(--secondary)]" style={{ height: '70%', animationDelay: '0.2s' }} />
                                        <span className="w-[1.5px] animate-pulse bg-[var(--secondary)]" style={{ height: '50%', animationDelay: '0.4s' }} />
                                      </div>
                                    )}
                                    {isActive && !isPlaying && !isAudioLoading && <span className="text-[9px] tracking-[1px] text-[var(--secondary)]">当前</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}

                      {!loading && playlistTab === 'courses' && courses.length === 0 && <p className="text-xs py-4 text-center text-[var(--text-muted)] font-light">暂无可选课程</p>}
                      {!loading && playlistTab === 'chapters' && selectedCourseId && chapters.length === 0 && <p className="text-xs py-4 text-center text-[var(--text-muted)] font-light">暂无音频内容</p>}
                      {!loading && playlistTab === 'chapters' && !selectedCourseId && <p className="text-xs py-4 text-center text-[var(--text-muted)] font-light">请先选择课程</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
