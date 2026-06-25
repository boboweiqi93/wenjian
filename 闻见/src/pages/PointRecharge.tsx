import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';
import { Gift, Check, AlertCircle, Loader2, Coins, LogIn, UserPlus } from 'lucide-react';

export default function PointRecharge() {
  const { user, userData, refreshUserData, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ points: number; total: number } | null>(null);
  const redeemingRef = useRef(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [shouldRedeemAfterLogin, setShouldRedeemAfterLogin] = useState(false);

  const handleRedeem = useCallback(async (inputCode?: string) => {
    const redeemCode = inputCode || code;
    if (!redeemCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    if (!user) {
      setPendingCode(redeemCode);
      setShouldRedeemAfterLogin(true);
      setShowAuthModal(true);
      return;
    }

    if (redeemingRef.current) return;
    redeemingRef.current = true;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch(`${window.location.origin}/sb-api/functions/v1/redeem-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: redeemCode, userId: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('兑换失败:', data.error || response.statusText);
        setError(data?.error || `请求失败 (${response.status})`);
        redeemingRef.current = false;
      } else if (data?.error) {
        console.error('兑换失败:', data.error);
        setError(data.error);
        redeemingRef.current = false;
      } else if (data?.success) {
        setSuccess(true);
        setSuccessInfo({ points: data.points_added, total: data.total_points });
        setCode('');
        setPendingCode('');
        setShouldRedeemAfterLogin(false);
        refreshUserData();
        setTimeout(() => {
          setSuccess(false);
          setSuccessInfo(null);
        }, 3000);
      } else {
        setError('兑换失败，请稍后重试');
        redeemingRef.current = false;
      }
    } catch (err: any) {
      console.error('兑换异常:', err);
      setError(err.message || '兑换失败，请稍后重试');
    } finally {
      setLoading(false);
      redeemingRef.current = false;
    }
  }, [user, code, refreshUserData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCode = params.get('code');
    if (urlCode) {
      const upperCode = urlCode.toUpperCase();
      setCode(upperCode);
      setPendingCode(upperCode);
      if (!user) {
        setShouldRedeemAfterLogin(true);
        setShowAuthModal(true);
      } else if (!redeemingRef.current && shouldRedeemAfterLogin) {
        handleRedeem(upperCode);
      }
    }
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await login(username.trim(), password);
      if (result.error) {
        setLoginError(result.error.message || '登录失败');
      } else {
        setShowAuthModal(false);
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      setLoginError(err.message || '登录失败');
    }
    setLoginLoading(false);
  };

  const handleGoRegister = () => {
    navigate(`/register?invite_code=${pendingCode}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRedeem();
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <div className="text-center mb-12">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'var(--muted)' }}
        >
          <Coins className="w-8 h-8 text-[var(--secondary)]" />
        </div>
        <h1 className="text-2xl font-light text-[var(--color-text-primary)] tracking-wide mb-2">预存路径</h1>
        <p className="text-[var(--color-text-secondary)] text-sm">输入引荐印记预存迹</p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ background: 'rgba(220, 120, 120, 0.08)', border: '1px solid rgba(220, 120, 120, 0.2)' }}>
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && successInfo && (
        <div className="mb-6 p-4 rounded-lg flex items-center gap-3" style={{ background: 'rgba(120, 180, 140, 0.08)', border: '1px solid rgba(120, 180, 140, 0.2)' }}>
          <Check className="w-5 h-5 text-[var(--secondary)]" />
          <div>
            <p className="text-[var(--secondary)] text-sm font-medium">兑换成功！</p>
            <p className="text-[var(--color-text-secondary)] text-xs">预存 {successInfo.points} 迹，当前 {successInfo.total} 迹</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-2 font-light">邀请码</label>
          <div className="relative">
            <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入邀请码"
              className="zen-input w-full pl-12 pr-4 py-4"
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="zen-btn w-full py-4 text-sm tracking-widest flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />兑换中...</>
          ) : (
            '立即兑换'
          )}
        </button>
      </form>

      {!user && !showAuthModal && (
        <div className="mt-8 p-4 rounded-lg text-center" style={{ background: 'var(--muted)' }}>
          <p className="text-[var(--color-text-secondary)] text-sm">请先登录后预存迹</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-3 text-[var(--secondary)] text-sm hover:opacity-80 transition-opacity"
          >
            去登录
          </button>
        </div>
      )}

      {showAuthModal && !user && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" style={{animation: 'fadeIn 0.3s ease'}}>
          <div
            className="backdrop-blur-xl rounded-2xl p-8 w-full max-w-sm mx-4"
            style={{
              background: 'rgba(251, 250, 249, 0.9)',
              border: '1px solid var(--color-border)',
              boxShadow: 'var(--shadow-md)',
              animation: 'zoomIn 0.3s ease',
            }}
          >
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--muted)' }}
              >
                <Gift className="w-8 h-8 text-[var(--secondary)]" />
              </div>
              <h3 className="font-serif text-xl text-[var(--color-text-primary)] font-light tracking-wide mb-2">
                欢迎访问
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm font-light leading-relaxed">
                检测到引荐印记，登录后将自动为您预存迹
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg text-red-400 text-sm text-center" style={{ background: 'rgba(220, 120, 120, 0.08)', border: '1px solid rgba(220, 120, 120, 0.2)' }}>
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="zen-input w-full px-4 py-3 text-sm"
                  placeholder="手机号"
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="zen-input w-full px-4 py-3 text-sm"
                  placeholder="密码"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loginLoading}
                className="zen-btn w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{loginLoading ? '登录中...' : '登录并兑换'}</span>
              </button>
            </form>

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={handleGoRegister}
                className="w-full py-3 font-light tracking-wide flex items-center justify-center gap-2 rounded-lg transition-colors"
                style={{
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span>立即注册</span>
              </button>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full mt-4 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-light transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
