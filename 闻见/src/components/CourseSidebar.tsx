import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight, CornerUpLeft, BookOpen, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Section {
  id: string;
  chapter_id: string;
  title: string;
  sort_order: number;
  is_preview: boolean;
}

interface Chapter {
  id: string;
  title: string;
  sort_order: number;
  sections: Section[];
}

interface CourseSidebarProps {
  course: { id: string; title: string; cover: string | null; description: string | null } | null;
  chapters: Chapter[];
  currentSection: Section | null;
  expandedChapters: Set<string>;
  isPurchased: boolean;
  sidebarOpen: boolean;
  onToggleChapter: (id: string) => void;
  onSelectSection: (section: Section) => void;
  onToggleSidebar: () => void;
  onPrevSection?: () => void;
  onNextSection?: () => void;
}

export default function CourseSidebar({
  course,
  chapters,
  currentSection,
  expandedChapters,
  isPurchased,
  sidebarOpen,
  onToggleChapter,
  onSelectSection,
  onToggleSidebar,
  onPrevSection,
  onNextSection,
}: CourseSidebarProps) {
  const navigate = useNavigate();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();

    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsMobile(window.innerWidth < 1024);
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStartX.current;
    if (Math.abs(deltaX) > 80) {
      if (deltaX > 0 && !sidebarOpen) onToggleSidebar();
      if (deltaX < 0 && sidebarOpen) onToggleSidebar();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !currentSection) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 60) {
      if (deltaX > 0 && onNextSection) onNextSection();
      else if (deltaX < 0 && onPrevSection) onPrevSection();
    }
  };

  const totalSections = chapters.reduce((sum, ch) => sum + ch.sections.length, 0);

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`fixed left-0 bottom-[80px] md:bottom-0 h-[calc(100vh-80px)] md:h-screen w-72 bg-[var(--color-bg-primary)] z-40 overflow-y-auto shadow-[1px_0_8px_rgba(0,0,0,0.08)] dark:shadow-[1px_0_8px_rgba(0,0,0,0.3)] ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transition: 'transform 0.3s ease' }}
      >
        <div className="p-4 h-full overflow-y-auto pt-4 pb-4">
          {course && (
            <div className="mb-4 pb-4 shadow-[0_1px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
              <h2 className="font-serif text-base text-[var(--color-text-primary)] font-light mb-2 line-clamp-2">
                {course.title}
              </h2>
              <div className="flex items-center space-x-2 text-xs text-[var(--color-text-secondary)]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{chapters.length} 章 · {totalSections} 节</span>
              </div>
            </div>
          )}

          <nav className="space-y-1">
            {chapters.map((chapter) => (
              <div key={chapter.id}>
                <button
                  onClick={() => onToggleChapter(chapter.id)}
                  className="w-full flex items-center space-x-2 px-3 py-2.5 text-left text-[var(--color-text-primary)] hover:bg-[var(--muted)] rounded"
                >
                  <div className={`${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`} style={{ transition: 'transform 0.2s ease' }}>
                    <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </div>
                  <span className="flex-1 text-sm font-light truncate">{chapter.title}</span>
                </button>

                {expandedChapters.has(chapter.id) && (
                    <div className="overflow-hidden">
                      <div className="ml-4 space-y-0.5">
                        {chapter.sections.map((section) => (
                          <button
                            key={section.id}
                            onClick={() => onSelectSection(section)}
                            className={`w-full flex items-center space-x-2 px-3 py-2 text-left rounded ${
                              currentSection?.id === section.id
                                ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                                : 'text-[var(--color-text-primary)] hover:bg-[var(--muted)]'
                            }`}
                          >
                            <span className="text-xs font-light w-5">{section.sort_order + 1}</span>
                            <span className="flex-1 text-sm font-light truncate">{section.title}</span>
                            {section.is_preview && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                currentSection?.id === section.id
                                  ? 'bg-[var(--color-border)] text-[var(--color-bg-primary)]'
                                  : 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                              }`}>
                                试读
                              </span>
                            )}
                            {!isPurchased && !section.is_preview && (
                              <Lock className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {isMobile && sidebarOpen && (
        <div
          onClick={onToggleSidebar}
          className="fixed inset-0 bg-black/30 z-30 backdrop-blur-sm"
        />
      )}

      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="touch-pan-y"
      />
    </>
  );
}
