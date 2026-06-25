import React from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, RotateCcw } from 'lucide-react';

interface EmptyStateProps {
  onReset?: () => void;
  title?: string;
  description?: string;
}

export default function EmptyState({
  onReset,
  title = '暂无匹配课程',
  description = '尝试调整筛选条件，发现更多优质课程'
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--muted)',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border)'
          }}
        >
          <Search className="w-10 h-10" style={{ color: 'var(--color-text-secondary)' }} strokeWidth={1} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--muted)'
          }}
        >
          <BookOpen className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
        </motion.div>
      </div>

      <h3 
        className="font-serif font-light text-xl mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h3>
      <p 
        className="text-sm text-center max-w-xs mb-8 font-light leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {description}
      </p>

      {onReset && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="zen-btn flex items-center gap-2 text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          重置筛选条件
        </motion.button>
      )}
    </motion.div>
  );
}
