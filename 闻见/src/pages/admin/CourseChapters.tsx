import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/client';
import { Plus, Edit2, Trash2, CornerUpLeft, GripVertical } from 'lucide-react';
import ByteMdEditor from '../../components/ByteMdEditor';

interface Chapter {
  id: string;
  course_id: string;
  title: string;
  sort_order: number | null;
  is_published: boolean | null;
}

interface Section {
  id: string;
  chapter_id: string;
  title: string;
  content: string | null;
  sort_order: number | null;
  is_published: boolean | null;
  is_preview: boolean | null;
  audio_url: string | null;
}

export default function CourseChapters() {
  const { courseId: rawCourseId } = useParams<{ courseId: string }>();
  const courseId = rawCourseId || '';
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [chapterForm, setChapterForm] = useState({ title: '', is_published: true });
  const [sectionForm, setSectionForm] = useState({ title: '', content: '', is_published: true, is_preview: false, audio_url: '' });
  const [sectionFormEmpty, setSectionFormEmpty] = useState({ title: '', content: '', is_published: true, is_preview: false });

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchChapters();
    }
  }, [courseId]);

  useEffect(() => {
    if (selectedChapter) {
      fetchSections(selectedChapter.id);
    }
  }, [selectedChapter]);

  const fetchCourse = async () => {
    const { data } = await supabase.from('courses').select('title').eq('id', courseId).single();
    if (data) setCourseTitle(data.title);
  };

  const fetchChapters = async () => {
    const { data } = await supabase.from('chapters').select('*').eq('course_id', courseId).order('sort_order');
    setChapters(data || []);
    if (data && data.length > 0 && !selectedChapter) {
      setSelectedChapter(data[0]);
    }
  };

  const fetchSections = async (chapterId: string) => {
    const { data } = await supabase.from('sections').select('*').eq('chapter_id', chapterId).order('sort_order');
    setSections(data || []);
  };

  const saveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChapter) {
      await supabase.from('chapters').update(chapterForm).eq('id', editingChapter.id);
    } else {
      const maxOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.sort_order || 0)) : -1;
      await supabase.from('chapters').insert({ ...chapterForm, course_id: courseId, sort_order: maxOrder + 1 });
    }
    setShowChapterModal(false);
    setEditingChapter(null);
    fetchChapters();
  };

  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChapter) return;
    if (editingSection) {
      await supabase.from('sections').update(sectionForm).eq('id', editingSection.id);
    } else {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order || 0)) : -1;
      await supabase.from('sections').insert({ ...sectionForm, chapter_id: selectedChapter.id, sort_order: maxOrder + 1 });
    }
    setShowSectionModal(false);
    setEditingSection(null);
    fetchSections(selectedChapter.id);
  };

  const deleteChapter = async (chapter: Chapter) => {
    if (!confirm(`删除章「${chapter.title}」？`)) return;
    await supabase.from('chapters').delete().eq('id', chapter.id);
    if (selectedChapter?.id === chapter.id) setSelectedChapter(null);
    fetchChapters();
  };

  const deleteSection = async (section: Section) => {
    if (!confirm(`删除节「${section.title}」？`)) return;
    await supabase.from('sections').delete().eq('id', section.id);
    if (selectedChapter) fetchSections(selectedChapter.id);
  };

  const moveChapter = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === chapters.length - 1) return;
    const newChapters = [...chapters];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newChapters[index], newChapters[targetIndex]] = [newChapters[targetIndex], newChapters[index]];
    for (let i = 0; i < newChapters.length; i++) {
      await supabase.from('chapters').update({ sort_order: i }).eq('id', newChapters[i].id);
    }
    setChapters(newChapters);
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
    for (let i = 0; i < newSections.length; i++) {
      await supabase.from('sections').update({ sort_order: i }).eq('id', newSections[i].id);
    }
    setSections(newSections);
  };

  const openChapterEdit = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setChapterForm({ title: chapter.title, is_published: chapter.is_published ?? true });
    setShowChapterModal(true);
  };

  const openSectionEdit = (section: Section) => {
    setEditingSection(section);
    setSectionForm({ title: section.title, content: section.content || '', is_published: section.is_published ?? true, is_preview: section.is_preview || false, audio_url: section.audio_url || '' });
    setShowSectionModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <button onClick={() => navigate('/admin/courses')} className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-2">
            <CornerUpLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-serif text-[var(--color-text-primary)]">{courseTitle} - 章节管理</h1>
        </div>
        <button onClick={() => { setEditingChapter(null); setChapterForm({ title: '', is_published: true }); setShowChapterModal(true); }} className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-4 py-2 text-sm">
          <Plus className="w-4 h-4" />
          <span>新建章</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-4">
          <h2 className="font-serif text-lg text-[var(--color-text-primary)] mb-4">章列表</h2>
          <div className="space-y-2">
            {chapters.map((chapter, index) => (
              <div key={chapter.id} onClick={() => setSelectedChapter(chapter)} className={`p-3 flex items-center justify-between cursor-pointer ${selectedChapter?.id === chapter.id ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]' : 'bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-tertiary)]'}`}>
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col">
                    <button onClick={(e) => { e.stopPropagation(); moveChapter(index, 'up'); }} disabled={index === 0} className="text-xs opacity-50 hover:opacity-100"><GripVertical className="w-3 h-3 rotate-90" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveChapter(index, 'down'); }} disabled={index === chapters.length - 1} className="text-xs opacity-50 hover:opacity-100"><GripVertical className="w-3 h-3 -rotate-90" /></button>
                  </div>
                  <span className="text-sm">第{index + 1}章</span>
                  <span className="font-light">{chapter.title}</span>
                </div>
                <div className="flex space-x-2">
                  <button onClick={(e) => { e.stopPropagation(); openChapterEdit(chapter); }} className="opacity-70 hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteChapter(chapter); }} className="opacity-70 hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg text-[var(--color-text-primary)]">{selectedChapter ? `${selectedChapter.title} - 节列表` : '请选择章'}</h2>
            {selectedChapter && (
              <button onClick={() => { setEditingSection(null); setSectionForm({ title: '', content: '', is_published: true, is_preview: false, audio_url: '' }); setShowSectionModal(true); }} className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-3 py-1.5 text-sm">
                <Plus className="w-4 h-4" />
                <span>新建节</span>
              </button>
            )}
          </div>
          {selectedChapter && (
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div key={section.id} className="p-3 flex items-center justify-between bg-[var(--color-bg-secondary)]">
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col">
                      <button onClick={() => moveSection(index, 'up')} disabled={index === 0} className="text-xs text-[var(--color-text-secondary)]"><GripVertical className="w-3 h-3 rotate-90" /></button>
                      <button onClick={() => moveSection(index, 'down')} disabled={index === sections.length - 1} className="text-xs text-[var(--color-text-secondary)]"><GripVertical className="w-3 h-3 -rotate-90" /></button>
                    </div>
                    <span className="text-sm text-[var(--color-text-secondary)]">第{index + 1}节</span>
                    <span className="font-light text-[var(--color-text-primary)]">{section.title}</span>
                    {section.is_preview && (
                      <span className="text-xs bg-[var(--color-border)] text-[var(--color-bg-secondary)] px-1.5 py-0.5 rounded">试读</span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => openSectionEdit(section)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => deleteSection(section)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {sections.length === 0 && <p className="text-center text-[var(--color-text-secondary)] py-8">暂无节</p>}
            </div>
          )}
        </div>
      </div>

      {showChapterModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-md p-6">
            <h2 className="text-xl font-serif mb-6">{editingChapter ? '编辑章' : '新建章'}</h2>
            <form onSubmit={saveChapter} className="space-y-4">
              <input type="text" value={chapterForm.title} onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })} placeholder="章标题" className="w-full border-b border-[var(--color-border)] py-2 bg-transparent" required />
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={chapterForm.is_published} onChange={(e) => setChapterForm({ ...chapterForm, is_published: e.target.checked })} className="accent-[var(--color-text-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">立即发布</span>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowChapterModal(false)} className="flex-1 py-2 border border-[var(--color-border)]">取消</button>
                <button type="submit" className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSectionModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-serif mb-6">{editingSection ? '编辑节' : '新建节'}</h2>
            <form onSubmit={saveSection} className="space-y-4">
              <input type="text" value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} placeholder="节标题" className="w-full border-b border-[var(--color-border)] py-2 bg-transparent" required />
              <ByteMdEditor value={sectionForm.content} onChange={(content) => setSectionForm({ ...sectionForm, content })} placeholder="节内容..." />
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">音频链接</label>
                <input
                  type="text"
                  value={sectionForm.audio_url}
                  onChange={(e) => setSectionForm({ ...sectionForm, audio_url: e.target.value })}
                  placeholder="请输入 R2 音频文件链接（可选）"
                  className="w-full border-b border-[var(--color-border)] py-2 bg-transparent"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">支持 mp3、wav 等音频格式，用户学习该小节时可收听</p>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={sectionForm.is_published} onChange={(e) => setSectionForm({ ...sectionForm, is_published: e.target.checked })} className="accent-[var(--color-text-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">立即发布</span>
              </div>
              <div className="flex items-center space-x-2">
                <input type="checkbox" checked={sectionForm.is_preview} onChange={(e) => setSectionForm({ ...sectionForm, is_preview: e.target.checked })} className="accent-[var(--color-text-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">设为试读章节</span>
              </div>
              <div className="flex space-x-4 pt-4">
                <button type="button" onClick={() => setShowSectionModal(false)} className="flex-1 py-2 border border-[var(--color-border)]">取消</button>
                <button type="submit" className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
