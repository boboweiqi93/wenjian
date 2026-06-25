import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit2, Trash2, User } from 'lucide-react';

interface Author {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export default function AdminAuthors() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    avatar_url: '',
  });

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    const { data } = await supabase
      .from('authors')
      .select('*')
      .order('created_at', { ascending: false });
    setAuthors(data || []);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingAuthor) {
        await supabase.from('authors').update(formData).eq('id', editingAuthor.id);
      } else {
        await supabase.from('authors').insert(formData);
      }
      setShowModal(false);
      setEditingAuthor(null);
      resetForm();
      fetchAuthors();
    } catch (err) {
      alert('保存失败，请重试');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', bio: '', avatar_url: '' });
  };

  const handleEdit = (author: Author) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name,
      bio: author.bio || '',
      avatar_url: author.avatar_url || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该作者？')) return;
    await supabase.from('authors').delete().eq('id', id);
    fetchAuthors();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)]">作者库</h1>
        <button
          onClick={() => { setEditingAuthor(null); resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-text-primary)] text-white rounded"
        >
          <Plus className="w-4 h-4" />
          <span>添加作者</span>
        </button>
      </div>

      <div className="bg-[var(--color-bg-primary)] rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">头像</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-light text-[var(--color-text-secondary)]">简介</th>
              <th className="px-4 py-3 text-right text-sm font-light text-[var(--color-text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {authors.map(author => (
              <tr key={author.id} className="hover:bg-[var(--color-bg-tertiary)]">
                <td className="px-4 py-3">
                  {author.avatar_url ? (
                    <img src={author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--color-border)] flex items-center justify-center">
                      <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-primary)]">{author.name}</td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] text-sm max-w-xs truncate">{author.bio || '-'}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(author)} className="text-[var(--color-text-primary)] hover:text-[var(--color-sage)] mr-3">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(author.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-primary)] rounded-lg w-full max-w-md p-6">
            <h2 className="text-xl font-serif mb-4">{editingAuthor ? '编辑作者' : '添加作者'}</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="作者姓名"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
              />
              <textarea
                placeholder="作者简介"
                value={formData.bio}
                onChange={e => setFormData({ ...formData, bio: e.target.value })}
                className="w-full border border-[var(--color-border)] rounded p-2 h-20 focus:outline-none focus:border-[var(--color-text-primary)]"
              />
              <input
                type="text"
                placeholder="头像URL"
                value={formData.avatar_url}
                onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full border-b border-[var(--color-border)] py-2 focus:outline-none focus:border-[var(--color-text-primary)]"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded">取消</button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-[var(--color-text-primary)] text-white rounded">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
