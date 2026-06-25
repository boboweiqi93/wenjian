import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { LayoutDashboard, Users, BookOpen, Receipt, Mail, CornerUpLeft, LogOut, Ticket, FileText, Tag, UserCircle, Coins, Link2, Crown } from 'lucide-react';

export default function AdminLayout({ children }: { children?: React.ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/');
    }
  }, [user, isAdmin, navigate]);

  if (!user || !isAdmin) {
    return null;
  }

  const navItems = [
    { path: '/admin', label: '数据看板', icon: LayoutDashboard },
    { path: '/admin/users', label: '用户管理', icon: Users },
    { path: '/admin/courses', label: '课程管理', icon: BookOpen },
    { path: '/admin/articles', label: '文章管理', icon: FileText },
    { path: '/admin/tags', label: '分类标签', icon: Tag },
    { path: '/admin/authors', label: '作者管理', icon: UserCircle },
    { path: '/admin/invitation-codes', label: '课程兑换码', icon: Ticket },
    { path: '/admin/point-codes', label: '积分充值码', icon: Coins },
    { path: '/admin/membership-codes', label: '会员邀请码', icon: Crown },
    { path: '/admin/orders', label: '订单记录', icon: Receipt },
    { path: '/admin/invitations', label: '邀请记录', icon: Mail },
    { path: '/admin/external-links', label: '外链配置', icon: Link2 },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <header
        className="sticky top-0 z-50 backdrop-blur-md border-b"
        style={{
          background: isDark ? 'rgba(6, 2, 1, 0.9)' : 'rgba(251, 250, 249, 0.9)',
          borderColor: 'var(--color-border)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link
                to="/"
                className="flex items-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              >
                <CornerUpLeft className="w-5 h-5" />
              </Link>
              <div className="h-4 w-px bg-[var(--color-border)]" />
              <span className="text-lg font-light text-[var(--color-text-primary)] tracking-wide">管理</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center space-x-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-light tracking-wide">退出</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside
          className="w-56 min-h-screen border-r"
          style={{
            background: isDark ? 'rgba(6, 2, 1, 0.6)' : 'rgba(251, 250, 249, 0.5)',
            borderColor: 'var(--color-border)'
          }}
        >
          <nav className="p-6 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-light tracking-wide text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8 lg:p-12">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
