import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Download, Trash2, Search, Filter, Loader2, Check, Copy, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface InvitationCode {
  id: string;
  code: string;
  course_id: string;
  course_ids: string[] | null;
  course_title: string;
  course_titles: string[];
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface GeneratedCode {
  code: string;
  course_id: string;
  course_ids: string[];
  course_titles?: string[];
  created_by: string;
  expires_at: string | null;
}

const PAGE_SIZE = 20;

export default function AdminInvitationCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InvitationCode[]>([]);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [generateCount, setGenerateCount] = useState(10);
  const [expiresDays, setExpiresDays] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<GeneratedCode[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchCodes();
    fetchCourses();
  }, [currentPage, filter, searchQuery]);

  const getInviteLink = (code: string) => {
    return `${window.location.origin}/#/invite?code=${code}`;
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
        setTimeout(() => {
          setCopiedCode(null);
          setSuccess('');
        }, 2000);
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
    const courseTitles = generatedCodes[0]?.course_titles || [];
    const courseText = courseTitles.length === 1
      ? `《${courseTitles[0]}》课程`
      : courseTitles.map(t => `《${t}》`).join('+') + '课程';
    const links = `邀请您开通${courseText}\n${generatedCodes.map(c => `${c.code}: ${getInviteLink(c.code)}`).join('\n')}`;
    copyToClipboard(links, 'all-generated');
  };

  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('invitation_codes')
        .select('*, course:courses(title)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filter === 'used') {
        query = query.eq('is_used', true);
      } else if (filter === 'unused') {
        query = query.eq('is_used', false);
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
        setError('获取数据失败: ' + fetchError.message);
        return;
      }

      // 处理数据，支持 course_ids 数组
      const processedCodes = await Promise.all((data || []).map(async (item: any) => {
        const courseIds = item.course_ids || [item.course_id];
        const courseTitles: string[] = [];
        
        // 如果有 course_ids 数组，查询所有课程标题
        if (courseIds && courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('title')
            .in('id', courseIds);
          courseTitles.push(...(coursesData?.map((c: any) => c.title) || []));
        }
        
        return {
          ...item,
          course_ids: courseIds,
          course_titles: courseTitles.length > 0 ? courseTitles : [item.course?.title || '未知课程'],
          course_title: courseTitles.length > 0 ? courseTitles[0] : item.course?.title || '未知课程'
        };
      }));

      setCodes(processedCodes);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('获取邀请码异常:', err);
      setError('获取数据失败: ' + (err.message || '未知错误'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .eq('is_published', true)
      .order('title');
    setCourses(data || []);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === codes.length && codes.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(codes.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const batchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个邀请码？`)) return;
    for (const id of selectedIds) {
      await supabase.from('invitation_codes').delete().eq('id', id);
    }
    setSelectedIds(new Set());
    fetchCodes();
  };

  const batchExport = () => {
    const selectedCodes = codes.filter(c => selectedIds.has(c.id));
    const csv = [
      ['邀请码', '邀请链接', '课程', '状态', '过期时间', '创建时间'],
      ...selectedCodes.map(c => [
        c.code,
        getInviteLink(c.code),
        c.course_titles.join('; '),
        c.is_used ? '已使用' : '未使用',
        c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期',
        new Date(c.created_at).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation_codes_batch_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const generateCodes = async () => {
    setError('');
    setSuccess('');
    if (selectedCourses.length === 0) { setError('请至少选择一门课程'); return; }
    if (!user?.id) { setError('请先登录'); return; }
    setIsGenerating(true);
    try {
      const newCodes: GeneratedCode[] = [];
      const expiresAt = expiresDays > 0 ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString() : null;
      for (let i = 0; i < generateCount; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        newCodes.push({
          code,
          course_id: selectedCourses[0],
          course_ids: selectedCourses,
          created_by: user.id,
          expires_at: expiresAt
        });
      }
      const { error: insertError } = await supabase.from('invitation_codes').insert(newCodes);
      if (insertError) { setError('生成失败: ' + insertError.message); setIsGenerating(false); return; }
      // 保存生成的课程标题用于复制
      const selectedCourseTitles = courses.filter(c => selectedCourses.includes(c.id)).map(c => c.title);
      setGeneratedCodes(newCodes.map(nc => ({ ...nc, course_titles: selectedCourseTitles })));
      setShowModal(false);
      setShowExportModal(true);
      setSelectedCourses([]);
      fetchCodes();
    } catch (err: any) { setError('生成失败: ' + (err.message || '未知错误')); }
    finally { setIsGenerating(false); }
  };

  const exportGeneratedCodes = () => {
    const courseTitles = courses
      .filter(c => generatedCodes[0]?.course_ids.includes(c.id))
      .map(c => c.title)
      .join('; ');
    const csv = [
      ['邀请码', '邀请链接', '课程', '过期时间'],
      ...generatedCodes.map(c => [c.code, getInviteLink(c.code), courseTitles, c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期'])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation_codes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setShowExportModal(false);
    setGeneratedCodes([]);
  };

  const exportCSV = () => {
    const exportAllCodes = async () => {
      let query = supabase
        .from('invitation_codes')
        .select('*, course:courses(title)')
        .order('created_at', { ascending: false });

      if (filter === 'used') {
        query = query.eq('is_used', true);
      } else if (filter === 'unused') {
        query = query.eq('is_used', false);
      }

      if (searchQuery.trim()) {
        query = query.ilike('code', `%${searchQuery}%`);
      }

      const { data } = await query;
      
      // 处理数据获取课程标题
      const processedCodes = await Promise.all((data || []).map(async (item: any) => {
        const courseIds = item.course_ids || [item.course_id];
        const courseTitles: string[] = [];
        
        if (courseIds && courseIds.length > 0) {
          const { data: coursesData } = await supabase
            .from('courses')
            .select('title')
            .in('id', courseIds);
          courseTitles.push(...(coursesData?.map((c: any) => c.title) || []));
        }
        
        return {
          ...item,
          course_titles: courseTitles.length > 0 ? courseTitles : [item.course?.title || '未知课程']
        };
      }));

      const csv = [
        ['邀请码', '邀请链接', '课程', '状态', '过期时间', '创建时间'],
        ...processedCodes.map((c: any) => [c.code, getInviteLink(c.code), c.course_titles.join('; '), c.is_used ? '已使用' : '未使用', c.expires_at ? new Date(c.expires_at).toLocaleString() : '永不过期', new Date(c.created_at).toLocaleString()])
      ].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invitation_codes_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    };
    exportAllCodes();
  };

  const deleteCode = async (id: string) => {
    if (!confirm('确定删除该邀请码？')) return;
    await supabase.from('invitation_codes').delete().eq('id', id);
    fetchCodes();
  };

  const toggleCourseSelection = (courseId: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      }
      return [...prev, courseId];
    });
  };

  const selectAllCourses = () => {
    if (selectedCourses.length === courses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(courses.map(c => c.id));
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelectedIds(new Set());
    }
  };

  const handleFilterChange = (newFilter: 'all' | 'used' | 'unused') => {
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">邀请码管理</h1>
        <div className="flex gap-3">
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]">
            <Download className="w-4 h-4" /><span>导出CSV</span>
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[#3a4438]">
            <Plus className="w-4 h-4" /><span>批量生成</span>
          </button>
        </div>
      </div>

      {error && <div className="bg-[rgba(184,138,138,0.1)] border border-red-200 text-red-600 px-4 py-3 rounded">{error}</div>}
      {success && <div className="bg-[rgba(122,168,140,0.1)] border border-green-200 text-green-600 px-4 py-3 rounded">{success}</div>}

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 bg-[var(--color-bg-tertiary)] px-4 py-2 rounded">
          <span className="text-[var(--color-text-secondary)] text-sm">已选择 {selectedIds.size} 项</span>
          <button onClick={batchDelete} className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1">
            <Trash2 className="w-4 h-4" />批量删除
          </button>
          <button onClick={batchExport} className="text-[var(--color-text-primary)] hover:text-[#3a4438] text-sm flex items-center gap-1">
            <Download className="w-4 h-4" />批量导出
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-sm">取消选择</button>
        </div>
      )}

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9082]" />
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
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
        <span>共 {totalCount} 条记录</span>
        <span>第 {currentPage} / {totalPages || 1} 页</span>
      </div>

      <div className="bg-[var(--color-bg-tertiary)] overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-4 py-3 text-left">
                <input 
                  type="checkbox" 
                  checked={selectedIds.size === codes.length && codes.length > 0} 
                  onChange={toggleSelectAll} 
                  className="w-4 h-4" 
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">邀请码</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">课程</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">状态</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">过期时间</th>
              <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">创建时间</th>
              <th className="px-4 py-3 text-center text-xs font-light text-[var(--color-text-secondary)]">链接</th>
              <th className="px-4 py-3 text-right text-xs font-light text-[var(--color-text-secondary)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0d8cf]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-primary)] mx-auto" />
                </td>
              </tr>
            ) : codes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                  暂无数据
                </td>
              </tr>
            ) : (
              codes.map((code) => (
                <tr key={code.id} className="hover:bg-[var(--color-bg-tertiary)]/50">
                  <td className="px-4 py-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(code.id)} 
                      onChange={() => toggleSelect(code.id)} 
                      className="w-4 h-4" 
                    />
                  </td>
                  <td className="px-4 py-4 font-mono text-[var(--color-text-primary)] text-sm">{code.code}</td>
                  <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">
                    <div className="group relative">
                      <span>{code.course_titles.length}门课程</span>
                      <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-[var(--color-bg-primary)] border border-[#e0d8cf] rounded-lg shadow-lg p-2 z-10 min-w-[200px]">
                        <ul className="text-xs text-[var(--color-text-secondary)] space-y-1">
                          {code.course_titles.map((title, idx) => (
                            <li key={idx} className="truncate">{title}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {code.is_used ? 
                      <span className="text-xs bg-[var(--color-border)] text-[#5a5a5a] px-2 py-1">已使用</span> : 
                      <span className="text-xs bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-2 py-1">未使用</span>
                    }
                  </td>
                  <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">{code.expires_at ? new Date(code.expires_at).toLocaleDateString() : '永不过期'}</td>
                  <td className="px-4 py-4 text-[var(--color-text-secondary)] text-sm">{new Date(code.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => {
                        const titles = code.course_titles?.length > 0 ? code.course_titles : [code.course_title || '课程'];
                        const courseText = titles.length === 1 ? `《${titles[0]}》课程` : titles.map(t => `《${t}》`).join('+') + '课程';
                        copyToClipboard(`邀请您开通${courseText}\n${getInviteLink(code.code)}`, code.code);
                      }} 
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
                    <button onClick={() => deleteCode(code.id)} className="text-[#8a6b6b] hover:text-[#6b4a4a]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[#f7f3ec] p-8 w-full max-w-md">
            <h2 className="font-serif text-xl font-light text-[var(--color-text-primary)] mb-6">批量生成邀请码</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
                  选择课程 <span className="text-[var(--color-danger)]">*</span>
                  <span className="ml-2 text-xs text-[#9a9082]">(已选择 {selectedCourses.length} 门)</span>
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowCourseDropdown(!showCourseDropdown)}
                    className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg py-2 px-3 text-left text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)] flex items-center justify-between"
                  >
                    <span className={selectedCourses.length === 0 ? 'text-[#9a9082]' : ''}>
                      {selectedCourses.length === 0 ? '请选择课程' : `已选择 ${selectedCourses.length} 门课程`}
                    </span>
                    <span className="text-[var(--color-text-secondary)]">▼</span>
                  </button>
                  
                  {showCourseDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                      <div className="p-2 border-b border-[#e0d8cf]">
                        <button
                          onClick={selectAllCourses}
                          className="text-sm text-[var(--color-text-primary)] hover:text-[#3a4438]"
                        >
                          {selectedCourses.length === courses.length ? '取消全选' : '全选'}
                        </button>
                      </div>
                      {courses.map(course => (
                        <div
                          key={course.id}
                          onClick={() => toggleCourseSelection(course.id)}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--color-bg-tertiary)] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => {}}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-[var(--color-text-primary)]">{course.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedCourses.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedCourses.map(courseId => {
                      const course = courses.find(c => c.id === courseId);
                      return course ? (
                        <span
                          key={courseId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] text-xs rounded"
                        >
                          {course.title}
                          <button
                            onClick={() => toggleCourseSelection(courseId)}
                            className="hover:text-[var(--color-text-primary)]"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
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
              <button onClick={() => { setShowModal(false); setError(''); setSelectedCourses([]); }} className="flex-1 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)]" disabled={isGenerating}>取消</button>
              <button onClick={generateCodes} className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] flex items-center justify-center gap-2" disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /><span>生成中...</span></> : <span>生成</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[#f7f3ec] p-8 w-full max-w-lg">
            <h2 className="font-serif text-xl font-light text-[var(--color-text-primary)] mb-4">邀请码生成成功</h2>
            <p className="text-[var(--color-text-secondary)] mb-4">成功生成 {generatedCodes.length} 个邀请码</p>
            <div className="bg-[var(--color-bg-tertiary)] p-4 rounded mb-6 max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[var(--color-text-secondary)]"><th className="text-left py-2">邀请码</th><th className="text-right py-2">操作</th></tr></thead>
                <tbody>
                  {generatedCodes.map((code, index) => (
                    <tr key={index} className="border-t border-[#e0d8cf]">
                      <td className="py-2 font-mono text-[var(--color-text-primary)]">{code.code}</td>
                      <td className="py-2 text-right">
                        <button 
                          onClick={() => {
                            const selectedCourseTitles = courses
                              .filter(c => generatedCodes[0]?.course_ids?.includes(c.id))
                              .map(c => c.title);
                            const courseText = selectedCourseTitles.length === 1
                              ? `《${selectedCourseTitles[0]}》课程`
                              : selectedCourseTitles.map(t => `《${t}》`).join('+') + '课程';
                            copyToClipboard(`邀请您开通${courseText}\n${getInviteLink(code.code)}`, code.code);
                          }} 
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
              <button onClick={exportGeneratedCodes} className="flex-1 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] flex items-center justify-center gap-2"><Download className="w-4 h-4" /><span>导出CSV</span></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
