import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Tag, Headphones, List, X, User, Calendar, Eye, BookOpen, Users } from 'lucide-react';
import ByteMdViewer from '../components/ByteMdViewer';
import AudioPlayer from '../components/AudioPlayer';
import ReadingProgress from '../components/ReadingProgress';
import { useAudio } from '../contexts/AudioContext';
import { ContentSkeleton, NotFoundState } from '../components/StateComponents';

interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  author_id: string | null;
  summary: string | null;
  tags: string[] | null;
  points_required: number | null;
  is_recommended: boolean | null;
  created_at: string | null;
  audio_url: string | null;
  view_count?: number;
  manual_recommended_courses?: string[] | null;
  cover_url?: string | null;
}

interface Tag {
  id: string;
  name: string;
}

interface RecommendedCourse {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  author_name: string | null;
  points_price: number | null;
  students_count: number | null;
  category: string | null;
}

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeHeading, setActiveHeading] = useState('');
  const [headings, setHeadings] = useState<{id: string, text: string, level: number}[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocPanelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);

  useEffect(() => {
    fetchArticle();
  }, [id]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScrollEvents = () => {
      const headingElements = document.querySelectorAll('h1, h2, h3');
      headingElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= 200) {
          setActiveHeading(el.id);
        }
      });
    };

    window.addEventListener('scroll', handleScrollEvents, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollEvents);
  }, [headings]);

  const fetchArticle = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .maybeSingle();
    if (data) {
      setArticle(data);
      setIsUnlocked((data.points_required || 0) === 0);
      fetchTags(data.tags || []);
      fetchRelatedArticles(data.tags || [], id);
      fetchRecommendedCourses(data);
      extractHeadings(data.content);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setLoading(false);
  };

  const extractHeadings = (content: string) => {
    const matches = content.match(/^(#{1,3})\s+(.+)$/gm);
    if (matches) {
      const extracted = matches.map((match, index) => {
        const level = match.match(/^(#{1,3})/)?.[0].length || 1;
        const text = match.replace(/^#{1,3}\s+/, '');
        const id = `heading-${index}-${text.slice(0, 20).replace(/\s+/g, '-').toLowerCase()}`;
        return { id, text, level };
      });
      setHeadings(extracted);
    } else {
      setHeadings([]);
    }
  };

  const fetchTags = async (tagIds: string[]) => {
    if (!tagIds?.length) return;
    const { data } = await supabase.from('tags').select('*').in('id', tagIds);
    setTags(data || []);
  };

  const fetchRelatedArticles = async (tagIds: string[], currentId: string) => {
    const { data } = await supabase
      .from('articles')
      .select('id, title, author, points_required, created_at, summary')
      .eq('is_published', true)
      .neq('id', currentId)
      .limit(4);
    setRelatedArticles((data || []) as Article[]);
  };

  const fetchRecommendedCourses = async (currentArticle: Article) => {
    const courses: RecommendedCourse[] = [];
    const courseIds = new Set<string>();

    // 优先使用人工推荐课程
    const manualCoursesIds = currentArticle.manual_recommended_courses;
    if (manualCoursesIds && manualCoursesIds.length > 0) {
      const { data: manualCourses } = await supabase
        .from('courses')
        .select('id, title, description, cover, author_name, points_price, students_count, category')
        .in('id', manualCoursesIds)
        .eq('is_published', true);
      if (manualCourses) {
        manualCourses.forEach(course => {
          if (!courseIds.has(course.id)) {
            courses.push(course);
            courseIds.add(course.id);
          }
        });
      }
    }

    // 如果没有人工推荐或数量不足，使用自动匹配
    if (courses.length < 2 && currentArticle.author_id) {
      const { data: authorCourses } = await supabase
        .from('courses')
        .select('id, title, description, cover, author_name, points_price, students_count, category')
        .eq('author_id', currentArticle.author_id)
        .eq('is_published', true)
        .limit(2 - courses.length);
      if (authorCourses) {
        authorCourses.forEach(course => {
          if (!courseIds.has(course.id) && courses.length < 2) {
            courses.push(course);
            courseIds.add(course.id);
          }
        });
      }
    }

    const articleTags = currentArticle.tags;
    if (courses.length < 2 && articleTags && articleTags.length > 0) {
      const { data: tagCourses } = await supabase
        .from('courses')
        .select('id, title, description, cover, author_name, points_price, students_count, category')
        .overlaps('tags', articleTags)
        .eq('is_published', true)
        .limit(2 - courses.length);
      if (tagCourses) {
        tagCourses.forEach(course => {
          if (!courseIds.has(course.id) && courses.length < 2) {
            courses.push(course);
            courseIds.add(course.id);
          }
        });
      }
    }

    if (courses.length < 2) {
      const { data: hotCourses } = await supabase
        .from('courses')
        .select('id, title, description, cover, author_name, points_price, students_count, category')
        .eq('is_published', true)
        .eq('is_recommended', true)
        .limit(2 - courses.length);
      if (hotCourses) {
        hotCourses.forEach(course => {
          if (!courseIds.has(course.id)) {
            courses.push(course);
            courseIds.add(course.id);
          }
        });
      }
    }

    setRecommendedCourses(courses);
  };

  const getCoverUrl = (cover: string | null): string | undefined => {
    if (!cover) return undefined;
    if (cover.startsWith('http')) return cover;
    const { data } = supabase.storage.from('covers').getPublicUrl(cover);
    return data?.publicUrl || undefined;
  };

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  const handleTocTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTocTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;
    if (deltaY > 80) {
      setTocOpen(false);
    }
  };

  if (loading) {
    return <ContentSkeleton />;
  }

  if (!article) {
    return (
      <NotFoundState
        message="文章不存在"
        actionLabel="返回文章列表"
        onAction={() => navigate('/articles')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {isUnlocked && <ReadingProgress />}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="mb-8 lg:mb-12">
          <div className="flex flex-col gap-6">
            <div className="flex-1">
              {article.cover_url && (
                <div className="mb-6 overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="relative w-full h-24 sm:h-28 lg:h-32">
                    <img
                      src={article.cover_url}
                      alt={article.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              )}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-[var(--color-text-primary)] mb-4 leading-tight tracking-wide">
                {article.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-6">
                <span className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span className="font-light">{article.author}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-light">{new Date(article.created_at || '').toLocaleDateString()}</span>
                </span>
                {(article.points_required || 0) > 0 && (
                  <span className="flex items-center space-x-1 text-amber-600">
                    <Lock className="w-4 h-4" />
                    <span>{article.points_required} 迹</span>
                  </span>
                )}
                {article.audio_url && (
                  <span className="flex items-center space-x-1 text-[var(--secondary)]">
                    <Headphones className="w-4 h-4" />
                    <span>可收听</span>
                  </span>
                )}
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => navigate(`/articles?tag=${tag.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[var(--muted)] border border-[var(--color-border)] text-[var(--color-text-secondary)] text-xs rounded-full hover:bg-[var(--accent)] transition-colors"
                    >
                      <Tag className="w-3 h-3" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-24">
              <div className="mb-6 pb-4 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
                <h3 className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">目录</h3>
              </div>
              <nav className="space-y-1">
                {headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => scrollToHeading(h.id)}
                    className={`w-full flex items-center space-x-2 px-3 py-2 text-left rounded transition-colors ${
                      activeHeading === h.id
                        ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--muted)] hover:text-[var(--color-text-primary)]'
                      } ${h.level === 1 ? 'font-medium' : h.level === 2 ? 'pl-6' : 'pl-10'}`}
                    >
                      <span className="text-sm font-light truncate">{h.text}</span>
                    </button>
                  ))}
                </nav>
              </div>
          </aside>

          <main className="flex-1 min-w-0" ref={contentRef}>
            <div className="max-w-4xl">
              {!isUnlocked ? (
                <div className="relative bg-[var(--muted)] border border-[var(--color-border)] rounded-lg p-8">
                  <div className="blur-sm opacity-50">
                    <div className="h-40" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="w-12 h-12 text-[var(--color-border)] mx-auto mb-4" />
                      <p className="text-[var(--color-text-secondary)] font-light mb-4">此文章需用迹解锁</p>
                      <button
                        onClick={() => setIsUnlocked(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity font-light tracking-wide"
                      >
                        <span>用 {article.points_required} 迹解锁</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-stone max-w-none prose-reading">
                  <ByteMdViewer content={article.content} headings={headings} />
                </div>
              )}

              {article.audio_url && isUnlocked && (
                <div className="mt-8">
                  <AudioPlayer audioUrl={article.audio_url} title={article.title} sourceType="article" sourceId={article.id} />
                </div>
              )}

              {recommendedCourses.length > 0 && (
                <section className="mt-16 pt-8 border-t border-[var(--color-border)]">
                  <h3 className="font-serif text-xl text-[var(--color-text-primary)] mb-6 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    推荐课程
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendedCourses.map(course => (
                      <div
                        key={course.id}
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="group bg-[var(--muted)] border border-[var(--color-border)] rounded-lg overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      >
                        {course.cover && (
                          <div className="relative h-32 overflow-hidden">
                            <img
                              src={getCoverUrl(course.cover)}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                        )}
                        <div className="p-4">
                          <h4 className="font-serif font-medium text-[var(--color-text-primary)] line-clamp-2 mb-2 group-hover:text-[var(--secondary)] transition-colors">
                            {course.title}
                          </h4>
                          {course.author_name && (
                            <p className="text-sm text-[var(--color-text-secondary)] font-light mb-2">
                              {course.author_name}
                            </p>
                          )}
                          {course.description && (
                            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 font-light opacity-70 mb-3">
                              {course.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                              <Users className="w-3 h-3" />
                              <span>{course.students_count || 0} 人在学</span>
                            </div>
                            <span className="text-sm font-medium text-[var(--secondary)]">
                              {course.points_price || 0} 迹
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {relatedArticles.length > 0 && (
                <section className="mt-16 pt-8 border-t border-[var(--color-border)]">
                  <h3 className="font-serif text-xl text-[var(--color-text-primary)] mb-6">相关推荐</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {relatedArticles.map(item => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/article/${item.id}`)}
                        className="p-4 bg-[var(--muted)] border border-[var(--color-border)] rounded-lg cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <h4 className="font-medium text-[var(--color-text-primary)] line-clamp-2 mb-2">{item.title}</h4>
                        <p className="text-sm text-[var(--color-text-secondary)] font-light">{item.author}</p>
                        {item.summary && (
                          <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-2 font-light opacity-70">
                            {item.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>

      {headings.length > 0 && (
        <button
          onClick={() => setTocOpen(true)}
          className="fixed bottom-20 right-4 z-[70] w-14 h-14 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 lg:hidden"
        >
          <List className="w-6 h-6" />
        </button>
      )}

      {tocOpen && (
        <>
          <div
            onClick={() => setTocOpen(false)}
            className="fixed inset-0 bg-black/40 z-[80] backdrop-blur-sm lg:hidden"
          />
          <div
            ref={tocPanelRef}
            onTouchStart={handleTocTouchStart}
            onTouchEnd={handleTocTouchEnd}
            className="fixed bottom-0 left-0 right-0 h-[70vh] bg-[var(--muted)] z-[50] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] lg:hidden"
          >
            <div className="flex items-center justify-between p-4 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
              <h2 className="font-serif text-lg text-[var(--color-text-primary)] font-light">目录</h2>
              <button
                onClick={() => setTocOpen(false)}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 h-[calc(70vh-4rem)] overflow-y-auto">
              <nav className="space-y-1">
                {headings.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      scrollToHeading(h.id);
                      setTocOpen(false);
                    }}
                    className={`w-full flex items-center space-x-2 px-3 py-3 text-left rounded transition-colors ${
                      activeHeading === h.id
                        ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] hover:text-[var(--color-text-primary)]'
                      } ${h.level === 1 ? 'font-medium' : h.level === 2 ? 'pl-6' : 'pl-10'}`}
                    >
                      <span className="text-sm font-light">{h.text}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-[var(--color-border)] rounded-full opacity-50" />
          </div>
        </>
      )}
    </div>
  );
}
