import React from 'react';
import { Link, useLocation, useNavigate, Outlet, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useAudio } from '../contexts/AudioContext';
import { useToast } from './Toast';
import { getSupabaseUrl } from '../supabase/client';
import { BookOpen, User, LogOut, Sun, Moon, Headphones, WifiOff } from 'lucide-react';
import GlobalAudioIndicator from './GlobalAudioIndicator';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const { user, userData, logout, isAdmin, loading } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { isExpanded, setIsExpanded } = useAudio();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [redeeming, setRedeeming] = React.useState(false);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  // 已登录用户访问带 membership_code 参数时自动兑换（优先于未登录重定向）
  React.useEffect(() => {
    // 等待加载完成后再处理
    if (loading) return;

    const membershipCode = searchParams.get('membership_code');

    // 已登录用户：自动兑换会员码
    if (user && membershipCode && !redeeming) {
      setRedeeming(true);
      fetch(`${getSupabaseUrl()}/functions/v1/redeem-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: membershipCode.toUpperCase(), userId: user.id }),
      })
        .then(async (res) => {
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.error || '会员兑换失败');
          }
          return result;
        })
        .then((result) => {
          if (result.success) {
            showToast(`会员开通成功：${result.plan_name}`, 'success');
          } else {
            showToast(result.error || '会员兑换失败', 'error');
          }
        })
        .catch((err) => {
          if (err.message?.includes('认证') || err.message?.includes('auth')) {
            showToast('登录状态已过期，请重新登录后再试', 'error');
          } else {
            showToast(err.message || '网络错误，请重试', 'error');
          }
        })
        .finally(() => {
          // 清除 URL 中的 membership_code 参数防止刷新重复兑换，然后跳转会员页
          const newParams = new URLSearchParams(searchParams);
          newParams.delete('membership_code');
          navigate(`/membership?${newParams.toString()}`, { replace: true });
          setRedeeming(false);
        });
      return; // 已登录用户处理完毕，不再执行后续重定向逻辑
    }

    // 未登录用户：根据是否有 membership_code 决定重定向目标
    if (!user && location.pathname !== '/login' && location.pathname !== '/register' && !location.pathname.startsWith('/invite') && !location.pathname.startsWith('/recharge')) {
      if (membershipCode) {
        navigate(`/register?membership_code=${encodeURIComponent(membershipCode)}`, { replace: true });
      } else {
        navigate('/login');
      }
    }
  }, [user, loading, searchParams, redeeming, navigate, location.pathname]);

  const prevPathRef = React.useRef(location.pathname);

  React.useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      if (isExpanded) {
        setIsExpanded(false);
      }
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-sm font-light tracking-widest" style={{ color: 'var(--color-text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  // 正在兑换会员码时，允许页面继续渲染（避免被守卫拦截）
  const hasMembershipCode = searchParams.get('membership_code');
  if (!user && !redeeming && !hasMembershipCode && !location.pathname.startsWith('/invite') && !location.pathname.startsWith('/recharge') && location.pathname !== '/login' && location.pathname !== '/register') {
    return null;
  }

  const navItems = [
    { path: '/', label: '首页', icon: BookOpen },
    { path: '/audio', label: '音频', icon: Headphones },
    { path: '/profile', label: '我的', icon: User },
  ];
  const isAudioPage = location.pathname === '/audio';

  return (
    <div className="min-h-screen relative" style={{ background: 'var(--background)' }}>
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm text-white"
            style={{ background: 'rgba(200, 80, 80, 0.95)' }}
          >
            <WifiOff className="w-4 h-4" />
            <span>网络已断开，部分功能可能不可用</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 顶部导航栏 - 半透明毛玻璃效果 */}
      <header
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{
          background: isDark
            ? (isAudioPage ? 'rgba(6, 2, 1, 0.74)' : 'rgba(6, 2, 1, 0.85)')
            : (isAudioPage ? 'rgba(251, 250, 249, 0.74)' : 'rgba(251, 250, 249, 0.85)'),
          borderColor: isAudioPage ? 'var(--border)' : 'var(--color-border)'
        }}
      >
        <div className={`max-w-7xl mx-auto ${isAudioPage ? 'px-5 md:px-10' : 'px-6 md:px-12'}`}>
          <div className={`flex justify-between items-center ${isAudioPage ? 'h-14 md:h-[60px]' : 'h-16'}`}>
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-3 group">
                <span 
                  className={`${isAudioPage ? 'text-[18px] md:text-[19px]' : 'text-xl'} font-light tracking-wide transition-opacity duration-300 group-hover:opacity-70`}
                  style={{ fontFamily: "'Fraunces', 'Noto Serif SC', serif" }}
                >
                  <span style={{ color: 'var(--primary)' }}>闻</span>
                  <span style={{ color: 'var(--secondary)' }}>见</span>
                </span>
              </Link>
            </div>

            <div className={`flex items-center ${isAudioPage ? 'space-x-4 md:space-x-5' : 'space-x-6'}`}>
              <motion.button
                onClick={toggleTheme}
                whileHover={{ rotate: 15, scale: 1.1 }}
                whileTap={{ rotate: -15, scale: 0.9 }}
                animate={{ rotate: isDark ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="theme-toggle"
                title={isDark ? '切换到浅色模式' : '切换到深色模式'}
              >
                <div className={`sun-icon ${isDark ? 'opacity-0' : 'opacity-100'}`}>
                  <Sun className={`${isAudioPage ? 'w-4.5 h-4.5' : 'w-5 h-5'}`} strokeWidth={1.5} />
                </div>
                <div className={`moon-icon ${isDark ? 'opacity-100' : 'opacity-0'}`}>
                  <Moon className={`${isAudioPage ? 'w-4.5 h-4.5' : 'w-5 h-5'}`} strokeWidth={1.5} />
                </div>
              </motion.button>

              <div
                className={`${isAudioPage ? 'hidden md:flex' : 'flex'} items-center space-x-2`}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <span className={`${isAudioPage ? 'text-[11px]' : 'text-xs'} font-light tracking-wider`}>{userData?.points || 0} 迹</span>
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  className={`${isAudioPage ? 'text-[11px]' : 'text-xs'} font-light tracking-wider transition-colors duration-300 hover:text-[var(--color-accent)]`}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  管理
                </Link>
              )}

              <button
                onClick={logout}
                className={`${isAudioPage ? 'text-[11px]' : 'text-xs'} font-light tracking-wider transition-colors duration-300 hover:text-[var(--color-accent)]`}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <GlobalAudioIndicator />

      {/* 桌面端侧边栏 */}
      <div
        className="hidden md:block fixed left-0 top-16 bottom-0 w-56 border-r"
        style={{
          background: isDark ? 'rgba(6, 2, 1, 0.6)' : 'rgba(251, 250, 249, 0.5)',
          borderColor: 'var(--color-border)'
        }}
      >
        <nav className="p-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <motion.div
                key={item.path}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Link
                  to={item.path}
                  className={`zen-nav-item flex items-center space-x-3 w-full ${isActive ? 'active' : ''}`}
                >
                  <item.icon className="w-4 h-4 stroke-[1.5]" />
                  <span className="font-light text-sm tracking-wide">{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* 主内容区 */}
      <main className={`main-content ${isAudioPage ? 'pt-14 md:pt-[60px]' : 'pt-16'} relative z-10`}>
        <div className={`${isAudioPage ? 'max-w-4xl px-4 md:px-10 py-4 md:py-8' : 'max-w-5xl px-6 md:px-12 py-12'} mx-auto pb-24 md:pb-12`}>
          {children || <Outlet />}
        </div>
      </main>

      {/* 移动端底部导航 */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-50 backdrop-blur-md border-t"
        style={{
          background: isDark
            ? (isAudioPage ? 'rgba(6, 2, 1, 0.82)' : 'rgba(6, 2, 1, 0.92)')
            : (isAudioPage ? 'rgba(251, 250, 249, 0.82)' : 'rgba(251, 250, 249, 0.92)'),
          borderColor: isAudioPage ? 'var(--border)' : 'var(--color-border)'
        }}
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <motion.div
                key={item.path}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Link
                  to={item.path}
                  className={`flex flex-col items-center space-y-1 px-4 py-2 transition-all duration-300 ${
                    isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 stroke-[1.5] transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
                  <span className={`text-[10px] font-light tracking-wider ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
