import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';

interface AuthContextType {
  user: any;
  userData: any;
  isAdmin: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedSession = localStorage.getItem('panpan_session');
      const savedUser = localStorage.getItem('panpan_user');

      if (savedSession && savedUser) {
        try {
          const session = JSON.parse(savedSession);
          const userInfo = JSON.parse(savedUser);

          if (session.expires_at && session.expires_at > Date.now()) {
            setUser(userInfo);
            await fetchUserData(userInfo.id);
          } else {
            localStorage.removeItem('panpan_user');
            localStorage.removeItem('panpan_session');
          }
        } catch (e) {
          localStorage.removeItem('panpan_user');
          localStorage.removeItem('panpan_session');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const fetchUserData = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!error && data) {
      setUserData(data);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  };

  const login = async (username: string, password: string) => {
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (userError) {
      return { error: { message: '登录失败: ' + userError.message } };
    }

    if (!userRecord) {
      return { error: { message: '用户名不存在' } };
    }

    if (userRecord.password_hash !== password) {
      return { error: { message: '密码错误' } };
    }

    const userInfo = {
      id: userRecord.id,
      username: userRecord.username,
    };

    localStorage.setItem('panpan_user', JSON.stringify(userInfo));
    localStorage.setItem('panpan_session', JSON.stringify({
      user: { id: userRecord.id, email: `${username}@meoo.local` },
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
    }));
    setUser(userInfo);
    setUserData(userRecord);

    return { error: null };
  };

  const logout = async () => {
    localStorage.removeItem('panpan_user');
    localStorage.removeItem('panpan_session');
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        isAdmin: userData?.is_admin ?? false,
        loading,
        login,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
