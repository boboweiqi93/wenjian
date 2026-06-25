import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabase/client';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });
  const [inviteCode, setInviteCode] = useState('');
  const [isPointCode, setIsPointCode] = useState(false);
  const { user, loading: authLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code') || '';
    const state = location.state as any;
    if (state?.inviteCode) {
      setInviteCode(state.inviteCode);
      setIsPointCode(state.isPointCode || false);
    } else if (code) {
      setInviteCode(code);
      setIsPointCode(false);
    }
  }, [location]);

  const getValidationError = () => {
    if (touched.username && !username.trim()) return '请输入手机号';
    if (touched.password && !password) return '请输入密码';
    return '';
  };

  const validationError = getValidationError();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });
    if (!username.trim() || !password) return;
    setError('');
    setLoading(true);

    try {
      const result = await login(username.trim(), password);
      if (result.error) {
        setError(result.error.message || '登录失败');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem('panpan_session', JSON.stringify(session));
        }
        const state = location.state as any;
        if (isPointCode && inviteCode) {
          navigate(`/recharge?code=${inviteCode}`);
        } else if (state?.redirect) {
          navigate(state.redirect);
        } else if (inviteCode) {
          navigate(`/invite?code=${inviteCode}`);
        } else {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: 'var(--background)' }}
    >

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-12">
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <h1
              className="text-3xl tracking-wide mb-3 font-light"
              style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}
            >
              <span style={{ color: 'var(--primary)' }}>闻</span>
              <span style={{ color: 'var(--secondary)' }}>见</span>
            </h1>
          </motion.div>
          <p className="text-sm font-light tracking-[0.2em]" style={{ color: 'var(--color-text-secondary)' }}>
            沉下来的知识
          </p>
        </div>

        {isPointCode && inviteCode && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{
              background: 'var(--muted)',
              border: '1px solid var(--border)'
            }}
          >
            <p className="text-sm text-center" style={{ color: 'var(--primary)' }}>
              检测到引荐印记，登录后将自动为您预存迹
            </p>
          </div>
        )}

        {error && (
          <div
            className="mb-6 p-3 text-sm text-center rounded animate-fade-in flex items-center justify-center gap-2"
            style={{
              background: 'var(--muted)',
              color: 'var(--color-danger)'
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {validationError && !error && (
          <div className="mb-6 p-3 text-sm text-center rounded animate-fade-in flex items-center justify-center gap-2"
            style={{
              background: 'var(--muted)',
              color: 'var(--color-danger)'
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {validationError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, username: true }))}
              className="zen-input"
              placeholder="手机号"
              required
              autoComplete="username"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
              className="zen-input pr-10"
              placeholder="密码"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="zen-btn w-full mt-8 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? '登录中...' : '进入'}
          </button>

          <div className="pt-4 text-center">
            <span className="text-sm font-light" style={{ color: 'var(--text-muted)' }}>还没有账号？</span>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="ml-2 text-sm font-light transition-colors duration-300"
              style={{ color: 'var(--primary)' }}
            >
              立即注册
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
