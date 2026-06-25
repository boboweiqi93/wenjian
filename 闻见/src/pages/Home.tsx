import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';
import { Lock, Unlock, ChevronDown } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  category: string | null;
  author_name: string | null;
  points_price: number | null;
  description: string | null;
  status: string | null;
  students_count: number | null;
  cover: string | null;
  is_recommended: boolean | null;
}

function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { user, userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [hasMembership, setHasMembership] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' });

  const selectedCategory = searchParams.get('category') || 'all';
  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchCoursesData();
      await fetchPurchasedCourses();
      setIsLoading(false);
    };
    load();
  }, [user]);

  const fetchCoursesData = async () => {
    const { data: allCourses } = await supabase
      .from('courses')
      .select('id, title, category, author_name, points_price, description, status, students_count, cover, is_recommended, sort_order, created_at')
      .eq('is_published', true)
      .order('is_recommended', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (allCourses) {
      setCourses(allCourses);
      const uniqueCategories = Array.from(new Set(allCourses.map((c: Course) => c.category).filter((c): c is string => c !== null)));
      setCategories(uniqueCategories);
    }
  };

  const fetchPurchasedCourses = async () => {
    if (!user?.id) return;

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

    const { data: purchased } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', user.id);
    setPurchasedIds(new Set(purchased?.map((p) => p.course_id) || []));
  };

  const filteredCourses = useMemo(() => {
    if (selectedCategory === 'all') return courses;
    return courses.filter((c) => c.category === selectedCategory);
  }, [courses, selectedCategory]);

  const unlockedCourses = useMemo(() => {
    if (hasMembership) return filteredCourses;
    return filteredCourses.filter((c) => purchasedIds.has(c.id));
  }, [filteredCourses, purchasedIds, hasMembership]);

  const lockedCourses = useMemo(() => {
    if (hasMembership) return [];
    return filteredCourses.filter((c) => !purchasedIds.has(c.id));
  }, [filteredCourses, purchasedIds, hasMembership]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
  };

  const coursesByCategory = useMemo(() => {
    if (selectedCategory !== 'all') return null;
    const grouped: Record<string, { unlocked: Course[]; locked: Course[] }> = {};
    categories.forEach((cat) => { grouped[cat] = { unlocked: [], locked: [] }; });
    unlockedCourses.forEach((c) => {
      const cat = c.category || '';
      if (!grouped[cat]) grouped[cat] = { unlocked: [], locked: [] };
      grouped[cat].unlocked.push(c);
    });
    lockedCourses.forEach((c) => {
      const cat = c.category || '';
      if (!grouped[cat]) grouped[cat] = { unlocked: [], locked: [] };
      grouped[cat].locked.push(c);
    });
    return grouped;
  }, [unlockedCourses, lockedCourses, categories, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    if (category === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
    setIsDropdownOpen(false);
  };

  const handleFilterChange = (newFilter: 'all' | 'unlocked') => {
    if (newFilter === 'all') {
      searchParams.delete('filter');
    } else {
      searchParams.set('filter', newFilter);
    }
    setSearchParams(searchParams);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 晨雾轻纱风格课程卡片 - 无边框，微妙阴影
  const CourseCard = ({ course, isPurchased }: { course: Course; isPurchased: boolean }) => (
    <motion.div variants={cardVariants}>
      <Link
        to={`/course/${course.id}`}
        className="block rounded-lg overflow-hidden group transition-all duration-400"
        style={{
          background: 'var(--card)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
          e.currentTarget.style.background = 'var(--card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.background = 'var(--card)';
        }}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {course.cover ? (
            <img
              src={course.cover}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-bg-secondary)' }}>
              <span className="text-xs font-light" style={{ color: 'var(--text-muted)' }}>暂无封面</span>
            </div>
          )}
          {/* 锁头图标 */}
          <div className="absolute bottom-2 right-2">
            <span 
              className="flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-sm"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)',
                color: isPurchased ? 'var(--color-accent)' : 'var(--text-muted)'
              }}
            >
              {isPurchased ? <Unlock className="w-3 h-3" strokeWidth={1.5} /> : <Lock className="w-3 h-3" strokeWidth={1.5} />}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 lg:px-20 py-16 md:py-24 space-y-16 relative z-10">
      {/* Hero 区域 - 文字直接融入背景 */}
      <motion.div
        ref={heroRef}
        initial={{ opacity: 0, y: 24 }}
        animate={heroInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <section className="py-12 text-center">
          <h1 
            className="text-4xl md:text-5xl font-light tracking-wide mb-4"
            style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}
          >
            <span style={{ color: 'var(--primary)' }}>闻</span>
            <span style={{ color: 'var(--secondary)' }}>见</span>
          </h1>
          <p 
            className="text-base font-light tracking-[0.2em]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            沉下来的知识
          </p>
        </section>
      </motion.div>

      {/* 筛选器 - 极简标签样式 */}
      <div className="flex items-center justify-center gap-3 flex-wrap" ref={dropdownRef}>
        {(filter !== 'all' || selectedCategory !== 'all') && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              searchParams.delete('filter');
              searchParams.delete('category');
              setSearchParams(searchParams);
            }}
            className="px-4 py-2 rounded-full text-xs font-light tracking-wider transition-all duration-300"
            style={{
              background: 'var(--muted)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)'
            }}
          >
            清空
          </motion.button>
        )}
        
        {['all', 'unlocked'].map((f) => (
          <motion.button
            key={f}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFilterChange(f as 'all' | 'unlocked')}
            className="px-5 py-2 rounded-full text-xs font-light tracking-wider transition-all duration-300"
            style={{
              background: filter === f ? 'var(--color-accent)' : 'var(--muted)',
              color: filter === f ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${filter === f ? 'var(--color-accent)' : 'var(--color-border)'}`,
              boxShadow: filter === f ? 'var(--pearl-shadow)' : 'none'
            }}
          >
            {f === 'all' ? '全部' : '已解锁'}
          </motion.button>
        ))}

        {selectedCategory !== 'all' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleCategoryChange(selectedCategory)}
            className="px-5 py-2 rounded-full text-xs font-light tracking-wider"
            style={{
              background: 'var(--color-accent)',
              color: '#fff',
              border: '1px solid var(--color-accent)',
              boxShadow: 'var(--pearl-shadow)'
            }}
          >
            {selectedCategory}
          </motion.button>
        )}

        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: isDropdownOpen ? 'var(--color-accent)' : 'var(--muted)',
              color: isDropdownOpen ? '#fff' : 'var(--color-text-secondary)',
              border: `1px solid ${isDropdownOpen ? 'var(--color-accent)' : 'var(--color-border)'}`
            }}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 rounded-lg py-2 min-w-[140px] z-50 backdrop-blur-md"
                style={{
                  background: 'var(--popover)',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-md)'
                }}
              >
                {categories
                  .filter((cat) => cat !== selectedCategory)
                  .map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCategoryChange(cat)}
                      className="w-full text-left px-4 py-2.5 text-xs font-light tracking-wider transition-colors duration-200"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--muted)';
                        e.currentTarget.style.color = 'var(--color-accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                      }}
                    >
                      {cat}
                    </button>
                  ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 rounded-full"
            style={{ 
              border: '1px solid var(--color-accent)',
              borderTopColor: 'transparent'
            }}
          />
        </div>
      ) : (
        <>
          {/* 已解锁课程横向滑动 */}
          {unlockedCourses.length > 0 && filter === 'all' && selectedCategory === 'all' && (
            <motion.section className="mb-16">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="flex items-center gap-3 mb-8"
              >
                <Unlock className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                <h2 
                  className="text-lg font-light tracking-wider"
                  style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--color-text-primary)' }}
                >
                  已解锁课程
                </h2>
              </motion.div>
              <div className="overflow-x-auto pb-4 -mx-6 px-6 md:-mx-12 md:px-12 lg:-mx-20 lg:px-20 scrollbar-hide">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.08 } }
                  }}
                  className="flex gap-5 min-w-max"
                >
                  {unlockedCourses.map((course) => (
                    <motion.div
                      key={course.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
                      }}
                      className="w-[calc(50vw-2rem)] md:w-[calc(25vw-3rem)] lg:w-[calc(25vw-4rem)] flex-shrink-0 max-w-[280px]"
                    >
                      <CourseCard course={course} isPurchased={true} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          )}

          {filter === 'unlocked' ? (
            <>
              {unlockedCourses.length > 0 ? (
                <section>
                  <ScrollReveal>
                    <div className="flex items-center gap-3 mb-8">
                      <Unlock className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                      <h2 className="text-lg font-light tracking-wider" style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--color-text-primary)' }}>已解锁课程</h2>
                    </div>
                  </ScrollReveal>
                  <motion.div className="grid grid-cols-2 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                    {unlockedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} isPurchased={true} />
                    ))}
                  </motion.div>
                </section>
              ) : (
                <div className="text-center py-16">
                  <p className="text-sm font-light tracking-wider" style={{ color: 'var(--text-muted)' }}>暂无已解锁课程</p>
                </div>
              )}
            </>
          ) : selectedCategory === 'all' && coursesByCategory ? (
            <>
              {Object.entries(coursesByCategory).map(([category, { unlocked, locked }]) => (
                (unlocked.length > 0 || locked.length > 0) && (
                  <section key={category}>
                    <ScrollReveal>
                      <h2 
                        className="text-lg font-light tracking-wider mb-6 pb-3"
                        style={{ 
                          fontFamily: "'Noto Serif SC', serif", 
                          color: 'var(--color-text-primary)',
                          borderBottom: '1px solid var(--color-border)'
                        }}
                      >
                        {category}
                      </h2>
                    </ScrollReveal>
                    {unlocked.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                          <Unlock className="w-3.5 h-3.5" style={{ color: 'var(--color-accent)' }} />
                          <span className="text-xs font-light tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>已解锁</span>
                        </div>
                        <motion.div className="grid grid-cols-2 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                          {unlocked.map((course) => (
                            <CourseCard key={course.id} course={course} isPurchased={true} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                    {locked.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span className="text-xs font-light tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>待解锁</span>
                        </div>
                        <motion.div className="grid grid-cols-2 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                          {locked.map((course) => (
                            <CourseCard key={course.id} course={course} isPurchased={false} />
                          ))}
                        </motion.div>
                      </div>
                    )}
                  </section>
                )
              ))}
            </>
          ) : (
            <>
              {unlockedCourses.length > 0 && (
                <section>
                  <ScrollReveal>
                    <div className="flex items-center gap-3 mb-8">
                      <Unlock className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                      <h2 className="text-lg font-light tracking-wider" style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--color-text-primary)' }}>已解锁课程</h2>
                    </div>
                  </ScrollReveal>
                  <motion.div className="grid grid-cols-2 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                    {unlockedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} isPurchased={true} />
                    ))}
                  </motion.div>
                </section>
              )}
              {lockedCourses.length > 0 && (
                <section>
                  <ScrollReveal>
                    <div className="flex items-center gap-3 mb-8">
                      <Lock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <h2 className="text-lg font-light tracking-wider" style={{ fontFamily: "'Noto Serif SC', serif", color: 'var(--color-text-primary)' }}>待解锁课程</h2>
                    </div>
                  </ScrollReveal>
                  <motion.div className="grid grid-cols-2 gap-5" variants={containerVariants} initial="hidden" animate="visible">
                    {lockedCourses.map((course) => (
                      <CourseCard key={course.id} course={course} isPurchased={false} />
                    ))}
                  </motion.div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {/* 积分展示 - 极细分隔线 */}
      <section className="text-center py-10" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs font-light tracking-[0.2em] mb-3" style={{ color: 'var(--text-muted)' }}>你的痕迹</p>
        <div 
          className="text-4xl font-light"
          style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif", color: 'var(--color-accent)' }}
        >
          {userData?.points || 0}
        </div>
      </section>
    </div>
  );
}
