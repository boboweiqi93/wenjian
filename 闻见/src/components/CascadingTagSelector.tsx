import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { X, ChevronRight } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CascadingTagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export default function CascadingTagSelector({ selectedTags, onChange }: CascadingTagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    setTags(data || []);
  };

  const parentTags = tags.filter(t => t.parent_id === null);
  const childTags = tags.filter(t => t.parent_id === selectedParentId);
  const selectedTagNames = tags.filter(t => selectedTags.includes(t.id)).map(t => t.name);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onChange(selectedTags.filter(id => id !== tagId));
    } else {
      onChange([...selectedTags, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter(id => id !== tagId));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <div className="flex-1 border border-[var(--color-border)] p-3">
          <div className="text-xs text-[var(--color-text-secondary)] mb-2">一级标签</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {parentTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setSelectedParentId(tag.id)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between ${
                  selectedParentId === tag.id ? 'bg-[var(--card)]' : 'hover:bg-[var(--color-bg-primary)]'
                }`}
              >
                <span className="text-sm">{tag.name}</span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 border border-[var(--color-border)] p-3">
          <div className="text-xs text-[var(--color-text-secondary)] mb-2">二级标签</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {selectedParentId ? (
              childTags.length > 0 ? (
                childTags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      selectedTags.includes(tag.id)
                        ? 'bg-[var(--color-text-primary)] text-white'
                        : 'hover:bg-[var(--color-bg-primary)]'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))
              ) : (
                <div className="text-sm text-[var(--color-text-secondary)] px-3 py-2">暂无二级标签</div>
              )
            ) : (
              <div className="text-sm text-[var(--color-text-secondary)] px-3 py-2">请先选择一级标签</div>
            )}
          </div>
        </div>
      </div>
      {selectedTagNames.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tagId => {
            const tag = tags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-text-primary)] text-white text-xs"
              >
                {tag.name}
                <button onClick={() => removeTag(tagId)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
