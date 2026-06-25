import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';
import { Check, Wallet, Gift, ShoppingCart, CreditCard, Copy, MessageCircle, Users, ShoppingBag, ExternalLink, Crown, Shield, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExternalLinkConfig {
  key: string;
  name: string;
  url: string;
  is_enabled: boolean | null;
}

interface PurchaseRecord {
  id: string;
  type: 'purchase';
  course_title: string;
  points_spent: number;
  created_at: string;
}

interface RechargeRecord {
  id: string;
  type: 'recharge';
  amount: number;
  points: number;
  payment_status: string | null;
  created_at: string | null;
}

interface RedeemRecord {
  id: string;
  type: 'redeem';
  code: string;
  points_value: number;
  redeemed_at: string;
}

type RecordItem = PurchaseRecord | RechargeRecord | RedeemRecord;

const WECHAT_ID = 'panshanpan';

interface MembershipInfo {
  tier: string;
  expires_at: string | null;
  is_active: boolean | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { userData, refreshUserData } = useAuth();
  const [allRecords, setAllRecords] = useState<RecordItem[]>([]);
  const [activeTab, setActiveTab] = useState<'points' | 'records'>('points');
  const [copied, setCopied] = useState(false);
  const [xiaohongshuLink, setXiaohongshuLink] = useState<ExternalLinkConfig | null>(null);
  const [loadingLink, setLoadingLink] = useState(true);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [isRegularMember, setIsRegularMember] = useState(false);

  useEffect(() => {
    fetchRecords();
    fetchExternalLinks();
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    if (!userData?.id) return;
    // 检查有效会员
    const { data: memberships } = await supabase
      .from('user_memberships')
      .select('tier, expires_at, is_active')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (memberships && memberships.length > 0) {
      for (const m of memberships) {
        if (m.tier === 'founder' && m.is_active) {
          setMembership({ tier: 'founder', expires_at: null, is_active: true });
          return;
        }
        if (m.tier === 'yearly' && m.is_active && m.expires_at && new Date(m.expires_at) > new Date()) {
          setMembership({ tier: 'yearly', expires_at: m.expires_at, is_active: true });
          return;
        }
      }
    }

    // 检查普通会员（买过课）
    const { data: courses } = await supabase
      .from('user_courses')
      .select('id')
      .eq('user_id', userData.id)
      .limit(1);
    setIsRegularMember(!!courses && courses.length > 0);
  };

  const fetchExternalLinks = async () => {
    setLoadingLink(true);
    const { data, error } = await supabase
      .from('external_links')
      .select('key, name, url, is_enabled')
      .eq('key', 'xiaohongshu_shop')
      .maybeSingle();

    if (!error && data) {
      setXiaohongshuLink(data);
    }
    setLoadingLink(false);
  };

  const handleXiaohongshuClick = () => {
    if (xiaohongshuLink?.url) {
      window.open(xiaohongshuLink.url, '_blank');
    }
  };

  const fetchRecords = async () => {
    if (!userData?.id) return;

    const { data: purchaseData } = await supabase
      .from('user_courses')
      .select('id, points_spent, created_at, course_id(title)')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    const { data: rechargeData } = await supabase
      .from('recharges')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    const { data: redeemData } = await supabase
      .from('point_redeem_records')
      .select('id, points_value, redeemed_at, code_id(code)')
      .eq('user_id', userData.id)
      .order('redeemed_at', { ascending: false });

    const purchases: PurchaseRecord[] = (purchaseData || []).map((p: any) => ({
      id: p.id,
      type: 'purchase' as const,
      course_title: p.course_id?.title || '未知课程',
      points_spent: p.points_spent,
      created_at: p.created_at,
    }));

    const recharges: RechargeRecord[] = (rechargeData || []).map((r: any) => ({
      id: r.id,
      type: 'recharge' as const,
      amount: r.amount,
      points: r.points,
      payment_status: r.payment_status,
      created_at: r.created_at,
    }));

    const redeems: RedeemRecord[] = (redeemData || []).map((r: any) => ({
      id: r.id,
      type: 'redeem' as const,
      code: r.code_id?.code || '未知',
      points_value: r.points_value,
      redeemed_at: r.redeemed_at,
    }));

    const combined = [...purchases, ...recharges, ...redeems].sort((a, b) => {
      const dateA = new Date(a.type === 'redeem' ? a.redeemed_at : a.created_at || 0).getTime();
      const dateB = new Date(b.type === 'redeem' ? b.redeemed_at : b.created_at || 0).getTime();
      return dateB - dateA;
    });

    setAllRecords(combined);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCopyWechat = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(WECHAT_ID);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        alert('复制成功');
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = WECHAT_ID;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          alert('复制成功');
        } catch (err) {
          console.error('复制失败:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="w-4 h-4" />;
      case 'recharge':
        return <CreditCard className="w-4 h-4" />;
      case 'redeem':
        return <Gift className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getRecordTitle = (record: RecordItem) => {
    switch (record.type) {
      case 'purchase':
        return record.course_title;
      case 'recharge':
        return `充值 ¥${record.amount}`;
      case 'redeem':
        return `邀请码: ${record.code}`;
      default:
        return '';
    }
  };

  const getRecordPoints = (record: RecordItem) => {
    switch (record.type) {
      case 'purchase':
        return { value: -record.points_spent, color: 'text-[var(--color-text-secondary)]' };
      case 'recharge':
        return { value: +record.points, color: 'text-[var(--color-text-secondary)]' };
      case 'redeem':
        return { value: +record.points_value, color: 'text-[var(--color-accent)]' };
      default:
        return { value: 0, color: '' };
    }
  };

  const getRecordDate = (record: RecordItem) => {
    const date = record.type === 'redeem' ? record.redeemed_at : record.created_at;
    return date ? formatDate(date) : '-';
  };

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase':
        return '购买';
      case 'recharge':
        return '充值';
      case 'redeem':
        return '兑换';
      default:
        return '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      {/* Avatar & Name */}
      <div className="text-center mb-12">
        <div
          className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4"
          style={{
            background: 'var(--muted)',
            boxShadow: 'var(--shadow-sm)',
            padding: '2px',
          }}
        >
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.username || 'user'}&backgroundColor=faf8f5`}
            alt="avatar"
            className="w-full h-full rounded-full"
          />
        </div>
        <h1 className="font-serif text-2xl text-[var(--color-text-primary)] font-light mb-2">
          {userData?.nickname || userData?.username}
        </h1>
        {/* 会员徽章 */}
        <div className="flex items-center justify-center gap-2 mb-2">
          {membership?.tier === 'founder' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-light tracking-wide bg-purple-500/10 text-purple-600 border border-purple-500/20">
              <Crown className="w-3 h-3" /> 创始会员
            </span>
          )}
          {membership?.tier === 'yearly' && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-light tracking-wide bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Shield className="w-3 h-3" /> 年卡会员
              {membership.expires_at && (
                <span className="opacity-70"> · {new Date(membership.expires_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}到期</span>
              )}
            </span>
          )}
          {!membership && isRegularMember && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-light tracking-wide bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
              <Award className="w-3 h-3" /> 普通学员
            </span>
          )}
        </div>
        {!membership && (
          <button onClick={() => navigate('/membership')} className="text-xs text-[var(--color-accent)] hover:opacity-80 font-light mb-2">
            开通会员享全站课程
          </button>
        )}
        <p className="text-[var(--color-text-secondary)] text-sm font-light">{userData?.username}</p>
        <div className="w-12 h-px mx-auto mt-6" style={{ backgroundColor: 'var(--color-border)' }} />
      </div>

      {/* Membership Card */}
      <div
        className="rounded-lg p-6 mb-6 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.01]"
        onClick={() => navigate('/membership')}
        style={{
          background: membership?.tier === 'founder'
            ? 'linear-gradient(135deg, var(--secondary) 0%, var(--chart-4) 100%)'
            : membership?.tier === 'yearly'
              ? 'linear-gradient(135deg, var(--chart-5) 0%, var(--secondary) 100%)'
              : 'linear-gradient(135deg, var(--muted-foreground) 0%, var(--foreground) 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              {membership?.tier === 'founder' ? (
                <Crown className="w-6 h-6 text-white" />
              ) : membership?.tier === 'yearly' ? (
                <Shield className="w-6 h-6 text-white" />
              ) : (
                <Award className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-white font-serif text-lg font-light">
                {membership?.tier === 'founder' ? '创始会员' : membership?.tier === 'yearly' ? '年卡会员' : '普通学员'}
              </h3>
              <p className="text-white/70 text-xs font-light mt-1">
                {membership?.tier === 'founder'
                  ? '永久有效 · 全站课程免费'
                  : membership?.tier === 'yearly'
                    ? `有效期至 ${membership.expires_at ? new Date(membership.expires_at).toLocaleDateString('zh-CN') : ''}`
                    : '开通会员享全站课程'}
              </p>
            </div>
          </div>
          <div className="text-right">
            {membership ? (
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-xs font-light">
                已开通
              </span>
            ) : (
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-white text-xs font-light">
                去开通
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Points Card */}
      <div
        className="rounded-lg p-8 mb-12 text-center text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <p className="text-white/70 text-sm mb-2 font-light">你的迹</p>
        <p className="text-5xl font-light" style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}>{userData?.points || 0}</p>
        <div className="w-16 h-px bg-white/30 mx-auto mt-4 mb-4" />
        <p className="text-white/60 text-xs font-light">迹是闻见的内容凭证，1 迹可抵 1 元</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center mb-12">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('points')}
            className={`font-serif text-sm tracking-wide pb-2 border-b flex items-center gap-1 transition-colors ${
              activeTab === 'points'
                ? 'text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            预存路径
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`font-serif text-sm tracking-wide pb-2 border-b flex items-center gap-1 transition-colors ${
              activeTab === 'records'
                ? 'text-[var(--color-text-primary)] border-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            交易记录
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-0">
        {activeTab === 'points' && (
          <div className="space-y-6">
            {/* WeChat Contact */}
            <div className="zen-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--muted)' }}
                >
                  <MessageCircle className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="font-serif text-[var(--color-text-primary)]">添加主编</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">加时注明"闻见"</p>
                </div>
              </div>
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-sm text-[var(--color-text-secondary)] mb-1">获赠 20 枚迹</p>
                <p className="text-sm text-[var(--color-text-primary)] flex items-center justify-center gap-2">
                  微信 panshanpan
                  <button
                    onClick={handleCopyWechat}
                    className="text-[var(--color-accent)] hover:opacity-80 transition-opacity"
                    title="复制微信号"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </p>
              </div>
            </div>

            {/* Xiaohongshu */}
            <div className="zen-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--muted)' }}
                >
                  <ShoppingBag className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="font-serif text-[var(--color-text-primary)]">小红书下单预存</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">小红书店铺下单</p>
                </div>
              </div>
              <div
                className="rounded-lg p-4"
                style={{ background: 'var(--card)', border: '1px solid var(--color-border)' }}
              >
                <div className="text-center">
                  {loadingLink ? (
                    <div className="h-5 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-accent)]" />
                    </div>
                  ) : xiaohongshuLink?.url && xiaohongshuLink?.is_enabled ? (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      小红书预存迹，1：1
                      <button
                        onClick={handleXiaohongshuClick}
                        className="ml-2 text-[var(--color-accent)] hover:opacity-80 transition-opacity underline underline-offset-4 inline-flex items-center gap-0.5"
                      >
                        前往
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      小红书预存迹，1：1
                      <span className="ml-2 text-[var(--color-text-secondary)] opacity-50">暂未开放</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Invite */}
            <div className="zen-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--muted)' }}
                >
                  <Users className="w-5 h-5 text-[var(--color-accent)]" />
                </div>
                <div>
                  <h3 className="font-serif text-[var(--color-text-primary)]">邀请好友</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">邀请好友加入获取奖励</p>
                </div>
              </div>
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: 'var(--card)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-sm text-[var(--color-text-secondary)] text-center">
                  即将上线，敬请期待
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'records' && (
          allRecords.length === 0 ? (
            <p className="text-center font-serif text-[var(--color-text-secondary)] py-16">暂无交易记录</p>
          ) : (
            allRecords.map((record, index) => {
              const points = getRecordPoints(record);
              return (
                <div
                  key={`${record.type}-${record.id}`}
                  className={`py-6 flex justify-between items-center ${
                    index !== allRecords.length - 1 ? 'border-b border-[var(--color-border)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: 'var(--muted)' }}
                    >
                      <span className="text-[var(--color-text-secondary)]">
                        {getRecordIcon(record.type)}
                      </span>
                    </div>
                    <div>
                      <p className="font-serif text-[var(--color-text-primary)]">{getRecordTitle(record)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs text-[var(--color-text-secondary)] px-2 py-0.5 rounded"
                          style={{ background: 'var(--muted)' }}
                        >
                          {getRecordTypeLabel(record.type)}
                        </span>
                        <p className="text-[var(--color-text-secondary)] text-sm">{getRecordDate(record)}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`font-serif ${points.color}`}>
                    {points.value > 0 ? `+${points.value}` : points.value}
                  </span>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
}
