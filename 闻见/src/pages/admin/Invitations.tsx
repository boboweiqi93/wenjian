import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Copy, Check, Link2, Loader2, Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';

interface Invitation {
  id: string;
  code: string;
  created_at: string | null;
  expires_at: string | null;
  is_used: boolean | null;
  used_at: string | null;
  used_by: string | null;
}

const PAGE_SIZE = 20;

export default function AdminInvitations() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [expiresDays, setExpiresDays] = useState(7);
  const [generateCount, setGenerateCount] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [filter, setFilter] = useState<'all' | 'used' | 'unused' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection states for batch export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Generated codes result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<{code: string; expires_at: string | null}[]>([]);

  useEffect(() => {
    fetchInvitations();
  }, [currentPage, filter, searchQuery]);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('invitations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filter === 'used') {
        query = query.eq('is_used', true);
      } else if (filter === 'unused') {
        query = query.eq('is_used', false);
      } else if (filter === 'expired') {
        query = query.lt('expires_at', new Date().toISOString()).eq('is_used', false);
      }

      if (searchQuery.trim()) {
        query = query.ilike('code', `%${searchQuery}%`);
      }

      const from = (currentPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;
      
      if (fetchError) {
        console.error('获取邀请码失败:', fetchError);
        return;
      }

      setInvitations(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('获取邀请码异常:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInvitation = async () => {
    if (!user?.id) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    const count = Math.min(Math.max(generateCount, 1), 50);
    const invitationsToInsert = [];

    for (let i = 0; i < count; i++) {
      const code = generateCode();
      const expiresAt = expiresDays > 0
        ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      invitationsToInsert.push({
        code,
        created_by: user.id,
        expires_at: expiresAt,
      });
    }

    const { error } = await supabase.from('invitations').insert(invitationsToInsert);

    if (error) {
      alert('生成邀请码失败：' + error.message);
      setLoading(false);
      return;
    }

    // Save generated codes for export
    setGeneratedCodes(invitationsToInsert.map(inv => ({ code: inv.code, expires_at: inv.expires_at })));
    setLoading(false);
    setShowModal(false);
    setShowResultModal(true);
    setGenerateCount(1);
    fetchInvitations();
  };

  const getInviteLink = (code: string) => {
    return `${window.location.origin}/#/register?code=${code}`;
  };

  const copyLink = async (code: string, id: string) => {
    const link = getInviteLink(code);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getStatus = (inv: Invitation) => {
    if (inv.is_used) return { text: '已使用', color: 'text-[var(--color-sage)]' };
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return { text: '已过期', color: 'text-[var(--color-text-secondary)]' };
    }
    return { text: '未使用', color: 'text-[var(--color-text-primary)]' };
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === invitations.length && invitations.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invitations.map(inv => inv.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const batchExportLinks = () => {
    const selectedInvitations = invitations.filter(inv => selectedIds.has(inv.id));
    const links = selectedInvitations.map(inv => getInviteLink(inv.code)).join('\n');

    const blob = new Blob([links], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invite_links_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportGeneratedLinks = () => {
    const links = generatedCodes.map(c => getInviteLink(c.code)).join('\n');
    const blob = new Blob([links], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invite_links_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowResultModal(false);
    setGeneratedCodes([]);
  };

  const copyAllGeneratedLinks = async () => {
    const links = generatedCodes.map(c => getInviteLink(c.code)).join('\n');
    try {
      await navigator.clipboard.writeText(links);
      alert(`已复制 ${generatedCodes.length} 个邀请链接`);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = links;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(`已复制 ${generatedCodes.length} 个邀请链接`);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedIds(new Set());
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'used' | 'unused' | 'expired') => {
    setFilter(newFilter);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-[var(--border)] pb-8">
        <div>
          <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">注册邀请码管理</h1>
          <p className="text-[var(--color-text-secondary)] mt-2 font-light text-sm">生成和管理网站注册邀请码</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-6 py-3 text-sm tracking-wide hover:bg-[var(--color-sage)]"
        >
          <Plus className="w-4 h-4" />
          <span>生成邀请码</span>
        </button>
      </div>

      {/* Batch action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] px-4 py-3 rounded">
          <span className="text-[var(--color-text-secondary)] text-sm">已选择 {selectedIds.size} 项</span>
          <button 
            onClick={batchExportLinks} 
            className="text-[var(--color-text-primary)] hover:text-[var(--color-sage)] text-sm flex items-center gap-1"
          >
            <Download className="w-4 h-4" />导出链接
          </button>
          <button 
            onClick={() => setSelectedIds(new Set())} 
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm"
          >
            取消选择
          </button>
        </div>
      )}

      {/* Search and filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input 
            type="text" 
            placeholder="搜索邀请码..." 
            value={searchQuery} 
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]" 
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <select 
            value={filter} 
            onChange={(e) => handleFilterChange(e.target.value as any)} 
            className="bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] py-2 focus:outline-none"
          >
            <option value="all">全部</option>
            <option value="unused">未使用</option>
            <option value="used">已使用</option>
            <option value="expired">已过期</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>共 {totalCount} 条记录</span>
        <span>第 {currentPage} / {totalPages || 1} 页</span>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-bg-tertiary)]">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
          <div className="col-span-1">
            <input 
              type="checkbox" 
              checked={selectedIds.size === invitations.length && invitations.length > 0} 
              onChange={toggleSelectAll} 
              className="w-4 h-4" 
            />
          </div>
          <div className="col-span-3">邀请码</div>
          <div className="col-span-2">状态</div>
          <div className="col-span-3">创建时间</div>
          <div className="col-span-2">过期时间</div>
          <div className="col-span-1 text-right">操作</div>
        </div>
        
        {isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-primary)] mx-auto" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-secondary)] font-light">
            暂无邀请码
          </div>
        ) : (
          invitations.map((inv) => (
            <div key={inv.id} className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[var(--color-border)]/50 items-center hover:bg-[var(--color-bg-tertiary)]">
              <div className="col-span-1">
                <input 
                  type="checkbox" 
                  checked={selectedIds.has(inv.id)} 
                  onChange={() => toggleSelect(inv.id)} 
                  className="w-4 h-4" 
                />
              </div>
              <div className="col-span-3 font-mono text-[var(--color-text-primary)]">{inv.code}</div>
              <div className={`col-span-2 text-sm ${getStatus(inv).color}`}>{getStatus(inv).text}</div>
              <div className="col-span-3 text-sm text-[var(--color-text-secondary)]">{new Date(inv.created_at || '').toLocaleDateString()}</div>
              <div className="col-span-2 text-sm text-[var(--color-text-secondary)]">
                {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '永不过期'}
              </div>
              <div className="col-span-1 text-right">
                {!inv.is_used && (
                  <button
                    onClick={() => copyLink(inv.code, inv.id)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    {copiedId === inv.id ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm">上一页</span>
          </button>
          
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-3 py-2 text-[var(--color-text-secondary)]">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => handlePageChange(page as number)}
                  className={`px-3 py-2 rounded-lg text-sm min-w-[36px] ${
                    currentPage === page
                      ? 'bg-[var(--color-text-primary)] text-white'
                      : 'border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {page}
                </button>
              )
            ))}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-sm">下一页</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Generate modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-md p-8">
            <h2 className="text-xl font-serif font-light text-[var(--color-text-primary)] mb-6">生成邀请码</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">生成数量</label>
                <input
                  type="number"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="50"
                  disabled={loading}
                  className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] disabled:opacity-50"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">一次最多生成 50 个</p>
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">有效期（天）</label>
                <input
                  type="number"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(parseInt(e.target.value) || 0)}
                  min="0"
                  disabled={loading}
                  className="w-full bg-transparent border-b border-[var(--color-border)] py-2 text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] disabled:opacity-50"
                />
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">0 表示永不过期</p>
              </div>
              <div className="flex space-x-4 pt-6">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] text-sm tracking-wide disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={createInvitation}
                  disabled={loading}
                  className="flex-1 py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[var(--color-sage)] text-sm tracking-wide disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>生成中...</span>
                    </>
                  ) : (
                    <span>生成</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generated result modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-lg p-8">
            <h2 className="text-xl font-serif font-light text-[var(--color-text-primary)] mb-2">生成成功</h2>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">已成功生成 {generatedCodes.length} 个注册邀请码</p>

            <div className="bg-[var(--color-bg-tertiary)] rounded p-4 max-h-60 overflow-y-auto mb-6">
              <div className="space-y-2">
                {generatedCodes.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-[var(--color-text-primary)]">{item.code}</span>
                    <span className="text-[var(--color-text-secondary)] text-xs">{getInviteLink(item.code)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowResultModal(false); setGeneratedCodes([]); }}
                className="flex-1 py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] text-sm tracking-wide"
              >
                关闭
              </button>
              <button
                onClick={copyAllGeneratedLinks}
                className="flex-1 py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[var(--color-sage)] text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                <span>复制全部链接</span>
              </button>
              <button
                onClick={exportGeneratedLinks}
                className="flex-1 py-3 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[var(--color-sage)] text-sm tracking-wide flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>导出链接</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
