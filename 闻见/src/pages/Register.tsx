import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, getSupabaseUrl } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const AVATAR_SEEDS = ['zen1', 'zen2', 'zen3', 'zen4', 'zen5', 'zen6', 'zen7', 'zen8'];

export default function Register() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const courseInviteCode = searchParams.get('invite_code') || '';
  const membershipCode = searchParams.get('membership_code') || '';

  // 已登录用户访问注册页时，重定向到首页（让 Layout 处理 membership_code）
  useEffect(() => {
    if (!authLoading && user) {
      // 如果带有 membership_code，保留参数让 Layout 处理兑换
      if (membershipCode) {
        navigate(`/?membership_code=${encodeURIComponent(membershipCode)}`, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, membershipCode, navigate]);
  const [formData, setFormData] = useState({
    phone: '',
    nickname: '',
    code: courseInviteCode || membershipCode || searchParams.get('code') || '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [courseInfo, setCourseInfo] = useState<{ titles: string[]; count: number } | null>(null);

  useEffect(() => {
    randomizeAvatar();
    if (courseInviteCode) {
      validateCourseInviteCode();
    }
  }, []);

  const validateCourseInviteCode = async () => {
    const { data } = await supabase
      .from('invitation_codes')
      .select('*, course:courses(title)')
      .eq('code', courseInviteCode.toUpperCase())
      .maybeSingle();
    if (data && !data.is_used) {
      // 获取所有课程标题
      const courseIds = data.course_ids || [data.course_id];
      if (courseIds && courseIds.length > 0) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('title')
          .in('id', courseIds);
        const titles = coursesData?.map((c: any) => c.title) || [];
        setCourseInfo({ titles, count: titles.length });
      }
    }
  };

  const randomizeAvatar = () => {
    const randomSeed = AVATAR_SEEDS[Math.floor(Math.random() * AVATAR_SEEDS.length)];
    setAvatarSeed(randomSeed);
  };

  const validatePhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePhone(formData.phone)) {
      setError('请输入有效的手机号');
      return;
    }
    if (formData.nickname.length < 2) {
      setError('昵称至少2个字符');
      return;
    }
    if (formData.password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!formData.code) {
      setError('请输入注册邀请码');
      return;
    }
    setLoading(true);

    let regInvitation: Record<string, any> | null = null;
    let isCourseInvite = false;
    let isMembershipInvite = false;

    // 1. 先检查是否是会员邀请码
    const { data: membershipCodeData } = await supabase
      .from('membership_codes')
      .select('id, code, plan_id, is_used, expires_at')
      .eq('code', formData.code.toUpperCase())
      .eq('is_used', false)
      .maybeSingle();

    if (membershipCodeData) {
      isMembershipInvite = true;
      regInvitation = membershipCodeData;
    }

    // 2. 不是会员码则检查注册邀请码
    if (!regInvitation) {
      const { data: invitationData } = await supabase
        .from('invitations')
        .select('*')
        .eq('code', formData.code)
        .eq('is_used', false)
        .maybeSingle();

      if (invitationData) {
        regInvitation = invitationData;
      } else {
        // 3. 最后检查课程兑换码
        const { data: courseInvitationData } = await supabase
          .from('invitation_codes')
          .select('*, course:courses(title)')
          .eq('code', formData.code.toUpperCase())
          .eq('is_used', false)
          .maybeSingle();
        if (courseInvitationData) {
          regInvitation = courseInvitationData;
          isCourseInvite = true;
          const courseIds = courseInvitationData.course_ids || [courseInvitationData.course_id];
          if (courseIds && courseIds.length > 0) {
            const { data: coursesData } = await supabase
              .from('courses')
              .select('title')
              .in('id', courseIds);
            const titles = coursesData?.map((c: any) => c.title) || [];
            setCourseInfo({ titles, count: titles.length });
          }
        }
      }
    }

    if (!regInvitation) {
      setError('邀请码无效或已被使用');
      setLoading(false);
      return;
    }
    if (regInvitation.expires_at && new Date(regInvitation.expires_at) < new Date()) {
      setError('邀请码已过期');
      setLoading(false);
      return;
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', formData.phone)
      .maybeSingle();
    if (existingUser) {
      setError('该手机号已注册');
      setLoading(false);
      return;
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username: formData.phone,
        nickname: formData.nickname,
        password_hash: formData.password,
        points: 0,
      })
      .select()
      .single();

    if (createError || !newUser) {
      setError('注册失败，请重试');
      setLoading(false);
      return;
    }

    // 如果是会员邀请码，调用 Edge Function 兑换会员
    if (isMembershipInvite) {
      try {
        const response = await fetch(`${getSupabaseUrl()}/functions/v1/redeem-membership`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: formData.code.toUpperCase(), userId: newUser.id }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || '会员兑换失败');
        }
        if (result.success) {
          setSuccess(`注册成功，${result.plan_name}已开通`);
          await login(newUser.username, formData.password);
          setTimeout(() => navigate('/membership'), 1500);
          setLoading(false);
          return;
        } else {
          console.error('会员兑换失败:', result.error);
        }
      } catch (err: any) {
        console.error('会员兑换请求失败:', err);
        // 即使会员兑换失败，注册本身已成功，继续登录流程
        setError(`注册成功，但会员开通失败：${err.message || '请稍后在会员页面重试'}`);
      }
    }

    if (isCourseInvite) {
      await supabase.from('invitation_codes').update({
        is_used: true,
        used_by: newUser.id,
        used_at: new Date().toISOString(),
      }).eq('id', regInvitation.id);

      // 获取所有课程ID（支持 course_ids 数组和 course_id 单值）
      const courseIds = regInvitation.course_ids || [regInvitation.course_id];
      const validCourseIds = courseIds.filter((id: string) => id && typeof id === 'string');

      // 批量开通所有课程
      if (validCourseIds.length > 0) {
        const userCoursesData = validCourseIds.map((courseId: string) => ({
          user_id: newUser.id,
          course_id: courseId,
          points_spent: 0,
        }));
        await supabase.from('user_courses').insert(userCoursesData);
      }
    } else {
      await supabase.from('invitations').update({
        is_used: true,
        used_by: newUser.id,
        used_at: new Date().toISOString(),
      }).eq('id', regInvitation.id);
    }

    await login(newUser.username, formData.password);

    if (isCourseInvite && courseInfo) {
      if (courseInfo.count === 1) {
        setSuccess(`注册成功，课程「${courseInfo.titles[0]}」已解锁`);
      } else {
        setSuccess(`注册成功，${courseInfo.count} 门课程已解锁`);
      }
      setTimeout(() => navigate('/'), 1500);
    } else {
      setSuccess('注册成功');
      setTimeout(() => navigate('/'), 1000);
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 relative"
      style={{ background: 'var(--background)' }}
    >

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-12">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <h1
              className="text-2xl font-light tracking-wide"
              style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}
            >
              <span style={{ color: 'var(--primary)' }}>闻</span>
              <span style={{ color: 'var(--secondary)' }}>见</span>
            </h1>
          </motion.div>
          <p className="mt-2 text-sm font-light tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>邀请制注册</p>
        </div>

        {courseInfo && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--color-border)'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>注册后将自动解锁 {courseInfo.count} 门课程：</p>
            <div className="mt-2 space-y-1">
              {courseInfo.titles.map((title, index) => (
                <p key={index} className="font-medium" style={{ color: 'var(--color-text-primary)' }}>「{title}」</p>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center">
            <p
              className="text-xs font-light tracking-[0.3em] uppercase mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              账号信息
            </p>
          </div>

          <div>
            <input type="tel" placeholder="手机号" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="zen-input" required />
          </div>

          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="设置密码" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="zen-input pr-10" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: 'var(--text-muted)' }}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="relative">
            <input type={showConfirmPassword ? 'text' : 'password'} placeholder="确认密码" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="zen-input pr-10" required />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 transition-colors duration-300" style={{ color: 'var(--text-muted)' }}>
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-4 text-center">
            <p
              className="text-xs font-light tracking-[0.3em] uppercase mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              个人信息
            </p>
          </div>

          <div>
            <input type="text" placeholder="昵称" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} className="zen-input" required />
          </div>

          <div className="flex flex-col items-center">
            <div
              className="w-20 h-20 rounded-full overflow-hidden"
              style={{
                background: 'var(--muted)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}&backgroundColor=faf8f5`} alt="avatar" className="w-full h-full" />
            </div>
            <button
              onClick={randomizeAvatar}
              className="mt-3 text-xs font-light flex items-center space-x-1 transition-colors duration-300"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <RefreshCw className="w-3 h-3" />
              <span>随机头像</span>
            </button>
          </div>

          <div>
            <input type="text" placeholder="注册邀请码" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="zen-input" required />
          </div>

          {error && (
            <p className="text-sm font-light text-center flex items-center justify-center gap-2" style={{ color: 'var(--color-danger)' }}>
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </p>
          )}

          {success && (
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--primary)' }}>
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="zen-btn w-full mt-8 py-4">
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '完成注册'}
          </button>

          <p className="text-center text-sm font-light" style={{ color: 'var(--text-muted)' }}>
            已有账号？{' '}
            <button onClick={() => navigate('/login')} className="transition-colors duration-300" style={{ color: 'var(--primary)' }}>登录</button>
          </p>
        </form>
      </div>
    </div>
  );
}
