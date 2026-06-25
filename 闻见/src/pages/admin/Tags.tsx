import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Trash2, Loader2, AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string | null;
}

interface TagTreeNode extends Tag {
  children: Tag[];
  isExpanded: boolean;
}

export default function AdminTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagTree, setTagTree] = useState<TagTreeNode[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    const tagsData = data || [];
    setTags(tagsData);
    buildTagTree(tagsData);
  };

  const buildTagTree = (tags: Tag[]) => {
    const rootTags: TagTreeNode[] = [];
    const tagMap = new Map<string, TagTreeNode>();

    tags.forEach(tag => {
      tagMap.set(tag.id, { ...tag, children: [], isExpanded: false });
    });

    tags.forEach(tag => {
      const node = tagMap.get(tag.id)!;
      if (tag.parent_id) {
        const parent = tagMap.get(tag.parent_id);
        if (parent) {
          parent.children.push(tag);
        }
      } else {
        rootTags.push(node);
      }
    });

    setTagTree(rootTags);
  };

  const toggleExpand = (tagId: string) => {
    setTagTree(prev => prev.map(node => {
      if (node.id === tagId) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      return node;
    }));
  };

  const addTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    if (tags.some(tag => tag.name.toLowerCase() === trimmedName.toLowerCase() && tag.parent_id === (selectedParentId || null))) {
      setError(`标签 "${trimmedName}" 已存在`);
      return;
    }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase
      .from('tags')
      .insert({
        name: trimmedName,
        parent_id: selectedParentId || null
      });

    if (insertError) {
      setError('添加失败，请重试');
    } else {
      setNewTagName('');
      setSelectedParentId('');
      fetchTags();
    }
    setLoading(false);
  };

  const deleteTag = async (id: string) => {
    if (!confirm('确定删除该标签？')) return;
    await supabase.from('tags').delete().eq('id', id);
    fetchTags();
  };

  const renderTagRow = (tag: TagTreeNode, level: number = 0) => (
    <React.Fragment key={tag.id}>
      <tr className={level > 0 ? 'bg-[#f8f6f3]' : ''}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {tag.children.length > 0 && (
              <button
                onClick={() => toggleExpand(tag.id)}
                className="p-1 hover:bg-[#e0d8cf] rounded"
              >
                {tag.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <span className={level > 0 ? 'text-[var(--color-text-secondary)] text-sm' : 'text-[var(--color-text-primary)] font-medium'}>
              {tag.name}
            </span>
            {level === 0 && tag.children.length > 0 && (
              <span className="text-xs text-[var(--color-text-secondary)] bg-[#e0d8cf] px-2 py-0.5 rounded">
                {tag.children.length}个子标签
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-[var(--color-text-secondary)] text-sm">
          {tag.parent_id ? '二级标签' : '一级标签'}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => deleteTag(tag.id)}
            className="text-[#8a6b6b] hover:text-[#6b4a4a]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
      {tag.isExpanded && tag.children.map(child => {
        const childNode: TagTreeNode = { ...child, children: [], isExpanded: false };
        return renderTagRow(childNode, level + 1);
      })}
    </React.Fragment>
  );

  const rootTags = tags.filter(t => !t.parent_id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)]">标签管理</h1>

      <div className="bg-[var(--color-bg-tertiary)] border border-[#e0d8cf] p-4 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => {
              setNewTagName(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
            placeholder="输入标签名称"
            className="flex-1 px-4 py-2 border border-[var(--color-border)] bg-transparent"
          />
          <select
            value={selectedParentId}
            onChange={(e) => setSelectedParentId(e.target.value)}
            className="px-4 py-2 border border-[var(--color-border)] bg-transparent min-w-[150px]"
          >
            <option value="">作为一级标签</option>
            {rootTags.map(tag => (
              <option key={tag.id} value={tag.id}>{tag.name} 的子标签</option>
            ))}
          </select>
          <button
            onClick={addTag}
            disabled={loading || !newTagName.trim()}
            className="px-4 py-2 bg-[var(--color-text-primary)] text-white flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            添加
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-[var(--color-danger)] text-sm bg-[rgba(184,138,138,0.1)] p-3 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      <div className="bg-[var(--color-bg-tertiary)] border border-[#e0d8cf]">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)]">标签名称</th>
              <th className="px-4 py-3 text-left text-xs text-[var(--color-text-secondary)]">层级</th>
              <th className="px-4 py-3 text-right text-xs text-[var(--color-text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0d8cf]">
            {tagTree.map(tag => renderTagRow(tag))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
