import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Ticket, SlidersHorizontal } from 'lucide-react';
import CourseFilter from '../components/CourseFilter';
import CourseCard from '../components/CourseCard';
import EmptyState from '../components/EmptyState';

interface Course {
  id: string;
  title: string;
  description: string | null;
  points_price: number | null;
  author_name: string | null;
  category: string | null;
  cover: string | null;
  is_recommended: boolean | null;
  students_count: number | null;
  status: string | null;
  is_published: boolean | null;
  tags: string[] | null;
}

interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FilterState {
  primaryTags: string[];
  secondaryTags: string[];
}

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasMembership, setHasMembership] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    primaryTags: [],
    secondaryTags: []
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTags();
    fetchCourses();
    if (user) fetchPurchasedCourses();
  }, [user]);

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, parent_id')
      .order('name');

    if (error) {
      console.error('获取标签失败:', error);
      return;
    }

    setTags(data || []);
  };

  const fetchCourses = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('is_recommended', { ascending: false })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('获取课程失败:', error);
      setIsLoading(false);
      return;
    }

    setCourses(data || []);
    setIsLoading(false);
  };

  const fetchPurchasedCourses = async () => {
    if (!user?.id) return;

    // 检查有效会员
    const { data: memberships } = await supabase
      .from('user_memberships')
      .select('tier, expires_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true);

    let memberAccess = false;
    if (memberships && memberships.length > 0) {
      for (const m of memberships) {
        if (m.tier === 'founder' && m.is_active) { memberAccess = true; break; }
        if (m.tier === 'yearly' && m.is_active && m.expires_at && new Date(m.expires_at) > new Date()) { memberAccess = true; break; }
      }
    }
    setHasMembership(memberAccess);

    const { data } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', user.id);
    setPurchasedIds(new Set(data?.map((p) => p.course_id) || []));
  };

  const filteredCourses = useMemo(() => {
    if (filters.primaryTags.length === 0 && filters.secondaryTags.length === 0) {
      return courses;
    }

    return courses.filter(course => {
      const courseTags = course.tags || [];

      const matchesSecondary = filters.secondaryTags.length === 0 ||
        filters.secondaryTags.some(tagId => courseTags.includes(tagId));

      const matchesPrimary = filters.primaryTags.length === 0 ||
        filters.primaryTags.some(primaryTagId => {
          if (courseTags.includes(primaryTagId)) {
            return true;
          }
          const childTagIds = tags
            .filter(t => t.parent_id === primaryTagId)
            .map(t => t.id);
          return childTagIds.some(childId => courseTags.includes(childId));
        });

      return matchesPrimary && matchesSecondary;
    });
  }, [courses, filters, tags]);

  const purchasedCourses = useMemo(() => {
    if (hasMembership) return filteredCourses;
    return filteredCourses.filter(c => purchasedIds.has(c.id));
  }, [filteredCourses, purchasedIds, hasMembership]);

  const unpurchasedCourses = useMemo(() => {
    if (hasMembership) return [];
    return filteredCourses.filter(c => !purchasedIds.has(c.id));
  }, [filteredCourses, purchasedIds, hasMembership]);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({
      primaryTags: [],
      secondaryTags: []
    });
  };

  const hasActiveFilters = filters.primaryTags.length > 0 || filters.secondaryTags.length > 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="mb-8 md:mb-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-serif font-light text-2xl md:text-3xl text-[var(--color-text-primary)] tracking-wide"
              >
                课程中心
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-2 text-[var(--color-text-secondary)] font-light text-sm md:text-base"
              >
                精选课程，静候君阅
              </motion.p>
            </div>
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => navigate('/invite')}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-[var(--border)] text-[var(--color-text-secondary)] hover:text-[var(--secondary)] hover:border-[var(--secondary)] text-sm font-light rounded-lg transition-colors shrink-0"
            >
              <Ticket className="w-4 h-4" />
              <span>使用邀请码</span>
            </motion.button>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:hidden"
          >
            <CourseFilter
              tags={tags}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isMobile={true}
              isOpen={isMobileFilterOpen}
              onToggle={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden lg:block"
          >
            <CourseFilter
              tags={tags}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          </motion.div>

          <div className="flex-1 min-w-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-[var(--secondary)] border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <>
                {hasActiveFilters && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>找到 {filteredCourses.length} 门课程</span>
                  </motion.div>
                )}

                {filteredCourses.length === 0 ? (
                  <EmptyState onReset={clearAllFilters} />
                ) : (
                  <div className="space-y-12">
                    {purchasedCourses.length > 0 && (
                      <section>
                        <div className="mb-4 pb-2 border-b border-[var(--color-border)]">
                          <span className="text-sm text-[var(--color-text-secondary)] font-normal">
                            ({purchasedCourses.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                          <AnimatePresence mode="popLayout">
                            {purchasedCourses.map((course, index) => (
                              <CourseCard
                                key={course.id}
                                course={course}
                                isPurchased={true}
                                allTags={tags}
                                index={index}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </section>
                    )}

                    {unpurchasedCourses.length > 0 && (
                      <section>
                        <div className="mb-4 pb-2 border-b border-[var(--color-border)]">
                          <span className="text-sm text-[var(--color-text-secondary)] font-normal">
                            ({unpurchasedCourses.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                          <AnimatePresence mode="popLayout">
                            {unpurchasedCourses.map((course, index) => (
                              <CourseCard
                                key={course.id}
                                course={course}
                                isPurchased={false}
                                allTags={tags}
                                index={index}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
