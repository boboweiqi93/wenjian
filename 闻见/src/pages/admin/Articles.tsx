import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit2, Trash2, Star, User, Tag, AlertCircle, Check, Trash } from 'lucide-react';
import MarkdownEditor from '../../components/MarkdownEditor';
import CascadingTagSelector from '../../components/CascadingTagSelector';

interface Article {
  id: string;
  title: string;
  author: string;
  author_id: string | null;
  content: string;
  summary: string | null;
  tags: string[] | null;
  is_recommended: boolean | null;
  points_required: number | null;
  is_published: boolean | null;
  created_at: string | null;
  audio_url: string | null;
  cover_url: string | null;
  manual_recommended_courses?: string[] | null;
}

interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Author {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    author_id: '',
    content: '',
    summary: '',
    tags: [] as string[],
    is_recommended: false,
    points_required: 0,
    is_published: true,
    audio_url: '',
    manual_recommended_courses: [] as string[],
    cover_url: '',
  });
  const [pendingTags, setPendingTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [courses, setCourses] = useState<{id: string; title: string}[]>([]);

  useEffect(() => {
    fetchArticles();
    fetchTags();
    fetchAuthors();
    fetchCourses();
  }, []);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('is_recommended', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.error('获取文章失败:', error);
    } else {
      setArticles(data || []);
    }
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    setTags(data || []);
  };

  const fetchAuthors = async () => {
    const { data } = await supabase.from('authors').select('*').order('name');
    setAuthors(data || []);
  };

  const fetchCourses = async () => {
    const { data } = await supabase.from('courses').select('id, title').eq('is_published', true).order('title');
    setCourses(data || []);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('请输入文章标题');
      return false;
    }
    if (!formData.content.trim()) {
      setError('请输入文章内容');
      return false;
    }
    if (!formData.author.trim() && !formData.author_id) {
      setError('请选择或输入作者');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) return;

    setLoading(true);

    const selectedAuthor = formData.author_id ? authors.find(a => a.id === formData.author_id) : null;
    const submitData = {
      title: formData.title.trim(),
      content: formData.content.trim(),
      author: selectedAuthor?.name || formData.author.trim(),
      author_id: formData.author_id || null,
      summary: formData.summary.trim() || null,
      tags: formData.tags.length > 0 ? formData.tags : null,
      is_recommended: formData.is_recommended,
      points_required: formData.points_required,
      is_published: formData.is_published,
      audio_url: formData.audio_url.trim() || null,
      manual_recommended_courses: formData.manual_recommended_courses.length > 0 ? formData.manual_recommended_courses : null,
      cover_url: formData.cover_url.trim() || null,
    };

    try {
      if (editingArticle) {
        const { error: updateError } = await supabase
          .from('articles')
          .update(submitData)
          .eq('id', editingArticle.id);
        if (updateError) throw updateError;
        setSuccess('文章更新成功');
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert(submitData);
        if (insertError) throw insertError;
        setSuccess('文章发布成功');
      }

      setShowModal(false);
      setEditingArticle(null);
      resetForm();
      await fetchArticles();
    } catch (err: any) {
      console.error('保存失败:', err);
      setError(err.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      author_id: '',
      content: '',
      summary: '',
      tags: [],
      is_recommended: false,
      points_required: 0,
      is_published: true,
      audio_url: '',
      manual_recommended_courses: [],
      cover_url: '',
    });
    setError('');
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      author: article.author,
      author_id: article.author_id || '',
      content: article.content,
      summary: article.summary || '',
      tags: article.tags || [],
      is_recommended: article.is_recommended ?? false,
      points_required: article.points_required ?? 0,
      is_published: article.is_published ?? true,
      audio_url: article.audio_url || '',
      manual_recommended_courses: article.manual_recommended_courses || [],
      cover_url: article.cover_url || '',
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该文章？')) return;
    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) {
      setError('删除失败');
    } else {
      await fetchArticles();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map(a => a.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from('articles').delete().in('id', ids);
    if (error) {
      setError('批量删除失败');
    } else {
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
      await fetchArticles();
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const handleAuthorChange = (authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    setFormData(prev => ({
      ...prev,
      author_id: authorId,
      author: author?.name || prev.author,
    }));
  };

  const openCreate = () => {
    setEditingArticle(null);
    resetForm();
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)]">文章管理</h1>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBatchDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-danger)] text-white rounded hover:bg-[var(--color-sage)]"
            >
              <Trash className="w-4 h-4" />
              <span>删除选中 ({selectedIds.size})</span>
            </button>
          )}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-text-primary)] text-white rounded hover:bg-[var(--color-sage)]"
          >
            <Plus className="w-4 h-4" />
            <span>发布文章</span>
          </button>
        </div>
      </div>

      {error && !showModal && (
        <div className="flex items-center gap-2 text-[var(--color-danger)] text-sm bg-red-50 p-3 rounded">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-[var(--color-bg-primary)] rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={selectedIds.size === articles.length && articles.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-[var(--color-text-primary)]"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">标题</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">作者</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">积分</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">推荐</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">状态</th>
              <th className="px-4 py-3 text-right text-sm font-light text-[var(--color-text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {articles.map(article => (
              <tr key={article.id} className="hover:bg-[var(--color-bg-tertiary)]">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(article.id)}
                    onChange={() => toggleSelect(article.id)}
                    className="w-4 h-4 accent-[var(--color-text-primary)]"
                  />
                </td>
                <td className="px-4 py-3 text-[var(--color-text-primary)]">{article.title}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{article.author}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{article.points_required}</td>
                <td className="px-4 py-3">
                  {article.is_recommended && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${article.is_published ? 'bg-green-100 text-green-700' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>
                    {article.is_published ? '已发布' : '草稿'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(article)} className="text-[var(--color-text-primary)] hover:text-[var(--color-sage)] mr-3">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(article.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {articles.length === 0 && (
          <div className="text-center py-12 text-[var(--color-text-secondary)]">
            暂无文章，点击"发布文章"创建第一篇
          </div>
        )}
      </div>

      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-primary)] rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">确认删除</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              确定要删除选中的 <span className="font-medium text-[var(--color-danger)]">{selectedIds.size}</span> 篇文章吗？此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded hover:bg-[var(--color-bg-tertiary)]"
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="flex-1 py-2 bg-[var(--color-danger)] text-white rounded hover:bg-[var(--color-sage)]"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-primary)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-serif mb-4">{editingArticle ? '编辑文章' : '发布文章'}</h2>

            {error && (
              <div className="flex items-center gap-2 text-[var(--color-danger)] text-sm bg-red-50 p-3 rounded mb-4">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded mb-4">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">文章标题 <span className="text-[var(--color-danger)]">*</span></label>
                <input
                  type="text"
                  placeholder="请输入文章标题"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-1">
                    <User className="w-4 h-4" />
                    从作者库选择
                  </label>
                  <select
                    value={formData.author_id}
                    onChange={e => handleAuthorChange(e.target.value)}
                    className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                  >
                    <option value="">请选择作者</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>{author.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-sm text-[var(--color-text-secondary)] mb-1 block">或手动输入作者 <span className="text-[var(--color-danger)]">*</span></label>
                  <input
                    type="text"
                    placeholder="输入作者名称"
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">文章摘要</label>
                <textarea
                  placeholder="请输入文章摘要（可选）"
                  value={formData.summary}
                  onChange={e => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 h-20 focus:outline-none focus:border-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <p className="text-sm text-[var(--color-text-secondary)] mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  标签
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    return tag ? (
                      <span key={tag.id} className="px-3 py-1 rounded text-sm bg-[var(--color-text-primary)] text-white">
                        {tag.name}
                      </span>
                    ) : null;
                  })}
                  <button
                    onClick={() => {
                      setPendingTags(formData.tags);
                      setShowTagSelector(true);
                    }}
                    className="px-3 py-1 rounded text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                  >
                    {formData.tags.length > 0 ? '修改标签' : '选择标签'}
                  </button>
                </div>
                {showTagSelector && (
                  <div className="border border-[var(--color-border)] rounded p-4 bg-[var(--color-bg-primary)]">
                    <CascadingTagSelector
                      selectedTags={pendingTags}
                      onChange={setPendingTags}
                    />
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, tags: pendingTags }));
                          setShowTagSelector(false);
                        }}
                        className="px-4 py-2 bg-[var(--color-text-primary)] text-white text-sm rounded hover:bg-[var(--color-sage)]"
                      >
                        确认
                      </button>
                      <button
                        onClick={() => {
                          setPendingTags([]);
                          setShowTagSelector(false);
                        }}
                        className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm rounded hover:bg-[var(--color-bg-tertiary)]"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
                {tags.length === 0 && !showTagSelector && (
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">暂无标签，请先前往标签管理创建</p>
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={e => setFormData({ ...formData, is_recommended: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-text-primary)]"
                  />
                  <span className="text-sm">推荐文章</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={e => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-text-primary)]"
                  />
                  <span className="text-sm">立即发布</span>
                </label>
              </div>

              <div>
                <label className="text-sm text-[var(--color-text-secondary)]">所需积分（0为免费）</label>
                <input
                  type="number"
                  min="0"
                  value={formData.points_required}
                  onChange={e => setFormData({ ...formData, points_required: parseInt(e.target.value) || 0 })}
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">音频链接</label>
                <input
                  type="text"
                  placeholder="请输入 R2 音频文件链接（可选）"
                  value={formData.audio_url}
                  onChange={e => setFormData({ ...formData, audio_url: e.target.value })}
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">支持 mp3、wav 等音频格式，用户可在文章详情页收听</p>
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">封面图片链接</label>
                <input
                  type="text"
                  placeholder="请输入外部图床图片链接（可选，建议宽高比 5:1）"
                  value={formData.cover_url}
                  onChange={e => setFormData({ ...formData, cover_url: e.target.value })}
                  className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">支持 jpg、png、webp 等格式，将显示在文章标题上方</p>
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">文章内容 <span className="text-[var(--color-danger)]">*</span></label>
                <MarkdownEditor
                  value={formData.content}
                  onChange={value => setFormData({ ...formData, content: value })}
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2">人工推荐课程（可选，最多2个）</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.manual_recommended_courses.map(courseId => {
                    const course = courses.find(c => c.id === courseId);
                    return course ? (
                      <span key={course.id} className="px-3 py-1 rounded text-sm bg-[var(--color-text-primary)] text-white flex items-center gap-1">
                        {course.title}
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            manual_recommended_courses: prev.manual_recommended_courses.filter(id => id !== courseId)
                          }))}
                          className="ml-1 hover:text-red-300"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
                {formData.manual_recommended_courses.length < 2 && courses.length > 0 && (
                  <select
                    value=""
                    onChange={e => {
                      if (e.target.value) {
                        setFormData(prev => ({
                          ...prev,
                          manual_recommended_courses: [...prev.manual_recommended_courses, e.target.value]
                        }));
                      }
                    }}
                    className="w-full border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
                  >
                    <option value="">选择推荐课程</option>
                    {courses
                      .filter(c => !formData.manual_recommended_courses.includes(c.id))
                      .map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                  </select>
                )}
                {courses.length === 0 && (
                  <p className="text-sm text-[var(--color-text-secondary)]">暂无课程，请先创建课程</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded hover:bg-[var(--color-bg-tertiary)]"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2 bg-[var(--color-text-primary)] text-white rounded hover:bg-[var(--color-sage)] disabled:opacity-50"
              >
                {loading ? '保存中...' : editingArticle ? '保存' : '发布'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
