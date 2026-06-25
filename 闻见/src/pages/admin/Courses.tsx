import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { Plus, Edit2, Eye, EyeOff, List, User, Users, Trash2 } from 'lucide-react';
import ByteMdEditor from '../../components/ByteMdEditor';
import CascadingTagSelector from '../../components/CascadingTagSelector';

interface Course {
  id: string;
  title: string;
  short_name: string | null;
  description: string | null;
  content: string | null;
  cover: string | null;
  points_price: number | null;
  purchase_url: string | null;
  is_published: boolean | null;
  author_name: string | null;
  author_bio: string | null;
  author_id: string | null;
  category: string | null;
  is_recommended: boolean | null;
  initial_students_count: number | null;
  students_count: number | null;
  status: string | null;
  tags: string[] | null;
  audio_url: string | null;
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

export default function AdminCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    short_name: '',
    description: '',
    cover: '',
    content: '',
    points_price: 0,
    purchase_url: '',
    is_published: true,
    author_name: '',
    author_bio: '',
    author_id: '',
    category: '',
    is_recommended: false,
    initial_students_count: 0,
    status: 'updating',
    audio_url: '',
  });

  useEffect(() => {
    fetchCourses();
    fetchAuthors();
    fetchTags();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title, short_name, description, content, cover, points_price, purchase_url, is_published, author_name, author_bio, author_id, category, is_recommended, initial_students_count, students_count, status, created_at, tags, audio_url')
      .order('created_at', { ascending: false });
    setCourses(data || []);
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    setTags(data || []);
  };

  const fetchAuthors = async () => {
    const { data } = await supabase.from('authors').select('*').order('name');
    setAuthors(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        author_name: formData.author_id ? authors.find(a => a.id === formData.author_id)?.name || formData.author_name : formData.author_name,
        author_bio: formData.author_id ? authors.find(a => a.id === formData.author_id)?.bio || formData.author_bio : formData.author_bio,
      };

      const finalData = {
        ...submitData,
        students_count: (submitData.initial_students_count || 0),
        tags: selectedTags,
      };

      if (editingCourse) {
        const { error } = await supabase.from('courses').update(finalData).eq('id', editingCourse.id);
        if (error) throw error;
        alert('课程更新成功');
      } else {
        const { error } = await supabase.from('courses').insert(finalData);
        if (error) throw error;
        alert('课程创建成功');
      }
      setShowModal(false);
      setEditingCourse(null);
      await fetchCourses();
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    }
  };

  const togglePublish = async (course: Course) => {
    if (!confirm(`确定要${course.is_published ? '下架' : '上架'}课程「${course.title}」吗？`)) return;
    await supabase
      .from('courses')
      .update({ is_published: !course.is_published })
      .eq('id', course.id);
    fetchCourses();
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      short_name: course.short_name || '',
      description: course.description || '',
      cover: course.cover || '',
      content: course.content || '',
      points_price: course.points_price || 0,
      purchase_url: course.purchase_url || '',
      is_published: course.is_published ?? true,
      author_name: course.author_name || '',
      author_bio: course.author_bio || '',
      author_id: course.author_id || '',
      category: course.category || '',
      is_recommended: course.is_recommended ?? false,
      initial_students_count: course.initial_students_count || 0,
      status: course.status || 'updating',
      audio_url: course.audio_url || '',
    });
    const courseTags = course.tags || [];
    setSelectedTags(courseTags);
    setTempSelectedTags(courseTags);
    setShowTagSelector(false);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingCourse(null);
    setFormData({
      title: '',
      short_name: '',
      description: '',
      cover: '',
      content: '',
      points_price: 0,
      purchase_url: '',
      is_published: true,
      author_name: '',
      author_bio: '',
      author_id: '',
      category: '',
      is_recommended: false,
      initial_students_count: 0,
      status: 'updating',
      audio_url: '',
    });
    setSelectedTags([]);
    setTempSelectedTags([]);
    setShowTagSelector(false);
    setShowModal(true);
  };

  const openTagSelector = () => {
    setTempSelectedTags(selectedTags);
    setShowTagSelector(true);
  };

  const closeTagSelector = () => {
    setShowTagSelector(false);
    setTempSelectedTags([]);
  };

  const confirmTags = () => {
    setSelectedTags(tempSelectedTags);
    setShowTagSelector(false);
  };

  const toggleTempTag = (tagId: string) => {
    setTempSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const handleAuthorChange = (authorId: string) => {
    const author = authors.find(a => a.id === authorId);
    setFormData(prev => ({
      ...prev,
      author_id: authorId,
      author_name: author?.name || prev.author_name,
      author_bio: author?.bio || prev.author_bio,
    }));
  };

  const handleDelete = async (course: Course) => {
    if (!confirm(`确定要删除课程「${course.title}」吗？此操作不可恢复。`)) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', course.id);
      if (error) throw error;
      alert('课程删除成功');
      fetchCourses();
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">课程管理</h1>
          <p className="text-[var(--color-text-secondary)] mt-2 font-light text-sm">管理课程内容与发布状态</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-6 py-3 text-sm tracking-wide hover:bg-[var(--color-sage)]"
        >
          <Plus className="w-4 h-4" />
          <span>新建课程</span>
        </button>
      </div>

      <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)]">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] font-light">
          <div className="col-span-4">课程名称</div>
          <div className="col-span-2">作者</div>
          <div className="col-span-1">迹</div>
          <div className="col-span-1">在学人数</div>
          <div className="col-span-1">状态</div>
          <div className="col-span-3 text-right">操作</div>
        </div>
        {courses.map((course) => (
          <div
            key={course.id}
            className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--color-border)] last:border-0 items-center hover:bg-[var(--color-bg-tertiary)]"
          >
            <div className="col-span-4">
              <h3 className="font-serif text-[var(--color-text-primary)] font-light">{course.title}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1 line-clamp-1 font-light">
                {course.description || '暂无简介'}
              </p>
            </div>
            <div className="col-span-2 text-sm text-[var(--color-text-secondary)] font-light">
              {course.author_name || '-'}
            </div>
            <div className="col-span-1 text-sm text-[var(--color-sage)] font-light">
              {course.points_price}
            </div>
            <div className="col-span-1 text-sm text-[var(--color-text-secondary)] font-light">
              {course.students_count || 0}
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <span
                className={`text-xs px-2 py-1 font-light ${
                  course.is_published
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]'
                    : 'bg-[var(--color-border)] text-[var(--color-text-secondary)]'
                }`}
              >
                {course.is_published ? '已发布' : '已下架'}
              </span>
              <span
                className={`text-xs px-2 py-1 font-light ${
                  course.status === 'completed'
                    ? 'bg-[var(--color-sage)] text-[var(--color-bg-secondary)]'
                    : 'bg-[var(--color-sage)] text-[var(--color-bg-secondary)]'
                }`}
              >
                {course.status === 'completed' ? '已完结' : '更新中'}
              </span>
            </div>
            <div className="col-span-3 flex items-center justify-end space-x-3">
              <button
                onClick={() => navigate(`/admin/courses/${course.id}/chapters`)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title="管理章节"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => togglePublish(course)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title={course.is_published ? '下架' : '上架'}
              >
                {course.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => openEdit(course)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                title="编辑"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(course)}
                className="text-[var(--color-text-secondary)] hover:text-red-600"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <h2 className="text-xl font-serif font-light text-[var(--color-text-primary)] mb-8">
                {editingCourse ? '编辑课程' : '新建课程'}
              </h2>
              <form id="course-form" onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">标题</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">简称</label>
                  <input
                    type="text"
                    value={formData.short_name}
                    onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    placeholder="用于解锁按钮显示，如未填写则显示完整标题"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">简介</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] resize-none h-20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">封面图URL</label>
                  <input
                    type="text"
                    value={formData.cover}
                    onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">所需迹</label>
                  <input
                    type="number"
                    value={formData.points_price}
                    onChange={(e) => setFormData({ ...formData, points_price: parseInt(e.target.value) })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">购买链接</label>
                  <input
                    type="url"
                    value={formData.purchase_url}
                    onChange={(e) => setFormData({ ...formData, purchase_url: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    placeholder="https://example.com/buy (可选)"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">初始在学人数</label>
                  <input
                    type="number"
                    value={formData.initial_students_count}
                    onChange={(e) => setFormData({ ...formData, initial_students_count: parseInt(e.target.value) })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    min="0"
                    placeholder="设置初始在学人数，用于展示课程热度"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">分类</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    placeholder="输入课程分类，如：编程、设计、商业"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] mb-2 font-light">
                    <User className="w-4 h-4" />
                    选择作者
                  </label>
                  <select
                    value={formData.author_id}
                    onChange={(e) => handleAuthorChange(e.target.value)}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  >
                    <option value="">选择作者</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>{author.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">作者名称</label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    placeholder="输入作者名称"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">作者简介</label>
                  <textarea
                    value={formData.author_bio}
                    onChange={(e) => setFormData({ ...formData, author_bio: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] resize-none h-20"
                    placeholder="输入作者简介"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">课程内容</label>
                  <ByteMdEditor
                    value={formData.content}
                    onChange={(content) => setFormData({ ...formData, content })}
                    placeholder="# 课程标题\n\n在此输入课程内容，支持 Markdown 格式..."
                  />
                </div>
                <div className="flex items-center space-x-3 pt-4">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-text-primary)]"
                  />
                  <label className="text-sm text-[var(--color-text-secondary)] font-light">立即发布</label>
                </div>
                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="checkbox"
                    checked={formData.is_recommended}
                    onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
                    className="w-4 h-4 accent-[var(--color-text-primary)]"
                  />
                  <label className="text-sm text-[var(--color-text-secondary)] font-light">设为推荐</label>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">更新状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  >
                    <option value="updating">更新中</option>
                    <option value="completed">已完结</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">音频链接</label>
                  <input
                    type="text"
                    value={formData.audio_url}
                    onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                    placeholder="请输入 R2 音频文件链接（可选）"
                  />
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">支持 mp3、wav 等音频格式，用户可在课程详情页收听</p>
                </div>
                <div>
                  <label className="block text-sm text-[var(--color-text-secondary)] mb-3 font-light">标签</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <span key={tag.id} className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]">
                          {tag.name}
                        </span>
                      ) : null;
                    })}
                    <button
                      type="button"
                      onClick={openTagSelector}
                      className="px-3 py-1.5 text-sm rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    >
                      {selectedTags.length > 0 ? '修改标签' : '选择标签'}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] text-sm tracking-wide"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[var(--color-sage)] text-sm tracking-wide"
                  >
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showTagSelector && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 rounded-lg">
            <h3 className="text-lg font-serif font-light text-[var(--color-text-primary)] mb-4">选择标签</h3>
            <CascadingTagSelector
              selectedTags={tempSelectedTags}
              onChange={setTempSelectedTags}
            />
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={confirmTags}
                className="flex-1 py-2.5 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] text-sm rounded hover:bg-[var(--color-sage)] transition-colors"
              >
                确认
              </button>
              <button
                type="button"
                onClick={closeTagSelector}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] text-sm rounded hover:bg-[var(--color-bg-tertiary)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
