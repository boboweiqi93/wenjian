import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getSupabaseUrl } from '../supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { Crown, Shield, Loader2, Check, Infinity, Clock, ExternalLink } from 'lucide-react';
import { ListSkeleton } from '../components/StateComponents';

interface MembershipPlan {
  id: string;
  name: string;
  tier: string;
  price_cents: number;
  points_price: number;
  duration_days: number | null;
  is_active: boolean | null;
  sort_order: number | null;
}

interface UserMembership {
  id: string;
  tier: string;
  started_at: string;
  expires_at: string | null;
  is_active: boolean | null;
  plan_id: string;
}

export default function Membership() {
  const navigate = useNavigate();
  const { user, userData, refreshUserData } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [currentMembership, setCurrentMembership] = useState<UserMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: plansData } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (plansData) setPlans(plansData);

    if (user?.id) {
      const { data: membershipData } = await supabase
        .from('user_memberships')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membershipData) {
        // 检查年卡是否过期
        if (membershipData.tier === 'yearly' && membershipData.expires_at) {
          if (new Date(membershipData.expires_at) < new Date()) {
            setCurrentMembership(null);
          } else {
            setCurrentMembership(membershipData);
          }
        } else {
          setCurrentMembership(membershipData);
        }
      }
    }
    setLoading(false);
  };

  const handlePointsPurchase = async (plan: MembershipPlan) => {
    if (!user?.id) {
      setError('请先登录后再购买会员');
      setTimeout(() => navigate('/login'), 1500);
      return;
    }
    setError('');
    setSuccess('');
    setPurchasing(plan.id);

    try {
      const response = await fetch(`${getSupabaseUrl()}/functions/v1/purchase-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, planId: plan.id }),
      });

      const result = await response.json();
      if (!response.ok) {
        // 区分认证错误和其他错误
        if (result.error?.includes('认证') || result.error?.includes('auth')) {
          setError('登录状态已过期，请重新登录后再试');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(result.error || '购买失败');
        }
        setPurchasing(null);
        return;
      }

      await refreshUserData();
      setSuccess(`成功开通${plan.name}`);
      fetchData();
    } catch (err: any) {
      setError(err.message || '网络错误，请重试');
    }
    setPurchasing(null);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  if (loading) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-16 px-6">
      <div className="text-center mb-16">
        <h1 className="font-serif text-3xl lg:text-4xl text-[var(--color-text-primary)] font-light mb-4 tracking-wide">
          会员权益
        </h1>
        <p className="text-[var(--color-text-secondary)] font-light text-lg">
          解锁全站课程，开启深度学习之旅
        </p>
        <div className="w-16 h-px mx-auto mt-8" style={{ backgroundColor: 'var(--color-border)' }} />
      </div>

      {/* 当前会员状态 */}
      {currentMembership && (
        <div className="mb-12 rounded-lg p-8 text-center relative overflow-hidden"
          style={{
            background: currentMembership.tier === 'founder'
              ? 'linear-gradient(135deg, var(--secondary) 0%, var(--chart-4) 100%)'
              : 'linear-gradient(135deg, var(--chart-5) 0%, var(--secondary) 100%)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              {currentMembership.tier === 'founder' ? (
                <Crown className="w-6 h-6 text-white" />
              ) : (
                <Shield className="w-6 h-6 text-white" />
              )}
              <span className="text-white/90 text-sm font-light tracking-wider uppercase">
                {currentMembership.tier === 'founder' ? 'Founder Member' : 'Annual Member'}
              </span>
            </div>
            <h2 className="text-white text-2xl font-serif font-light mb-2">
              {currentMembership.tier === 'founder' ? '创始会员' : '年卡会员'}
            </h2>
            <p className="text-white/70 text-sm font-light">
              {currentMembership.expires_at
                ? `有效期至 ${formatDate(currentMembership.expires_at)}`
                : '永久有效'}
            </p>
          </div>
        </div>
      )}

      {/* 套餐卡片 */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {plans.map((plan) => {
          const isCurrentPlan = currentMembership?.tier === plan.tier;
          const isFounder = plan.tier === 'founder';

          return (
            <div
              key={plan.id}
              className={`rounded-lg p-8 relative transition-all duration-300 ${
                isCurrentPlan ? 'ring-2 ring-[var(--color-accent)]' : 'hover:shadow-lg'
              }`}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--color-border)',
              }}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--color-accent)] text-[var(--color-bg-primary)] text-xs rounded-full font-light tracking-wide">
                  当前套餐
                </div>
              )}

              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  {isFounder ? (
                    <Crown className="w-5 h-5 text-[var(--color-accent)]" />
                  ) : (
                    <Shield className="w-5 h-5 text-[var(--color-accent)]" />
                  )}
                  <h3 className="font-serif text-xl text-[var(--color-text-primary)] font-light">
                    {plan.name}
                  </h3>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-light text-[var(--color-text-primary)]" style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}>
                    {formatPrice(plan.price_cents)}
                  </span>
                  <span className="text-sm text-[var(--color-text-secondary)] font-light">元</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] font-light mt-2">
                  {plan.duration_days ? `${plan.duration_days} 天有效` : '永久有效'}
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] font-light">
                  <Check className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>全站课程自由畅读</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] font-light">
                  <Check className="w-4 h-4 text-[var(--color-accent)]" />
                  <span>专属会员徽章</span>
                </div>
                {isFounder && (
                  <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] font-light">
                    <Infinity className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>永不过期</span>
                  </div>
                )}
                {!isFounder && (
                  <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] font-light">
                    <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                    <span>365 天有效期</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* 积分购买 */}
                <button
                  onClick={() => handlePointsPurchase(plan)}
                  disabled={!!purchasing || isCurrentPlan}
                  className="w-full py-3 rounded text-sm font-light tracking-wide transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: isCurrentPlan ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
                    color: isCurrentPlan ? 'var(--color-text-secondary)' : 'var(--color-bg-primary)',
                  }}
                >
                  {purchasing === plan.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : isCurrentPlan ? (
                    '已开通'
                  ) : (
                    `${plan.points_price} 迹开通`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 提示消息 */}
      {error && (
        <div className="text-center text-sm text-red-500 font-light mb-8">{error}</div>
      )}
      {success && (
        <div className="text-center text-sm text-[var(--color-accent)] font-light mb-8 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* 说明 */}
      <div className="text-center">
        <p className="text-xs text-[var(--color-text-secondary)] font-light leading-relaxed max-w-md mx-auto">
          畅享全部内容与音频。会员过期后，单独购买的课程仍可正常访问。
        </p>
      </div>
    </div>
  );
}
