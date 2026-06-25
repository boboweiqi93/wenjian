import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Unlock, Users, PlayCircle, BookOpen } from 'lucide-react';

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
  tags: string[] | null;
}

interface Tag {
  id: string;
  name: string;
}

interface CourseCardProps {
  course: Course;
  isPurchased: boolean;
  allTags?: Tag[];
  index?: number;
}

export default function CourseCard({ course, isPurchased, allTags = [], index = 0 }: CourseCardProps) {
  const getTagName = (tagId: string) => {
    const tag = allTags.find(t => t.id === tagId);
    return tag?.name || tagId;
  };

  const displayTags = course.tags?.slice(0, 3) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ 
        y: -6,
        boxShadow: 'var(--shadow-lg)'
      }}
      className="group"
    >
      <Link
        to={`/course/${course.id}`}
        className="block bg-[var(--card)] rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--accent)] transition-all duration-300"
      >
        {/* 封面图片区域 - 标题叠加 */}
        <div className="aspect-video relative overflow-hidden bg-[var(--muted)]">
          {course.cover ? (
            <img
              src={course.cover}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-[var(--color-text-secondary)]/30" strokeWidth={1} />
            </div>
          )}

          {/* 底部渐变遮罩 + 标题叠加 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <h3 className="absolute bottom-3 left-3 right-3 text-white font-serif text-sm sm:text-base leading-snug line-clamp-2">
            {course.title}
          </h3>

          {course.is_recommended && (
            <div className="absolute top-3 left-3 px-2 py-1 bg-[var(--secondary)] text-white text-xs font-medium rounded-md">
              推荐
            </div>
          )}

          {course.status === 'completed' ? (
            <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/90 text-white text-xs font-medium rounded-md flex items-center gap-1">
              <PlayCircle className="w-3 h-3" />
              已完结
            </div>
          ) : (
            <div className="absolute top-3 right-3 px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-md flex items-center gap-1">
              <PlayCircle className="w-3 h-3" />
              更新中
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-3 sm:p-4 space-y-2">
          {/* 标签 - 点状指示器样式 */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {displayTags.map((tagId, idx) => (
                <span
                  key={idx}
                  className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] opacity-60" />
                  {getTagName(tagId)}
                </span>
              ))}
            </div>
          )}

          {/* 元数据 - 紧凑排列 */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            {course.author_name && (
              <span className="truncate max-w-[80px]">{course.author_name}</span>
            )}
            {course.author_name && (
              <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {course.students_count || 0}
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-border)]" />
            {isPurchased ? (
              <span className="flex items-center gap-1 text-[var(--color-accent)]">
                <Unlock className="w-3 h-3" />
                已解锁
              </span>
            ) : course.points_price === 0 ? (
              <span className="text-emerald-500">限免</span>
            ) : (
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                {course.points_price || 0} 迹
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
