import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Copy, Trash2, XCircle, Loader2, Check, Search, Download } from 'lucide-react';

interface MembershipPlan {
  id: string;
  name: string;
  tier: string;
}

interface MembershipCode {
  id: string;
  code: string;
  plan_id: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string | null;
  plan?: { name: string };
  user?: { nickname: string | null; username: string };
}

export default function AdminMembershipCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<MembershipCode[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [generateCount, setGenerateCount] = useState(5);
  const [expiresAt, setExpiresAt] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: plansData } = await supabase
      .from('membership_plans')
      .select('id, name, tier')
      .eq('is_active', true)
      .order('sort_order');
    if (plansData) {
      setPlans(plansData);
      if (plansData.length > 0 && !selectedPlan) setSelectedPlan(plansData[0].id);
    }

    const { data: codesData } = await supabase
      .from('membership_codes')
      .select('*, plan:membership_plans(name), user:users!used_by(nickname, username)')
      .order('created_at', { ascending: false });

    if (codesData) setCodes(codesData as any);
    setLoading(false);
  };

  const generateCodes = async () => {
    if (!selectedPlan || !user?.id) return;
    setGenerating(true);

    const newCodes = [];
    for (let i = 0; i < generateCount; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      newCodes.push({
        code,
        plan_id: selectedPlan,
        created_by: user.id,
        expires_at: expiresAt || null,
      });
    }

    const { error } = await supabase.from('membership_codes').insert(newCodes);
    if (error) {
      alert('生成失败: ' + error.message);
    } else {
      await fetchData();
    }
    setGenerating(false);
  };

  const invalidateCode = async (id: string) => {
    if (!confirm('确定要使此邀请码失效吗？')) return;
    await supabase
      .from('membership_codes')
      .update({ expires_at: new Date(0).toISOString() })
      .eq('id', id);
    fetchData();
  };

  const deleteCode = async (id: string) => {
    if (!confirm('确定要删除此邀请码吗？此操作不可恢复。')) return;
    await supabase.from('membership_codes').delete().eq('id', id);
    fetchData();
  };

  const copyCode = (code: string, id: string) => {
    const link = `${window.location.origin}${window.location.pathname}#/register?membership_code=${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredCodes = codes.filter((c) => {
    if (filterStatus === 'unused') return !c.is_used;
    if (filterStatus === 'used') return c.is_used;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCodes.map(c => c.id)));
    }
  };

  const batchExport = () => {
    const selectedCodes = filteredCodes.filter(c => selectedIds.has(c.id));
    if (selectedCodes.length === 0) { alert('请先选择要导出的邀请码'); return; }
    const csv = [
      ['邀请码', '注册链接', '套餐', '状态', '使用者', '过期时间', '创建时间'],
      ...selectedCodes.map(c => [
        c.code,
        `${window.location.origin}${window.location.pathname}#/register?membership_code=${c.code}`,
        (c as any).plan?.name || '-',
        c.is_used ? '已使用' : '未使用',
        c.is_used ? ((c as any).user?.nickname || (c as any).user?.username || '-') : '-',
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期',
        c.created_at ? new Date(c.created_at).toLocaleString() : '-'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membership_codes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAllFiltered = () => {
    if (filteredCodes.length === 0) { alert('当前筛选条件下没有数据'); return; }
    const csv = [
      ['邀请码', '注册链接', '套餐', '状态', '使用者', '过期时间', '创建时间'],
      ...filteredCodes.map(c => [
        c.code,
        `${window.location.origin}${window.location.pathname}#/register?membership_code=${c.code}`,
        (c as any).plan?.name || '-',
        c.is_used ? '已使用' : '未使用',
        c.is_used ? ((c as any).user?.nickname || (c as any).user?.username || '-') : '-',
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期',
        c.created_at ? new Date(c.created_at).toLocaleString() : '-'
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membership_codes_all_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--secondary)]" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-[var(--color-text-primary)] font-light mb-2">会员邀请码</h1>
        <p className="text-sm text-[var(--color-text-secondary)] font-light">生成和管理会员开通邀请码</p>
      </div>

      {/* 生成区域 */}
      <div className="zen-card rounded-lg p-6">
        <h3 className="font-serif text-lg text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> 生成邀请码
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">选择套餐</label>
            <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className="zen-input text-sm">
              {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">生成数量</label>
            <input type="number" min={1} max={50} value={generateCount} onChange={(e) => setGenerateCount(Number(e.target.value))} className="zen-input text-sm" />
          </div>
          <div>
            <label className="block text-xs text-[var(--color-text-secondary)] mb-1">过期时间（可选）</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="zen-input text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={generateCodes} disabled={generating} className="zen-btn w-full py-2.5 text-sm flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> 生成</>}
            </button>
          </div>
        </div>
      </div>

      {/* 筛选 + 导出 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'unused', 'used'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setSelectedIds(new Set()); }}
              className={`px-4 py-1.5 rounded text-sm font-light transition-colors ${
                filterStatus === s
                  ? 'bg-[var(--secondary)] text-[var(--color-bg-primary)]'
                  : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {s === 'all' ? '全部' : s === 'unused' ? '未使用' : '已使用'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <button onClick={batchExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-light bg-[var(--secondary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-opacity">
              <Download className="w-3.5 h-3.5" /> 导出选中 ({selectedIds.size})
            </button>
          )}
          <button onClick={exportAllFiltered} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-light border border-[var(--border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--secondary)] transition-colors">
            <Download className="w-3.5 h-3.5" /> 导出全部
          </button>
          <span className="text-xs text-[var(--color-text-secondary)] font-light">
            共 {filteredCodes.length} 条
          </span>
        </div>
      </div>

      {/* 列表 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left py-3 px-2 w-10">
                <input type="checkbox" checked={filteredCodes.length > 0 && selectedIds.size === filteredCodes.length} onChange={toggleSelectAll} className="rounded border-[var(--color-border)]" />
              </th>
              <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-light">邀请码</th>
              <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-light">套餐</th>
              <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-light">状态</th>
              <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-light">使用者</th>
              <th className="text-left py-3 px-2 text-[var(--color-text-secondary)] font-light">创建时间</th>
              <th className="text-right py-3 px-2 text-[var(--color-text-secondary)] font-light">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredCodes.map((code) => (
              <tr key={code.id} className={`border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-tertiary)]/50 ${selectedIds.has(code.id) ? 'bg-[var(--muted)]' : ''}`}>
                <td className="py-3 px-2">
                  <input type="checkbox" checked={selectedIds.has(code.id)} onChange={() => toggleSelect(code.id)} className="rounded border-[var(--color-border)]" />
                </td>
                <td className="py-3 px-2 font-mono text-[var(--color-text-primary)]">{code.code}</td>
                <td className="py-3 px-2 text-[var(--color-text-secondary)]">{(code as any).plan?.name || '-'}</td>
                <td className="py-3 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    code.is_used
                      ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                      : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {code.is_used ? '已使用' : '未使用'}
                  </span>
                </td>
                <td className="py-3 px-2 text-[var(--color-text-secondary)]">
                  {code.is_used ? ((code as any).user?.nickname || (code as any).user?.username || '-') : '-'}
                </td>
                <td className="py-3 px-2 text-[var(--color-text-secondary)]">{formatDate(code.created_at)}</td>
                <td className="py-3 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => copyCode(code.code, code.id)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--secondary)] transition-colors" title="复制注册链接">
                      {copiedId === code.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    {!code.is_used && (
                      <button onClick={() => invalidateCode(code.id)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-orange-500 transition-colors" title="使失效">
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => deleteCode(code.id)} className="p-1.5 text-[var(--color-text-secondary)] hover:text-red-500 transition-colors" title="删除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCodes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[var(--color-text-secondary)] font-light">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
