import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { ExternalLink, Save, AlertCircle, Check } from 'lucide-react';

interface ExternalLinkItem {
  id: string;
  key: string;
  name: string;
  url: string;
  description: string | null;
  is_enabled: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function ExternalLinks() {
  const [links, setLinks] = useState<ExternalLinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('external_links')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('获取外部链接失败:', error);
    } else {
      setLinks(data || []);
    }
    setLoading(false);
  };

  const handleUpdateLink = async (id: string, updates: Partial<ExternalLinkItem>) => {
    setSaving(true);
    const { error } = await supabase
      .from('external_links')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      setMessage({ type: 'error', text: '保存失败: ' + error.message });
    } else {
      setMessage({ type: 'success', text: '保存成功' });
      fetchLinks();
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUrlChange = (id: string, newUrl: string) => {
    setLinks(prev => prev.map(link =>
      link.id === id ? { ...link, url: newUrl } : link
    ));
  };

  const handleToggleEnabled = (id: string, currentEnabled: boolean | null) => {
    handleUpdateLink(id, { is_enabled: !currentEnabled });
  };

  const handleSaveUrl = (link: ExternalLinkItem) => {
    handleUpdateLink(link.id, { url: link.url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-sage)]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-stone-800 font-light">外部链接配置</h1>
        <p className="text-stone-500 text-sm mt-1">管理平台外部链接地址</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {links.map((link) => (
          <div
            key={link.id}
            className="bg-white rounded-lg p-6 border border-stone-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-5 h-5 text-[var(--color-sage)]" />
                <div>
                  <h3 className="font-serif text-stone-800">{link.name}</h3>
                  <p className="text-xs text-stone-500">{link.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-500">启用</span>
                <button
                  onClick={() => handleToggleEnabled(link.id, link.is_enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    link.is_enabled ? 'bg-[var(--color-sage)]' : 'bg-stone-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      link.is_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-stone-600">链接地址</label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={link.url}
                  onChange={(e) => handleUrlChange(link.id, e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)] focus:border-transparent text-sm"
                />
                <button
                  onClick={() => handleSaveUrl(link)}
                  disabled={saving || !link.url}
                  className="px-4 py-2 bg-[var(--color-sage)] text-white rounded-lg hover:bg-[var(--color-sage)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
              </div>
              {!link.url && link.is_enabled && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  链接地址为空，前端将显示为未配置状态
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {links.length === 0 && (
        <div className="text-center py-16 text-stone-400">
          <ExternalLink className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>暂无外部链接配置</p>
        </div>
      )}
    </div>
  );
}
