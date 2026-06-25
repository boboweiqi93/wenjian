import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Search, RefreshCw, AlertCircle } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string | null;
  author: string;
  points_required: number | null;
  is_recommended: boolean | null;
  created_at: string | null;
  tags: string[] | null;
}

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface GroupedArticles {
  [year: string]: {
    [month: string]: Article[];
  };
}

const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className="h-4 rounded animate-pulse"
      style={{
        width,
        background: 'var(--color-border)',
      }}
    />
  );
}

function ArticleSkeleton() {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[var(--color-border)]">
      <div className="flex-1 space-y-3">
        <SkeletonLine width="60%" />
        <div className="flex gap-3">
          <SkeletonLine width="48px" />
          <SkeletonLine width="56px" />
        </div>
      </div>
      <SkeletonLine width="64px" />
    </div>
  );
}

function YearSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonLine width="80px" />
      <div>
        <SkeletonLine width="96px" />
        <div className="mt-4 space-y-0">
          {[1, 2, 3].map(i => <ArticleSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function Articles() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
    fetchTags();
  }, []);

  useEffect(() => {
    const tagFromUrl = searchParams.get('tag');
    if (tagFromUrl) setSelectedTag(tagFromUrl);
  }, [searchParams]);

  const fetchArticles = async () => {
    setError(null);
    setIsLoading(true);
    const { data, error: fetchError } = await supabase
      .from('articles')
      .select('id, title, summary, author, points_required, is_recommended, created_at, tags')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError('加载文章列表失败');
      setArticles([]);
    } else {
      setArticles(data || []);
    }
    setIsLoading(false);
  };

  const fetchTags = async () => {
    const { data: tagsData } = await supabase.from('tags').select('*');
    const { data: articlesData } = await supabase.from('articles').select('tags').eq('is_published', true);
    if (tagsData) {
      const tagCounts = tagsData.map(tag => ({
        ...tag,
        count: articlesData?.filter(a => a.tags?.includes(tag.id)).length || 0
      })).filter(t => t.count > 0);
      setTags([{ id: '', name: '全部', count: articlesData?.length || 0 }, ...tagCounts]);
    }
  };

  const filteredArticles = useMemo(() => {
    let result = articles;
    if (selectedTag) result = result.filter(a => a.tags?.includes(selectedTag));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.title.toLowerCase().includes(q) || (a.summary || '').toLowerCase().includes(q));
    }
    return result;
  }, [articles, selectedTag, searchQuery]);

  const groupedArticles = useMemo(() => {
    const grouped: GroupedArticles = {};
    filteredArticles.forEach(article => {
      const date = new Date(article.created_at || '');
      const year = date.getFullYear().toString();
      const month = date.getMonth();
      if (!grouped[year]) grouped[year] = {};
      if (!grouped[year][month]) grouped[year][month] = [];
      grouped[year][month].push(article);
    });
    return grouped;
  }, [filteredArticles]);

  const sortedYears = useMemo(() => Object.keys(groupedArticles).sort((a, b) => parseInt(b) - parseInt(a)), [groupedArticles]);

  const getTagName = (tagId: string) => {
    return tags.find(t => t.id === tagId)?.name || '';
  };

  const handleRetry = () => {
    fetchArticles();
    fetchTags();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map(tag => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(tag.id)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                selectedTag === tag.id
                  ? 'bg-[var(--secondary)] text-white'
                  : 'bg-[var(--muted)] text-[var(--color-text-secondary)] hover:bg-[var(--accent)]'
              }`}
            >
              {tag.name} ({tag.count})
            </button>
          ))}
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="搜索文章..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--muted)] border border-[var(--color-border)] rounded-full text-sm text-[var(--color-text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>

        {isLoading && (
          <div className="space-y-16">
            <YearSkeleton />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
            <AlertCircle className="w-10 h-10 mb-4 text-[var(--color-accent)]" />
            <p className="mb-4 font-light">{error}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              重试
            </button>
          </div>
        )}

        {!isLoading && !error && (
          <div className="space-y-16">
            {sortedYears.map(year => (
              <div key={year}>
                <h3 className="text-2xl font-serif text-[var(--color-text-primary)] mb-6">{year}</h3>
                {Object.keys(groupedArticles[year]).sort((a, b) => parseInt(b) - parseInt(a)).map(month => (
                  <div key={month} className="mb-8">
                    <h4 className="text-sm font-medium text-[var(--color-text-secondary)] uppercase tracking-wider mb-4">
                      {monthNames[parseInt(month)]}
                    </h4>
                    <div className="space-y-0">
                      {groupedArticles[year][month].map((article) => (
                        <div
                          key={article.id}
                          onClick={() => navigate(`/article/${article.id}`)}
                          className="group flex items-center justify-between py-4 border-b border-[var(--color-border)] cursor-pointer hover:translate-x-1 transition-all duration-200"
                        >
                          <div className="flex-1">
                            <h5 className="text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] mb-2 transition-colors">
                              {article.title}
                            </h5>
                            <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                              {article.tags?.map(tagId => (
                                <span key={tagId} className="text-[var(--color-text-secondary)]">{getTagName(tagId)}</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-[var(--color-text-secondary)] ml-4">{new Date(article.created_at || '').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && filteredArticles.length === 0 && (
          <div className="text-center py-20 text-[var(--color-text-secondary)]">
            <p className="font-light">
              {searchQuery || selectedTag ? '没有找到匹配的文章' : '暂无文章'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
