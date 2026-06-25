import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { CornerUpLeft, Loader2, ChevronRight, ChevronDown, BookOpen, ChevronLeft, Eye, Lock, CheckCircle, Menu, X, Users, Unlock } from 'lucide-react';
import ByteMdViewer from '../components/ByteMdViewer';
import AudioPlayer from '../components/AudioPlayer';
import { useAudio } from '../contexts/AudioContext';
import PurchaseModal from '../components/PurchaseModal';
import { ContentSkeleton, NotFoundState } from '../components/StateComponents';
import { getCourseStudyProgress, getCourseStudyProgressStats, hasTextContent, markTextSectionCompleted, setLastTextSection } from '../utils/courseStudyProgress';

interface Course {
  id: string;
  title: string;
  short_name: string | null;
  description: string | null;
  content: string | null;
  cover: string | null;
  points_price: number | null;
  purchase_url: string | null;
  has_preview: boolean | null;
  author_name: string | null;
  author_bio: string | null;
  students_count: number | null;
  status: string | null;
  audio_url: string | null;
}

interface Chapter {
  id: string;
  title: string;
  sort_order: number | null;
  sections: Section[];
}

interface Section {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  sort_order: number | null;
  is_preview: boolean | null;
  audio_url: string | null;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, refreshUserData } = useAuth();
  const { setIsExpanded } = useAudio();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [isPurchased, setIsPurchased] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [membershipTier, setMembershipTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'confirm' | 'insufficient' | 'xiaohongshu' | 'points-only'>('confirm');
  const [studyProgressVersion, setStudyProgressVersion] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
    };
    checkMobile();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const mobile = window.innerWidth < 1024;
        setIsMobile(mobile);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      fetchCourseData();
    }
  }, [id, user]);

  const getCoverUrl = (cover: string | null): string | null => {
    if (!cover) return null;
    if (cover.startsWith('http')) return cover;
    const { data } = supabase.storage.from('covers').getPublicUrl(cover);
    return data?.publicUrl || null;
  };

  const fetchCourseData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (courseError) {
        console.error('获取课程失败:', courseError);
        setCourse(null);
        setLoading(false);
        return;
      }
      if (!courseData) {
        console.log('课程数据为空');
        setCourse(null);
        setLoading(false);
        return;
      }
      if (courseData) {
        const coverUrl = getCoverUrl(courseData.cover);
        setCourse({ ...courseData, cover: coverUrl });
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('*')
          .eq('course_id', id)
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, chapter_id, title, content, sort_order, is_preview, audio_url')
          .eq('is_published', true)
          .order('sort_order', { ascending: true });
        const chaptersWithSections = (chaptersData || []).map(ch => ({
          ...ch,
          sections: (sectionsData || []).filter(s => s.chapter_id === ch.id)
        }));
        setChapters(chaptersWithSections);
        let purchaseData = null;
        let accessGranted = false;
        let memberTier: string | null = null;
        if (user?.id) {
          // 1. 检查会员权限
          const { data: memberships } = await supabase
            .from('user_memberships')
            .select('tier, expires_at, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (memberships && memberships.length > 0) {
            for (const m of memberships) {
              if (m.tier === 'founder' && m.is_active) {
                accessGranted = true;
                memberTier = 'founder';
                break;
              }
              if (m.tier === 'yearly' && m.is_active && m.expires_at && new Date(m.expires_at) > new Date()) {
                accessGranted = true;
                memberTier = 'yearly';
                break;
              }
            }
          }

          // 2. 检查单课购买
          const { data: pd } = await supabase
            .from('user_courses')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .maybeSingle();
          purchaseData = pd;
          setIsPurchased(!!purchaseData);
          if (purchaseData) accessGranted = true;
        }
        setHasAccess(accessGranted);
        setMembershipTier(memberTier);
        if (accessGranted) {
          if (isMobile) {
            setExpandedChapters(new Set());
          } else {
            const allChapterIds = new Set(chaptersWithSections.map((ch: Chapter) => ch.id));
            setExpandedChapters(allChapterIds);
          }
          const firstSection = getFirstSection(chaptersWithSections);
          const rememberedSectionId = getCourseStudyProgress(id).lastTextSectionId;
          const rememberedSection = rememberedSectionId
            ? chaptersWithSections.flatMap((chapter: Chapter) => chapter.sections).find((section: Section) => section.id === rememberedSectionId) || null
            : null;
          if (rememberedSection) {
            setCurrentSection(rememberedSection);
          } else if (firstSection) {
            setCurrentSection(firstSection);
          }
        }
      } else {
        setCourse(null);
      }
    } catch (err) {
      setCourse(null);
    }
    setLoading(false);
  };

  const handlePurchaseClick = () => {
    if (!course || !userData) return;
    const price = course.points_price || 0;
    if ((userData.points || 0) < price) {
      setModalMode('insufficient');
    } else {
      setModalMode('confirm');
    }
    setModalOpen(true);
  };

  const handleBuyClick = () => {
    if (!course) return;
    if (course.purchase_url) {
      setModalMode('xiaohongshu');
    } else {
      setModalMode('points-only');
    }
    setModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!course || !userData || !user?.id) return;
    const price = course.points_price || 0;
    setPurchasing(true);
    const { error: purchaseError } = await supabase.from('user_courses').insert({
      user_id: user.id,
      course_id: course.id,
      points_spent: price,
    });
    if (purchaseError) {
      setError('购买失败，请重试');
    } else {
      await supabase.from('users').update({ points: (userData.points || 0) - price }).eq('id', user.id);
      await supabase.from('courses').update({ students_count: (course.students_count || 0) + 5 }).eq('id', course.id);
      await refreshUserData();
      setIsPurchased(true);
    }
    setPurchasing(false);
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => {
      if (prev.has(chapterId)) {
        return new Set();
      }
      return new Set([chapterId]);
    });
  };

  const selectSection = (section: Section) => {
    setError('');
    setCurrentSection(section);
    if (id) {
      setLastTextSection(id, section.id);
      setStudyProgressVersion((version) => version + 1);
    }
    setIsExpanded(false);
    const chapter = chapters.find(ch => ch.id === section.chapter_id);
    if (chapter) {
      setExpandedChapters(prev => new Set([...prev, chapter.id]));
    }
    if (isMobile) setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getFirstSection = (chaptersData: Chapter[]): Section | null => {
    if (!chaptersData || chaptersData.length === 0) return null;
    const sortedChapters = [...chaptersData].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    for (const chapter of sortedChapters) {
      if (chapter.sections && chapter.sections.length > 0) {
        const sortedSections = [...chapter.sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        return sortedSections[0];
      }
    }
    return null;
  };

  const getAllSections = () => {
    const allSections: Section[] = [];
    chapters.forEach(chapter => {
      chapter.sections.forEach(section => {
        allSections.push(section);
      });
    });
    return allSections.sort((a, b) => {
      const chapterA = chapters.find(ch => ch.id === a.chapter_id);
      const chapterB = chapters.find(ch => ch.id === b.chapter_id);
      if (chapterA?.sort_order !== chapterB?.sort_order) {
        return (chapterA?.sort_order || 0) - (chapterB?.sort_order || 0);
      }
      return (a.sort_order || 0) - (b.sort_order || 0);
    });
  };

  const allSections = useMemo(() => getAllSections(), [chapters]);
  const courseStudyProgress = useMemo(() => (id ? getCourseStudyProgress(id) : null), [id, studyProgressVersion]);
  const courseStudyStats = useMemo(() => (id ? getCourseStudyProgressStats(id, allSections) : null), [allSections, id, studyProgressVersion]);
  const currentTextCompleted = Boolean(currentSection && courseStudyProgress?.textCompletedSectionIds.includes(currentSection.id));
  const currentSectionHasText = hasTextContent(currentSection?.content);

  const prevSection = useMemo(() => {
    if (!currentSection) return null;
    const currentIndex = allSections.findIndex(s => s.id === currentSection.id);
    return currentIndex > 0 ? allSections[currentIndex - 1] : null;
  }, [currentSection, allSections]);

  const nextSection = useMemo(() => {
    if (!currentSection) return null;
    const currentIndex = allSections.findIndex(s => s.id === currentSection.id);
    return currentIndex < allSections.length - 1 ? allSections[currentIndex + 1] : null;
  }, [currentSection, allSections]);

  const isLearningMode = hasAccess || currentSection !== null;
  const showSidebar = sidebarOpen || !isMobile;
  const totalSections = chapters.reduce((sum, ch) => sum + ch.sections.length, 0);
  const previewSections = chapters.flatMap(ch => ch.sections).filter(s => s.is_preview);

  const handleMarkCurrentSectionComplete = () => {
    if (!id || !currentSection || !currentSectionHasText) return;
    markTextSectionCompleted(id, currentSection.id);
    setStudyProgressVersion((version) => version + 1);
  };

  useEffect(() => {
    if (isMobile && isLearningMode && !currentSection) {
      setSidebarOpen(true);
      setExpandedChapters(new Set());
    }
  }, [isMobile, isLearningMode, currentSection]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyBar(scrollY > 300 && !hasAccess && course?.points_price !== null && course?.points_price !== undefined);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasAccess, course]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--secondary)]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)] px-8 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[var(--color-text-secondary)] font-light">课程不存在</p>
          <button onClick={() => navigate('/')} className="mt-8 text-[var(--secondary)] hover:opacity-80 font-light">
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (isLearningMode) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-primary)]">
        <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--muted)] z-40 flex items-center px-4 shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
          <span className="font-serif text-[var(--color-text-primary)] truncate flex-1">{course.title}</span>
          {courseStudyStats && courseStudyStats.overallTotalCount > 0 && (
            <span className="text-xs text-[var(--color-text-secondary)] font-light flex-shrink-0 ml-2">
              进度 {courseStudyStats.overallPercent}%
            </span>
          )}
        </div>

        {!isMobile && showSidebar && (
            <aside
              className="fixed left-0 top-0 h-screen w-72 bg-[var(--muted)] z-30 overflow-hidden shadow-[1px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[1px_0_8px_rgba(0,0,0,0.3)]"
            >
              <div className="p-6 h-full overflow-y-auto pt-20">
                <div className="mb-6 pb-4 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                  <h2 className="font-serif text-lg text-[var(--color-text-primary)] font-light mb-2 line-clamp-2">{course.title}</h2>
                  <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
                    <BookOpen className="w-4 h-4" />
                    <span>{chapters.length} 章 · {totalSections} 节</span>
                  </div>
                  {courseStudyStats && courseStudyStats.overallTotalCount > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] text-[var(--color-text-secondary)] font-light mb-2">
                        学习进度 {courseStudyStats.overallPercent}% · 音频 {courseStudyStats.audioPercent}% · 图文 {courseStudyStats.textPercent}%
                      </div>
                      <div className="h-[2px] rounded-full bg-[var(--color-border)]/40 overflow-hidden">
                        <div className="h-full bg-[var(--secondary)] rounded-full transition-all duration-300" style={{ width: `${courseStudyStats.overallPercent}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-4">
                  <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">课程目录</h3>
                </div>
                <nav className="space-y-1">
                  {chapters.map((chapter) => (
                    <div key={chapter.id}>
                      <button onClick={() => toggleChapter(chapter.id)} className="w-full flex items-center space-x-2 px-3 py-2.5 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] rounded group">
                        <div className={`${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`} style={{ transition: 'transform 0.2s ease' }}>
                          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--secondary)]" />
                        </div>
                        <span className="flex-1 text-sm font-light truncate">{chapter.title}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{chapter.sections.length} 节</span>
                      </button>
                        {expandedChapters.has(chapter.id) && (
                          <div className="overflow-hidden ml-4 space-y-0.5">
                            {chapter.sections.map((section) => (
                              <button
                                key={section.id}
                                onClick={() => {
                                  if (!hasAccess && !section.is_preview) return;
                                  selectSection(section);
                                  if (isMobile) {
                                    setSidebarOpen(false);
                                  }
                                }}
                                className={`w-full flex items-center space-x-2 px-3 py-2 text-left rounded ${
                                  currentSection?.id === section.id
                                    ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                                    : !hasAccess && !section.is_preview
                                    ? 'text-[var(--color-text-secondary)] cursor-not-allowed'
                                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]'
                                }`}
                              >
                                <span className={`text-xs font-light w-5 ${currentSection?.id === section.id ? 'text-[var(--color-border)]' : 'text-[var(--color-text-secondary)]'}`}>{(() => {
                                  const allSecs = getAllSections();
                                  const globalIndex = allSecs.findIndex(s => s.id === section.id);
                                  return globalIndex >= 0 ? globalIndex + 1 : (section.sort_order || 0) + 1;
                                })()}</span>
                                <span className="flex-1 text-sm font-light truncate">{section.title}</span>
                                {section.is_preview && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${currentSection?.id === section.id ? 'bg-[var(--color-border)] text-[var(--color-bg-primary)]' : 'bg-[var(--color-border)]/60 text-[var(--color-bg-primary)]'}`}>试读</span>
                                )}
                                {!hasAccess && !section.is_preview && <Lock className="w-3 h-3 opacity-50" />}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  ))}
                </nav>
              </div>
            </aside>
        )}

        {isMobile && sidebarOpen && (
            <>
              <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/40 z-40 lg:hidden" />
              <div className="fixed bottom-0 left-0 right-0 h-[70vh] bg-[var(--muted)] z-50 rounded-t-2xl lg:hidden">
                <div className="flex items-center justify-between p-4 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                  <h2 className="font-serif text-lg text-[var(--color-text-primary)] font-light">课程目录</h2>
                  <button onClick={() => setSidebarOpen(false)} className="p-2 text-[var(--color-text-secondary)]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 h-[calc(70vh-4rem)] overflow-y-auto">
                  <div className="text-sm text-[var(--color-text-secondary)] mb-4">{chapters.length} 章 · {totalSections} 节</div>
                  <nav className="space-y-1">
                    {chapters.map((chapter) => (
                      <div key={chapter.id}>
                        <button onClick={() => toggleChapter(chapter.id)} className="w-full flex items-center space-x-2 px-3 py-3 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] rounded">
                          <div className={`${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`} style={{ transition: 'transform 0.2s ease' }}>
                            <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </div>
                          <span className="flex-1 text-sm font-medium truncate">{chapter.title}</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">{chapter.sections.length} 节</span>
                        </button>
                        {expandedChapters.has(chapter.id) && (
                          <div className="overflow-hidden ml-4 space-y-0.5">
                            {chapter.sections.map((section) => (
                                  <button
                                    key={section.id}
                                    onClick={() => {
                                      if (!hasAccess && !section.is_preview) return;
                                      selectSection(section);
                                      if (isMobile) {
                                        setSidebarOpen(false);
                                      }
                                    }}
                                    className={`w-full flex items-center space-x-2 px-3 py-2.5 text-left rounded ${
                                      currentSection?.id === section.id
                                        ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                                        : !hasAccess && !section.is_preview
                                        ? 'text-[var(--color-text-secondary)] cursor-not-allowed'
                                        : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]'
                                    }`}
                                  >
                                <span className={`text-xs font-light w-5 ${currentSection?.id === section.id ? 'text-[var(--color-border)]' : 'text-[var(--color-text-secondary)]'}`}>{(() => {
                                  const allSecs = getAllSections();
                                  const globalIndex = allSecs.findIndex(s => s.id === section.id);
                                  return globalIndex >= 0 ? globalIndex + 1 : (section.sort_order || 0) + 1;
                                })()}</span>
                                <span className="flex-1 text-sm font-light truncate">{section.title}</span>
                                {section.is_preview && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${currentSection?.id === section.id ? 'bg-[var(--color-border)] text-[var(--color-bg-primary)]' : 'bg-[var(--color-border)]/60 text-[var(--color-bg-primary)]'}`}>试读</span>
                                )}
                                {!hasAccess && !section.is_preview && <Lock className="w-3 h-3 opacity-50" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </nav>
                </div>
              </div>
            </>
        )}

        {isMobile && isLearningMode && (
          <button onClick={() => {
            if (!sidebarOpen) {
              setExpandedChapters(new Set());
            }
            setSidebarOpen(!sidebarOpen);
          }} className="fixed bottom-20 right-4 z-[70] w-14 h-14 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 lg:hidden">
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        )}

        {hasAccess && course?.audio_url && (
          <AudioPlayer audioUrl={course.audio_url} title={course.title} sourceType="course" sourceId={course.id} />
        )}


        <main className={`min-h-screen ${isMobile ? 'pt-14' : ''} ${showSidebar && !isMobile ? 'ml-72' : ''}`} style={{ transition: 'margin 0.3s ease' }}>
          <div ref={contentRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
            {currentSection ? (
              <div>
                <div className="mb-8 lg:mb-10">
                  {currentSection.is_preview && (
                    <span className="inline-block bg-[var(--secondary)] text-[var(--color-bg-primary)] text-xs px-3 py-1 rounded-full mb-4 font-light tracking-wider">
                      试读章节
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="w-1 h-full min-h-[3rem] bg-[var(--secondary)] rounded-full flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      {(() => {
                        const allSecs = getAllSections();
                        const globalIndex = allSecs.findIndex(s => s.id === currentSection.id);
                        return (
                          <div className="text-xs text-[var(--color-text-secondary)] font-light tracking-wide mb-2">
                            第{globalIndex >= 0 ? globalIndex + 1 : 1}节
                          </div>
                        );
                      })()}
                      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-[var(--color-text-primary)] leading-tight">
                        {currentSection.title}
                      </h1>
                    </div>
                  </div>
                  {(courseStudyStats || currentSectionHasText) && (
                    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      {courseStudyStats && courseStudyStats.overallTotalCount > 0 ? (
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-[var(--color-text-secondary)] font-light mb-2">
                            学习进度 {courseStudyStats.overallPercent}% · 音频 {courseStudyStats.audioPercent}% · 图文 {courseStudyStats.textPercent}%
                          </div>
                          <div className="h-[2px] max-w-[220px] rounded-full bg-[var(--color-border)]/40 overflow-hidden">
                            <div className="h-full bg-[var(--secondary)] rounded-full transition-all duration-300" style={{ width: `${courseStudyStats.overallPercent}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 text-[11px] text-[var(--color-text-secondary)] font-light">开始学习后，这里会显示你的学习进度。</div>
                      )}
                      {currentSectionHasText && (
                        <button
                          onClick={handleMarkCurrentSectionComplete}
                          className={`self-start text-[12px] font-light transition-all duration-200 ${
                            currentTextCompleted
                              ? 'text-emerald-600'
                              : 'text-[var(--secondary)] hover:opacity-80'
                          }`}
                        >
                          {currentTextCompleted ? '本节图文已学完' : '标记本节图文已学完'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="prose prose-stone max-w-none">
                  <ByteMdViewer content={currentSection.content || '暂无内容'} />
                </div>
                {currentSection.audio_url && (
                  <div className="mt-8">
                    <AudioPlayer audioUrl={currentSection.audio_url} title={currentSection.title} sourceType="course" sourceId={course?.id} />
                  </div>
                )}
                <div className="mt-12 lg:mt-16 pt-6 lg:pt-8 border-t border-[var(--color-border)]">
                  <div className="flex justify-center items-center gap-16">
                    {prevSection ? (
                      <button
                        onClick={() => {
                          if (!hasAccess && !prevSection.is_preview) {
                            setError('上一节为付费内容，请先购买课程或开通会员');
                            return;
                          }
                          selectSection(prevSection);
                        }}
                        className="w-12 h-12 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] hover:bg-[var(--muted)] rounded-full transition-all duration-200"
                        title="上一节"
                      >
                        <ChevronLeft className="w-8 h-8" strokeWidth={1} />
                      </button>
                    ) : (
                      <div className="w-12 h-12" />
                    )}
                    {nextSection ? (
                      <button
                        onClick={() => {
                          if (!hasAccess && !nextSection.is_preview) {
                            setError('下一节为付费内容，请先购买课程或开通会员');
                            return;
                          }
                          selectSection(nextSection);
                        }}
                        className="w-12 h-12 flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] hover:bg-[var(--muted)] rounded-full transition-all duration-200"
                        title="下一节"
                      >
                        <ChevronRight className="w-8 h-8" strokeWidth={1} />
                      </button>
                    ) : (
                      <div className="w-12 h-12" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <BookOpen className="w-8 h-8 mb-3 text-[var(--color-text-secondary)] opacity-40" />
                <h3 className="text-lg lg:text-xl font-serif font-light text-[var(--color-text-primary)] mb-2">欢迎学习「{course.title}」</h3>
                <p className="text-[var(--color-text-secondary)] font-light text-center max-w-md text-sm lg:text-base">请选择章节开始学习</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {modalOpen && course && (
        <div className="fixed inset-0 z-[90]">
          <PurchaseModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            mode={modalMode}
            courseTitle={course.title}
            pointsPrice={course.points_price || 0}
            userPoints={userData?.points || 0}
            purchaseUrl={course.purchase_url}
            onConfirm={handlePurchase}
          />
        </div>
      )}

      {showStickyBar && !hasAccess && (
        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 bg-[var(--muted)] border-t border-[var(--color-border)] z-40 px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.35)]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex flex-col">
              {course.points_price === 0 ? (
                <span className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-sm font-medium rounded-full">限免</span>
                </span>
              ) : (
                <span className="text-[var(--secondary)] font-medium text-lg">{course.points_price} 迹</span>
              )}
              <span className="text-[var(--color-text-secondary)] text-xs">{course.short_name || course.title}</span>
            </div>
            <div className="flex items-center gap-3">
              {error && <span className="text-red-500 text-sm hidden sm:inline">{error}</span>}
              <div className="flex items-center gap-2">
                {course.points_price === 0 ? (
                  <button
                    onClick={handlePurchaseClick}
                    disabled={purchasing}
                    className="px-5 py-2 zen-btn-ghost text-[var(--color-text-primary)] font-light tracking-wide hover:opacity-90 disabled:opacity-50 rounded text-sm"
                  >
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : '免费领取'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePurchaseClick}
                      disabled={purchasing}
                      className="px-5 py-2 bg-[var(--secondary)] text-[var(--color-bg-primary)] font-light tracking-wide hover:opacity-90 disabled:opacity-50 rounded text-sm"
                    >
                      {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : '兑换'}
                    </button>
                    {course.purchase_url && (
                      <button
                        onClick={handleBuyClick}
                        className="px-5 py-2 font-light tracking-wide rounded text-sm bg-[var(--color-rose)] text-[var(--color-bg-primary)] hover:opacity-90"
                      >
                        购买
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12">
        <div className="mb-8 lg:mb-12">
          {course.cover && (
            <div className="mb-6 lg:mb-8 w-full relative bg-gradient-to-br from-[var(--muted)] to-[var(--card)] rounded-lg overflow-hidden min-h-[200px]">
              <img
                src={course.cover}
                alt={course.title}
                className="w-full h-auto max-h-[400px] object-cover rounded-lg"
                loading="eager"
                onError={(e) => {
                  // 图片加载失败时隐藏
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {/* 图片加载失败时的占位显示 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: -1 }}>
                <span className="text-[var(--color-text-secondary)]/50">封面加载失败</span>
              </div>
              <div className="absolute bottom-4 right-4">
                <span className={`text-xs px-3 py-1.5 rounded font-light ${course.status === 'completed' ? 'bg-[var(--secondary)]/20 text-[var(--secondary)] border border-[var(--secondary)]/30' : 'bg-[var(--muted)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'}`}>
                  {course.status === 'completed' ? '已完结' : '更新中'}
                </span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-6">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-light text-[var(--color-text-primary)] mb-4 tracking-wide">{course.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-6">
                <span className="flex items-center space-x-1"><BookOpen className="w-4 h-4" /><span>{chapters.length} 章</span></span>
                <span>{totalSections} 节</span>
                <span className="flex items-center space-x-1 text-[var(--secondary)]">
                  <Users className="w-4 h-4" />
                  <span>{course.students_count || 0} 人在学</span>
                </span>
                {previewSections.length > 0 && <span className="text-[var(--secondary)] font-medium">{previewSections.length} 节试读</span>}
              </div>
              {courseStudyStats && courseStudyStats.overallTotalCount > 0 && (
                <div className="max-w-xl">
                  <div className="text-sm text-[var(--color-text-secondary)] font-light mb-2">
                    学习进度 {courseStudyStats.overallPercent}% · 音频 {courseStudyStats.audioPercent}% · 图文 {courseStudyStats.textPercent}%
                  </div>
                  <div className="h-[2px] rounded-full bg-[var(--color-border)]/40 overflow-hidden max-w-[240px]">
                    <div className="h-full bg-[var(--secondary)] rounded-full transition-all duration-300" style={{ width: `${courseStudyStats.overallPercent}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mb-10 lg:mb-12">
          <div className="bg-[var(--card)] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
            <p className="text-[var(--color-text-primary)] font-light leading-[1.9] text-justify tracking-wide whitespace-pre-wrap">{course.description || '暂无课程简介'}</p>
          </div>
        </div>
        {course.content && (
          <div className="mb-10 lg:mb-12">
            <div className="prose prose-stone max-w-none">
              <ByteMdViewer content={course.content} />
            </div>
          </div>
        )}
        {previewSections.length > 0 && (
          <div className="mb-10 lg:mb-12">
            <div className="bg-[var(--card)] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {previewSections.map(section => (
                  <button key={section.id} onClick={() => selectSection(section)} className="w-full text-left text-sm text-[var(--secondary)] hover:opacity-80 font-light flex items-center space-x-2 py-2 border-b border-[var(--color-border)]/50 last:border-0">
                    <CheckCircle className="w-4 h-4" />
                    <span>{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <div className="mb-10 lg:mb-12">
          <div className="bg-[var(--card)] rounded-lg shadow-sm p-4 lg:p-6 hover:shadow-md transition-shadow">
            <div className="space-y-2">
              {chapters.map((chapter, chIndex) => (
                <div key={chapter.id} className="border-b border-[var(--color-border)]/50 last:border-0">
                  <button onClick={() => toggleChapter(chapter.id)} className="w-full flex items-center space-x-2 px-3 py-3 text-left text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] rounded">
                    {expandedChapters.has(chapter.id) ? <ChevronDown className="w-4 h-4 text-[var(--color-text-secondary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                    <span className="text-sm font-medium">第 {chIndex + 1} 章 · {chapter.title}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">({chapter.sections.length} 节)</span>
                  </button>
                  {expandedChapters.has(chapter.id) && (
                    <div className="ml-6 space-y-1 pb-2">
                      {chapter.sections.map((section, secIndex) => {
                        const allSecs = getAllSections();
                        const globalIndex = allSecs.findIndex(s => s.id === section.id);
                        return (
                          <div key={section.id} className="flex items-center space-x-2 px-3 py-2 text-[var(--color-text-primary)]">
                            <span className="text-xs text-[var(--color-text-secondary)] w-6">{globalIndex >= 0 ? globalIndex + 1 : secIndex + 1}</span>
                            <span className="text-sm font-light flex-1">{section.title}</span>
                            {section.is_preview ? (
                              <button onClick={() => selectSection(section)} className="text-xs bg-[var(--secondary)] text-[var(--color-bg-primary)] px-3 py-1 rounded hover:opacity-90">试读</button>
                            ) : (
                              <Lock className="w-3 h-3 text-[var(--color-border)]" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        {course.author_bio && (
          <div className="mb-10 lg:mb-12">
            <div className="bg-[var(--card)] rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
              <p className="text-[var(--color-text-primary)] font-light leading-[1.9] text-justify tracking-wide">{course.author_bio}</p>
            </div>
          </div>
        )}
      </div>

      {course.audio_url && hasAccess && (
        <AudioPlayer audioUrl={course.audio_url} title={course.title} />
      )}
    </div>
  );
}
