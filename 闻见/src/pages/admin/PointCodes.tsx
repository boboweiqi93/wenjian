import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Download, Trash2, Search, Filter, Loader2, Check, Copy, Link2 } from 'lucide-react';

interface PointCode {
  id: string;
  code: string;
  points_value: number;
  is_used: boolean | null;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  used_by_username?: string;
}

const pointsOptions = [10, 20, 40, 50, 100, 200, 500, 1000];

export default function AdminPointCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<PointCode[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(100);
  const [generateCount, setGenerateCount] = useState(10);
  const [expiresDays, setExpiresDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<PointCode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from('point_codes')
      .select('*, used_by_user:users!point_codes_used_by_fkey(username)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('获取引荐印记失败:', error);
      return;
    }
    setCodes(data?.map((item: any) => ({
      ...item,
      used_by_username: item.used_by_user?.username
    })) || []);
  };

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const generateCodes = async () => {
    setError('');
    setSuccess('');
    if (!user?.id) { setError('请先登录'); return; }
    setIsGenerating(true);
    try {
      const newCodes: any[] = [];
      for (let i = 0; i < generateCount; i++) {
        newCodes.push({
          code: generateCode(),
          points_value: selectedPoints,
          created_by: user.id,
          expires_at: expiresDays > 0 ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null
        });
      }
      const { data: inserted, error: insertError } = await supabase.from('point_codes').insert(newCodes).select();
      if (insertError) { setError('生成失败: ' + insertError.message); setIsGenerating(false); return; }
      setGeneratedCodes(inserted || []);
      setShowModal(false);
      setShowExportModal(true);
      fetchCodes();
    } catch (err: any) { setError('生成失败: ' + (err.message || '未知错误')); }
    finally { setIsGenerating(false); }
  };

  const copyToClipboard = async (text: string, code: string) => {
    try {
      let copied = false;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch (clipboardErr) {
          console.log('Clipboard API failed, trying fallback:', clipboardErr);
        }
      }

      if (!copied) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(textarea);

        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textarea.setSelectionRange(0, text.length);
        textarea.focus();

        try {
          copied = document.execCommand('copy');
        } catch (err) {
          console.error('execCommand copy failed:', err);
        }

        if (selection) selection.removeAllRanges();
        document.body.removeChild(textarea);
      }

      if (copied) {
        setCopiedCode(code);
        setSuccess('复制成功');
        setTimeout(() => { setCopiedCode(null); setSuccess(''); }, 2000);
      } else {
        setError('复制失败，请手动复制');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('复制失败:', err);
      setError('复制失败，请手动复制');
      setTimeout(() => setError(''), 3000);
    }
  };

  const copyAllGeneratedCodes = () => {
    const links = generatedCodes.map(c => `${c.code}: ${window.location.origin}/#/recharge?code=${c.code}`).join('\n');
    copyToClipboard(links, 'all-generated');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCodes.length && filteredCodes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCodes.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const getRechargeLink = (code: string) => {
    return `${window.location.origin}/#/recharge?code=${code}`;
  };

  const batchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个邀请码？`)) return;
    for (const id of selectedIds) {
      await supabase.from('point_codes').delete().eq('id', id);
    }
    setSelectedIds(new Set());
    fetchCodes();
  };

  const batchExport = () => {
    const selectedCodes = codes.filter(c => selectedIds.has(c.id));
    const csv = [
      ['邀请码', '邀请链接', '迹面值', '状态', '过期时间', '创建时间', '使用者'],
      ...selectedCodes.map(c => [
        c.code,
        getRechargeLink(c.code),
        c.points_value,
        c.is_used ? '已使用' : (c.expires_at && new Date(c.expires_at) < new Date() ? '已过期' : '未使用'),
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期',
        new Date(c.created_at || '').toLocaleString(),
        c.used_by_username || '-'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `point_codes_batch_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportCSV = () => {
    const csv = [
      ['邀请码', '邀请链接', '迹面值', '状态', '过期时间', '创建时间', '使用者'],
      ...filteredCodes.map(c => [
        c.code,
        getRechargeLink(c.code),
        c.points_value,
        c.is_used ? '已使用' : (c.expires_at && new Date(c.expires_at) < new Date() ? '已过期' : '未使用'),
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期',
        new Date(c.created_at || '').toLocaleString(),
        c.used_by_username || '-'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `point_codes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportGeneratedCodes = () => {
    const csv = [
      ['邀请码', '邀请链接', '迹面值', '过期时间'],
      ...generatedCodes.map(c => [
        c.code,
        getRechargeLink(c.code),
        c.points_value,
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `point_codes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setShowExportModal(false);
    setGeneratedCodes([]);
  };

  const deleteCode = async (id: string) => {
    if (!confirm('确定删除该邀请码？')) return;
    await supabase.from('point_codes').delete().eq('id', id);
    fetchCodes();
  };

  const isExpired = (code: PointCode) => {
    return code.expires_at && new Date(code.expires_at) < new Date();
  };

  const filteredCodes = codes.filter(c => {
    if (filter === 'used') return c.is_used;
    if (filter === 'unused') return !c.is_used && !isExpired(c);
    if (filter === 'expired') return isExpired(c) && !c.is_used;
    return true;
  }).filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">引荐印记管理</h1>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]">
            <Download className="w-4 h-4" /><span>导出CSV</span>
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[var(--color-sage)]">
            <Plus className="w-4 h-4" /><span>批量生成</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">{success}</div>}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] px-4 py-2 rounded">
          <span className="text-[var(--color-text-secondary)] text-sm">已选择 {selectedIds.size} 项</span>
          <button onClick={batchDelete} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
            <Trash2 className="w-4 h-4" />批量删除
          </button>
          <button onClick={batchExport} className="text-[var(--color-text-primary)] hover:text-[var(--color-sage)] text-sm flex items-center gap-1">
            <Download className="w-4 h-4" />批量导出
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm">取消选择</button>
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input type="text" placeholder="搜索邀请码..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] py-2 focus:outline-none">
            <option value="all">全部</option>
            <option value="unused">未使用</option>
            <option value="used">已使用</option>
            <option value="expired">已过期</option>
          </select>
        </div>
      </div>

      <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedIds.size === filteredCodes.length && filteredCodes.length > 0} onChange={toggleSelectAll} className="w-4 h-4" /></th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">邀请码</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">迹面值</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">状态</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">过期时间</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">创建时间</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">使用者</th>
              <th className="px-4 py-3 text-center text-xs font-light text-[var(--color-text-secondary)]">链接</th>
              <th className="px-4 py-3 text-right text-xs font-light text-[var(--color-text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filteredCodes.map((code) => (
              <tr key={code.id} className="hover:bg-[var(--color-bg-tertiary)]/50">
                <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.has(code.id)} onChange={() => toggleSelect(code.id)} className="w-4 h-4" /></td>
                <td className="px-4 py-4 font-mono text-[var(--color-text-primary)] text-sm">{code.code}</td>
                <td className="px-4 py-4 text-[var(--color-text-primary)] font-medium">{code.points_value} 迹</td>
                <td className="px-4 py-4">
                  {code.is_used ? <span className="text-xs bg-[var(--color-border)] text-[var(--color-text-secondary)] px-2 py-1">已使用</span> :
                   isExpired(code) ? <span className="text-xs bg-red-100 text-red-600 px-2 py-1">已过期</span> :
                   <span className="text-xs bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-2 py-1">未使用</span>}
                </td>
                <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">{code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '永不过期'}</td>
                <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">{new Date(code.created_at || '').toLocaleDateString()}</td>
                <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">{code.used_by_username || '-'}</td>
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => copyToClipboard(getRechargeLink(code.code), code.code)}
                    className={`px-3 py-1.5 rounded text-sm flex items-center gap-1.5 ${
                      copiedCode === code.code
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
                    }`}
                    title="复制邀请链接"
                  >
                    {copiedCode === code.code ? (
                      <><Check className="w-3.5 h-3.5" /><span>已复制</span></>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /><span>复制</span></>
                    )}
                  </button>
                </td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => deleteCode(code.id)} className="text-[var(--color-danger)] hover:text-[var(--color-danger)]"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-tertiary)] p-8 w-full max-w-md">
            <h2 className="font-serif text-xl font-light text-[var(--color-text-primary)] mb-6">批量生成引荐印记</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">迹面值</label>
                <select value={selectedPoints} onChange={(e) => setSelectedPoints(parseInt(e.target.value))} className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none">
                  {pointsOptions.map(p => <option key={p} value={p}>{p} 迹</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">生成数量</label>
                <input type="number" value={generateCount} onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)} className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none" min="1" max="100" />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">有效期（天，0为永不过期）</label>
                <input type="number" value={expiresDays} onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)} className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none" min="0" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowModal(false); setError(''); }} className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)]" disabled={isGenerating}>取消</button>
              <button onClick={generateCodes} className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] flex items-center justify-center gap-2" disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /><span>生成中...</span></> : <span>生成</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-tertiary)] p-8 w-full max-w-lg">
            <h2 className="font-serif text-xl font-light text-[var(--color-text-primary)] mb-4">邀请码生成成功</h2>
            <p className="text-[var(--color-text-secondary)] mb-4">成功生成 {generatedCodes.length} 个引荐印记（{selectedPoints}迹）</p>
            <div className="bg-[var(--color-bg-tertiary)] p-4 rounded mb-6 max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[var(--color-text-secondary)]"><th className="text-left py-2">邀请码</th><th className="text-right py-2">操作</th></tr></thead>
                <tbody>
                  {generatedCodes.map((code, index) => (
                    <tr key={index} className="border-t border-[var(--color-border)]">
                      <td className="py-2 font-mono text-[var(--color-text-primary)]">{code.code}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => copyToClipboard(getRechargeLink(code.code), code.code)}
                          className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                            copiedCode === code.code
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]'
                          }`}
                        >
                          {copiedCode === code.code ? (
                            <><Check className="w-3 h-3" /><span>已复制</span></>
                          ) : (
                            <><Copy className="w-3 h-3" /><span>复制</span></>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowExportModal(false); setGeneratedCodes([]); }} className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)]">关闭</button>
              <button onClick={copyAllGeneratedCodes} className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] flex items-center justify-center gap-2">
                <Copy className="w-4 h-4" /><span>复制全部链接</span>
              </button>
              <button onClick={exportGeneratedCodes} className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /><span>导出CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
