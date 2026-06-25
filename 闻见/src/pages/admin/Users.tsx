import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { Plus, Edit2, Trash2, Search, ChevronLeft, ChevronRight, BookOpen, X, Check, Crown, Shield } from 'lucide-react';

interface User {
  id: string;
  username: string;
  nickname: string | null;
  points: number | null;
  is_admin: boolean | null;
  created_at: string | null;
}

interface Course {
  id: string;
  title: string;
  short_name: string | null;
  points_price: number | null;
  is_published: boolean | null;
}

interface UserCourse {
  id: string;
  course_id: string;
  user_id: string;
  points_spent: number;
  created_at: string | null;
  course?: Course;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    points: 0,
    is_admin: false,
  });

  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 用户课程管理相关状态
  const [showUserCoursesModal, setShowUserCoursesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [coursesLoading, setCoursesLoading] = useState(false);

  // 会员管理相关状态
  const [userMembership, setUserMembership] = useState<any>(null);
  const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [currentPage, pageSize]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 获取总数
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

      // 获取分页数据
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('获取用户列表失败:', err);
      alert('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const updateData: any = { points: formData.points, is_admin: formData.is_admin };
      if (formData.password) updateData.password_hash = formData.password;
      await supabase.from('users').update(updateData).eq('id', editingUser.id);
    } else {
      await supabase.from('users').insert({
        username: formData.username,
        password_hash: formData.password,
        points: formData.points,
        is_admin: formData.is_admin,
      });
    }
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', points: 0, is_admin: false });
    fetchUsers();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      points: user.points || 0,
      is_admin: user.is_admin || false,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该用户？此操作将同时删除该用户的所有关联数据（课程记录、积分记录等）。')) return;
    try {
      // 先删除关联数据
      await supabase.from('user_courses').delete().eq('user_id', id);
      await supabase.from('recharges').delete().eq('user_id', id);
      await supabase.from('point_redeem_records').delete().eq('user_id', id);
      await supabase.from('user_section_progress').delete().eq('user_id', id);
      await supabase.from('invitations').delete().eq('used_by', id);
      await supabase.from('invitation_codes').delete().eq('used_by', id);
      await supabase.from('point_codes').delete().eq('used_by', id);

      // 最后删除用户
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) {
        console.error('删除用户失败:', error);
        alert('删除失败: ' + error.message);
        return;
      }
      fetchUsers();
    } catch (err: any) {
      console.error('删除用户异常:', err);
      alert('删除失败: ' + (err.message || '未知错误'));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.nickname && u.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 用户课程管理功能
  const openUserCourses = async (user: User) => {
    setSelectedUser(user);
    setShowUserCoursesModal(true);
    setUserMembership(null);
    setGrantPlanId('');
    setGrantExpiresAt('');
    await fetchUserCourses(user.id);
    // 获取会员信息
    const { data: memData } = await supabase
      .from('user_memberships')
      .select('*, plan:membership_plans(name, tier)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (memData) setUserMembership(memData);
    // 获取套餐列表
    const { data: plansData } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (plansData) {
      setMembershipPlans(plansData);
      if (plansData.length > 0) setGrantPlanId(plansData[0].id);
    }
  };

  const handleGrantMembership = async () => {
    if (!selectedUser || !grantPlanId) return;
    const plan = membershipPlans.find((p: any) => p.id === grantPlanId);
    if (!plan) return;
    let expiresAt: string | null = null;
    if (grantExpiresAt) {
      expiresAt = new Date(grantExpiresAt).toISOString();
    } else if (plan.duration_days) {
      const d = new Date();
      d.setDate(d.getDate() + plan.duration_days);
      expiresAt = d.toISOString();
    }
    const { error } = await supabase.from('user_memberships').insert({
      user_id: selectedUser.id,
      plan_id: grantPlanId,
      tier: plan.tier,
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      source: 'admin_grant',
      is_active: true,
    });
    if (error) {
      alert('开通失败: ' + error.message);
    } else {
      alert('会员开通成功');
      openUserCourses(selectedUser);
    }
  };

  const handleTerminateMembership = async () => {
    if (!userMembership) return;
    if (!confirm('确定要终止该用户的会员资格吗？')) return;
    await supabase.from('user_memberships').update({ is_active: false }).eq('id', userMembership.id);
    alert('会员已终止');
    setUserMembership(null);
  };

  const handleUpdateExpires = async () => {
    if (!userMembership || !grantExpiresAt) return;
    await supabase.from('user_memberships').update({ expires_at: new Date(grantExpiresAt).toISOString() }).eq('id', userMembership.id);
    alert('到期时间已更新');
    openUserCourses(selectedUser!);
  };

  const fetchUserCourses = async (userId: string) => {
    setCoursesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_courses')
        .select('*, course:courses(id, title, short_name, points_price, is_published)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserCourses(data || []);
    } catch (err) {
      console.error('获取用户课程失败:', err);
      alert('获取用户课程失败');
    } finally {
      setCoursesLoading(false);
    }
  };

  const fetchAvailableCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, short_name, points_price, is_published')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      // 过滤掉用户已拥有的课程
      const userCourseIds = userCourses.map(uc => uc.course_id);
      const available = (data || []).filter(c => !userCourseIds.includes(c.id));
      setAvailableCourses(available);
    } catch (err) {
      console.error('获取可用课程失败:', err);
      alert('获取可用课程失败');
    }
  };

  const openAddCourseModal = async () => {
    await fetchAvailableCourses();
    setSelectedCourseId('');
    setShowAddCourseModal(true);
  };

  const handleAddCourse = async () => {
    if (!selectedUser || !selectedCourseId) return;

    const course = availableCourses.find(c => c.id === selectedCourseId);
    if (!course) return;

    if (!window.confirm(`确定要为用户「${selectedUser.nickname || selectedUser.username}」添加课程「${course.title}」吗？`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_courses')
        .insert({
          user_id: selectedUser.id,
          course_id: selectedCourseId,
          points_spent: 0, // 管理员手动添加，不扣除积分
        });

      if (error) throw error;

      alert('课程添加成功');
      setShowAddCourseModal(false);
      await fetchUserCourses(selectedUser.id);
    } catch (err: any) {
      console.error('添加课程失败:', err);
      alert('添加课程失败: ' + (err.message || '未知错误'));
    }
  };

  const handleRemoveCourse = async (userCourse: UserCourse) => {
    if (!selectedUser) return;

    if (!window.confirm(`确定要关闭用户「${selectedUser.nickname || selectedUser.username}」的课程「${userCourse.course?.title || '未知课程'}」吗？此操作将删除该课程的学习记录。`)) {
      return;
    }

    try {
      // 先删除学习进度记录
      await supabase
        .from('user_section_progress')
        .delete()
        .eq('user_id', selectedUser.id)
        .eq('course_id', userCourse.course_id);

      // 再删除用户课程记录
      const { error } = await supabase
        .from('user_courses')
        .delete()
        .eq('id', userCourse.id);

      if (error) throw error;

      alert('课程已关闭');
      await fetchUserCourses(selectedUser.id);
    } catch (err: any) {
      console.error('关闭课程失败:', err);
      alert('关闭课程失败: ' + (err.message || '未知错误'));
    }
  };

  // 分页计算
  const totalPages = Math.ceil(totalCount / pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">用户管理</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ username: '', password: '', points: 0, is_admin: false });
            setShowModal(true);
          }}
          className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-4 py-2 text-sm font-light hover:bg-[#3a4438]"
        >
          <Plus className="w-4 h-4" />
          <span>创建用户</span>
        </button>
      </div>

      <div className="bg-[var(--color-bg-tertiary)]">
        <div className="p-4 border-b border-[#e0d8cf]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9a9082]" />
            <input
              type="text"
              placeholder="搜索昵称或手机号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[#9a9082] focus:outline-none focus:border-[var(--color-text-primary)]"
            />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-[var(--color-bg-tertiary)]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-light text-[var(--color-text-secondary)] tracking-wide">昵称</th>
              <th className="px-6 py-3 text-left text-xs font-light text-[var(--color-text-secondary)] tracking-wide">手机号</th>
              <th className="px-6 py-3 text-left text-xs font-light text-[var(--color-text-secondary)] tracking-wide">积分</th>
              <th className="px-6 py-3 text-left text-xs font-light text-[var(--color-text-secondary)] tracking-wide">角色</th>
              <th className="px-6 py-3 text-left text-xs font-light text-[var(--color-text-secondary)] tracking-wide">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-light text-[var(--color-text-secondary)] tracking-wide">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0d8cf]">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-[var(--color-bg-tertiary)]/50">
                <td className="px-6 py-4 font-light text-[var(--color-text-primary)]">{user.nickname || '-'}</td>
                <td className="px-6 py-4 font-light text-[var(--color-text-secondary)] text-sm">{user.username}</td>
                <td className="px-6 py-4 font-light text-[#5a6b5a]">{user.points}</td>
                <td className="px-6 py-4">
                  {user.is_admin ? (
                    <span className="bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] text-xs px-2 py-1 font-light">管理员</span>
                  ) : (
                    <span className="bg-[#e0d8cf] text-[var(--color-text-secondary)] text-xs px-2 py-1 font-light">用户</span>
                  )}
                </td>
                <td className="px-6 py-4 text-[#9a9082] text-sm font-light">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openUserCourses(user)}
                    className="text-[#5a6b8a] hover:text-[#4a5568]"
                    title="管理课程"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(user)} className="text-[var(--color-sage)] hover:text-[var(--color-text-primary)]">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(user.id)} className="text-[#8a6b6b] hover:text-[#6b4a4a]">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页控件 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#e0d8cf]">
          <div className="flex items-center space-x-4 text-sm text-[var(--color-text-secondary)]">
            <span>共 {totalCount} 条记录</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent border border-[var(--color-border)] px-2 py-1 text-sm focus:outline-none focus:border-[var(--color-text-primary)]"
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
              <option value={100}>100条/页</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {pageNumbers.slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2)).map(num => (
              <button
                key={num}
                onClick={() => setCurrentPage(num)}
                className={`px-3 py-1 text-sm border ${
                  currentPage === num
                    ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] border-[var(--color-text-primary)]'
                    : 'border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)]'
                }`}
              >
                {num}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 用户课程管理弹窗 */}
      {showUserCoursesModal && selectedUser && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-tertiary)] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-[#e0d8cf] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-serif font-light text-[var(--color-text-primary)]">
                  {selectedUser.nickname || selectedUser.username} 的课程
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  已开启 {userCourses.length} 门课程
                </p>
              </div>
              <button
                onClick={() => setShowUserCoursesModal(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* 会员管理面板 */}
              <div className="mb-6 p-4 border border-[#e0d8cf] rounded">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4" /> 会员状态
                </h3>
                {userMembership ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-[var(--color-text-secondary)]">当前等级：</span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {(userMembership as any).plan?.name || userMembership.tier}
                      </span>
                      <span className="text-xs text-[#9a9082]">
                        {userMembership.expires_at ? `到期：${new Date(userMembership.expires_at).toLocaleDateString()}` : '永久有效'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="date" value={grantExpiresAt} onChange={(e) => setGrantExpiresAt(e.target.value)} className="px-2 py-1 text-sm border border-[var(--color-border)] bg-transparent" />
                      <button onClick={handleUpdateExpires} disabled={!grantExpiresAt} className="px-3 py-1 text-xs bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[#3a4438] disabled:opacity-50">修改到期时间</button>
                      <button onClick={handleTerminateMembership} className="px-3 py-1 text-xs bg-[#8a6b6b] text-[var(--color-bg-secondary)] hover:bg-[#6b4a4a]">终止会员</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-[var(--color-text-secondary)]">该用户暂无有效会员</p>
                    <div className="flex items-center gap-2">
                      <select value={grantPlanId} onChange={(e) => setGrantPlanId(e.target.value)} className="px-2 py-1 text-sm border border-[var(--color-border)] bg-transparent">
                        {membershipPlans.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="date" value={grantExpiresAt} onChange={(e) => setGrantExpiresAt(e.target.value)} placeholder="到期时间" className="px-2 py-1 text-sm border border-[var(--color-border)] bg-transparent" />
                      <button onClick={handleGrantMembership} disabled={!grantPlanId} className="px-3 py-1 text-xs bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[#3a4438] disabled:opacity-50">手动开通</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={openAddCourseModal}
                  className="flex items-center space-x-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] px-4 py-2 text-sm hover:bg-[#3a4438]"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加课程</span>
                </button>
              </div>

              {coursesLoading ? (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">加载中...</div>
              ) : userCourses.length === 0 ? (
                <div className="text-center py-8 text-[var(--color-text-secondary)]">暂无已开启课程</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-[var(--color-bg-tertiary)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">课程名称</th>
                      <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">消耗积分</th>
                      <th className="px-4 py-3 text-left text-xs font-light text-[var(--color-text-secondary)]">开启时间</th>
                      <th className="px-4 py-3 text-right text-xs font-light text-[var(--color-text-secondary)]">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e0d8cf]">
                    {userCourses.map((uc) => (
                      <tr key={uc.id} className="hover:bg-[var(--color-bg-tertiary)]/50">
                        <td className="px-4 py-3 font-light text-[var(--color-text-primary)]">
                          {uc.course?.title || '未知课程'}
                        </td>
                        <td className="px-4 py-3 text-[var(--color-sage)]">{uc.points_spent}</td>
                        <td className="px-4 py-3 text-[#9a9082] text-sm">
                          {uc.created_at ? new Date(uc.created_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveCourse(uc)}
                            className="text-[#8a6b6b] hover:text-[#6b4a4a] text-sm"
                          >
                            关闭
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 添加课程弹窗 */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-[60]">
          <div className="bg-[var(--color-bg-tertiary)] p-6 w-full max-w-md">
            <h3 className="text-lg font-serif font-light text-[var(--color-text-primary)] mb-4">添加课程</h3>

            {availableCourses.length === 0 ? (
              <p className="text-[var(--color-text-secondary)] py-4">暂无可添加的课程</p>
            ) : (
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto border border-[#e0d8cf]">
                  {availableCourses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`p-3 cursor-pointer flex items-center justify-between ${
                        selectedCourseId === course.id
                          ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)]'
                          : 'hover:bg-[var(--color-bg-tertiary)]'
                      }`}
                    >
                      <div>
                        <div className="font-light">{course.title}</div>
                        <div className="text-xs opacity-70">
                          需 {course.points_price} 积分
                        </div>
                      </div>
                      {selectedCourseId === course.id && (
                        <Check className="w-4 h-4" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddCourseModal(false)}
                    className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddCourse}
                    disabled={!selectedCourseId}
                    className="flex-1 px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[#3a4438] disabled:opacity-50"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-[var(--color-text-primary)]/30 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg-tertiary)] p-8 w-full max-w-md">
            <h2 className="font-serif text-xl font-light text-[var(--color-text-primary)] mb-6">
              {editingUser ? '编辑用户' : '创建用户'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-light text-[var(--color-text-secondary)] mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[var(--color-text-secondary)] mb-1">
                  密码 {editingUser && '(留空则不修改)'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  required={!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-light text-[var(--color-text-secondary)] mb-1">积分</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-transparent border-b border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-text-primary)]"
                  min="0"
                />
              </div>
              <div className="flex items-center pt-2">
                <input
                  type="checkbox"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-text-primary)] border-[var(--color-border)]"
                />
                <label className="ml-2 text-sm font-light text-[var(--color-text-secondary)]">设为管理员</label>
              </div>
              <div className="flex space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[var(--color-text-primary)] text-[var(--color-bg-secondary)] hover:bg-[#3a4438]"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
