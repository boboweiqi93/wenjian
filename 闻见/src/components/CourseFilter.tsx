import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Filter } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}

interface FilterState {
  primaryTags: string[];
  secondaryTags: string[];
}

interface CourseFilterProps {
  tags: Tag[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function CourseFilter({
  tags,
  filters,
  onFiltersChange,
  isMobile = false,
  isOpen = false,
  onToggle
}: CourseFilterProps) {
  const primaryTags = useMemo(() => tags.filter(tag => tag.parent_id === null), [tags]);
  const secondaryTags = useMemo(() => tags.filter(tag => tag.parent_id !== null), [tags]);

  const getSecondaryTagsByParent = (parentId: string) =>
    secondaryTags.filter(tag => tag.parent_id === parentId);

  const isPrimarySelected = (tagId: string) => filters.primaryTags.includes(tagId);
  const isSecondarySelected = (tagId: string) => filters.secondaryTags.includes(tagId);

  const togglePrimaryTag = (tagId: string) => {
    const newPrimaryTags = filters.primaryTags.includes(tagId)
      ? filters.primaryTags.filter(id => id !== tagId)
      : [...filters.primaryTags, tagId];
    const newSecondaryTags = filters.secondaryTags.filter(tid => {
      const tag = secondaryTags.find(t => t.id === tid);
      return tag && newPrimaryTags.includes(tag.parent_id!);
    });
    onFiltersChange({ primaryTags: newPrimaryTags, secondaryTags: newSecondaryTags });
  };

  const toggleSecondaryTag = (tagId: string) => {
    const newSecondaryTags = filters.secondaryTags.includes(tagId)
      ? filters.secondaryTags.filter(id => id !== tagId)
      : [...filters.secondaryTags, tagId];
    onFiltersChange({ ...filters, secondaryTags: newSecondaryTags });
  };

  const clearAllFilters = () => onFiltersChange({ primaryTags: [], secondaryTags: [] });

  const hasActiveFilters = filters.primaryTags.length > 0 || filters.secondaryTags.length > 0;
  const activeFilterCount = filters.primaryTags.length + filters.secondaryTags.length;

  const renderFilterContent = () => (
    <div className="space-y-4">
      {primaryTags.map(primaryTag => (
        <div key={primaryTag.id}>
          <button
            onClick={() => togglePrimaryTag(primaryTag.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              isPrimarySelected(primaryTag.id)
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--sidebar-accent)]'
            }`}
          >
            {primaryTag.name}
          </button>
          <AnimatePresence>
            {isPrimarySelected(primaryTag.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 ml-3 pl-3 border-l-2 border-[var(--border)] space-y-1">
                  {getSecondaryTagsByParent(primaryTag.id).map(secondaryTag => (
                    <button
                      key={secondaryTag.id}
                      onClick={() => toggleSecondaryTag(secondaryTag.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-all duration-200 ${
                        isSecondarySelected(secondaryTag.id)
                          ? 'bg-[var(--muted)] text-[var(--color-accent)]'
                          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                      }`}
                    >
                      {secondaryTag.name}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-[var(--color-bg-tertiary)] rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm text-[var(--color-text-primary)]">筛选课程</span>
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-[var(--color-accent)] text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              {/* 遮罩层 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onToggle}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              />
              {/* 底部面板 */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[var(--color-bg-primary)] rounded-t-2xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto"
              >
                {/* 拖拽指示条 */}
                <div className="w-12 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 mb-2" />
                {/* 面板头部 */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)]">
                  <span className="text-base font-medium text-[var(--color-text-primary)]">筛选条件</span>
                  <div className="flex items-center gap-3">
                    {hasActiveFilters && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                      >
                        清空
                      </button>
                    )}
                    <button onClick={onToggle} className="p-1">
                      <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </button>
                  </div>
                </div>
                {/* 筛选内容 */}
                <div className="p-6 pb-10">
                  {renderFilterContent()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 桌面端保持不变
  return (
    <div className="w-64 shrink-0">
      <div className="sticky top-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">筛选课程</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <X className="w-3 h-3" />
              清空
            </button>
          )}
        </div>

        <div className="space-y-3">
          {primaryTags.map(primaryTag => (
            <motion.div
              key={primaryTag.id}
              initial={false}
              className="bg-[var(--color-bg-tertiary)] rounded-lg overflow-hidden"
            >
              <button
                onClick={() => togglePrimaryTag(primaryTag.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isPrimarySelected(primaryTag.id)
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--sidebar-accent)]'
                }`}
              >
                <span>{primaryTag.name}</span>
                {isPrimarySelected(primaryTag.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {isPrimarySelected(primaryTag.id) && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 py-2 space-y-1">
                      {getSecondaryTagsByParent(primaryTag.id).map(secondaryTag => (
                        <motion.button
                          key={secondaryTag.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => toggleSecondaryTag(secondaryTag.id)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                            isSecondarySelected(secondaryTag.id)
                              ? 'bg-[var(--muted)] text-[var(--color-accent)] font-medium'
                              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                              isSecondarySelected(secondaryTag.id) ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-secondary)]/30'
                            }`} />
                            {secondaryTag.name}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-[var(--muted)] rounded-lg border border-[var(--border)]"
          >
            <div className="text-xs text-[var(--color-text-secondary)] mb-2">已选条件</div>
            <div className="flex flex-wrap gap-2">
              {filters.primaryTags.map(tagId => {
                const tag = primaryTags.find(t => t.id === tagId);
                return tag ? (
                  <span key={tagId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)] text-white rounded-md">
                    {tag.name}
                    <button onClick={() => togglePrimaryTag(tagId)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                ) : null;
              })}
              {filters.secondaryTags.map(tagId => {
                const tag = secondaryTags.find(t => t.id === tagId);
                return tag ? (
                  <span key={tagId} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-[var(--color-accent)]/20 text-[var(--color-accent)] rounded-md">
                    {tag.name}
                    <button onClick={() => toggleSecondaryTag(tagId)} className="hover:opacity-70"><X className="w-3 h-3" /></button>
                  </span>
                ) : null;
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
