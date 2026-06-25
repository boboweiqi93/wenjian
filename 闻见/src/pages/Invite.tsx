import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Gift, CheckCircle, AlertCircle, CornerUpLeft, LogIn, UserPlus, BookOpen } from 'lucide-react';

interface CourseInfo {
  id: string;
  title: string;
}

export default function Invite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData } = useAuth();
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coursesInfo, setCoursesInfo] = useState<CourseInfo[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (!user && code) {
      setShowAuthModal(true);
    }
  }, [user, code]);

  useEffect(() => {
    if (code && user) {
      validateAndRedeem();
    }
  }, [code, user]);

  // 验证邀请码并获取课程信息（用于显示）
  useEffect(() => {
    if (code.trim()) {
      validateCodeAndShowCourses();
    }
  }, [code]);

  const validateCodeAndShowCourses = async () => {
    if (!code.trim()) return;
    
    setIsValidating(true);
    try {
      const { data: inviteCode, error: fetchError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .single();

      if (fetchError || !inviteCode) {
        setCoursesInfo([]);
        return;
      }

      // 获取课程ID列表（支持 course_ids 数组和 course_id 单值）
      const rawCourseIds = (inviteCode as any).course_ids;
      let courseIds: string[] = [];

      if (rawCourseIds && Array.isArray(rawCourseIds) && rawCourseIds.length > 0) {
        courseIds = rawCourseIds.filter((id: any) => id && typeof id === 'string');
      } else if (inviteCode.course_id) {
        courseIds = [inviteCode.course_id];
      }

      if (courseIds.length > 0) {
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);
        
        setCoursesInfo(coursesData || []);
      }
    } catch (err) {
      console.error('验证邀请码失败:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  const handleGoLogin = () => {
    navigate('/login', { state: { redirect: `/invite?code=${code}`, inviteCode: code } });
  };

  const handleGoRegister = () => {
    navigate(`/register?invite_code=${code}`);
  };

  const validateAndRedeem = async () => {
    if (!code.trim()) {
      setError('请输入邀请码');
      return;
    }

    if (!user?.id) {
      setError('请先登录');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // 调用 Edge Function 兑换邀请码（支持多套课程）
      const response = await fetch(`${window.location.origin}/sb-api/functions/v1/redeem-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: code.trim().toUpperCase(), userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '兑换失败');
        setLoading(false);
        return;
      }

      if (data.success) {
        const courseCount = data.courses_count || 1;
        const courseNames = data.courses || [];
        
        if (courseCount === 1) {
          setSuccess(`成功解锁课程「${courseNames[0] || '课程'}」`);
        } else {
          setSuccess(`成功解锁 ${courseCount} 门课程`);
        }
        
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err: any) {
      setError('操作失败，请重试: ' + (err.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    validateAndRedeem();
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center px-4 relative">
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 flex items-center text-[var(--color-text-secondary)] hover:text-[var(--secondary)] z-10"
      >
        <CornerUpLeft className="w-5 h-5" />
      </button>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Gift className="w-12 h-12 text-[var(--secondary)] mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="font-serif text-2xl text-[var(--color-text-primary)] font-light tracking-wide">
            兑换邀请码
          </h1>
          <p className="text-[var(--color-text-secondary)] mt-2 font-light text-sm">
            输入邀请码解锁专属课程
          </p>
        </div>

        <div className="bg-[var(--muted)] border border-[var(--color-border)] rounded-lg p-6">
          {error && (
            <div className="flex items-center gap-2 text-red-500 mb-4 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-600 mb-4 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">
                邀请码
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="请输入邀请码"
                className="w-full px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-mono text-center tracking-wider focus:outline-none focus:border-[var(--secondary)]"
                disabled={loading}
              />
            </div>

            {/* 显示关联课程列表 */}
            {coursesInfo.length > 0 && (
              <div className="mb-4 p-3 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)]">
                <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)] text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span>该邀请码包含 {coursesInfo.length} 门课程：</span>
                </div>
                <ul className="space-y-1">
                  {coursesInfo.map((course) => (
                    <li key={course.id} className="text-sm text-[var(--color-text-primary)] pl-6">
                      • {course.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {isValidating && !coursesInfo.length && (
              <div className="mb-4 text-center text-[var(--color-text-secondary)] text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                验证邀请码中...
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim() || coursesInfo.length === 0}
              className="w-full py-3 bg-[var(--secondary)] text-[var(--color-bg-primary)] font-light tracking-wide hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>兑换中...</span>
                </>
              ) : (
                <span>立即兑换</span>
              )}
            </button>
          </form>

          {!user && !showAuthModal && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-sm text-[var(--secondary)] hover:opacity-80 font-light"
              >
                请先登录
              </button>
            </div>
          )}
        </div>
      </div>

      {showAuthModal && !user && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="backdrop-blur-xl rounded-2xl p-8 w-full max-w-sm mx-4" style={{ background: 'rgba(251, 250, 249, 0.9)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[var(--secondary)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-[var(--secondary)]" />
              </div>
              <h3 className="font-serif text-xl text-[var(--color-text-primary)] font-light tracking-wide mb-2">
                欢迎访问
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm font-light leading-relaxed">
                如果已注册网站，请直接登录即可解锁课程，无需重复注册
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleGoLogin}
                className="w-full py-3 bg-[var(--secondary)] text-[var(--color-bg-primary)] font-light tracking-wide hover:opacity-90 flex items-center justify-center gap-2 rounded-lg"
              >
                <LogIn className="w-4 h-4" />
                <span>去登录</span>
              </button>

              <button
                onClick={handleGoRegister}
                className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text-secondary)] font-light tracking-wide hover:border-[var(--secondary)] hover:text-[var(--secondary)] flex items-center justify-center gap-2 rounded-lg"
              >
                <UserPlus className="w-4 h-4" />
                <span>立即注册</span>
              </button>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full mt-4 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-light"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
