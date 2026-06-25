import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/client';
import { Users, BookOpen, ShoppingCart, Coins } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    courses: 0,
    orders: 0,
    recharges: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [{ count: users }, { count: courses }, { count: orders }, { count: recharges }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('user_courses').select('*', { count: 'exact', head: true }),
      supabase.from('recharges').select('*', { count: 'exact', head: true }),
    ]);

    setStats({
      users: users || 0,
      courses: courses || 0,
      orders: orders || 0,
      recharges: recharges || 0,
    });
  };

  const cards = [
    { label: '总用户数', value: stats.users, icon: Users },
    { label: '课程总数', value: stats.courses, icon: BookOpen },
    { label: '购买订单', value: stats.orders, icon: ShoppingCart },
    { label: '充值记录', value: stats.recharges, icon: Coins },
  ];

  return (
    <div className="space-y-12">
      <div className="border-b border-[var(--border)] pb-8">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">管理概览</h1>
        <p className="text-[var(--color-text-secondary)] mt-2 font-light">静观数据，洞察全局</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--card)] border border-[var(--border)] p-8 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-light text-[var(--color-text-secondary)] tracking-wide">{card.label}</p>
                <p className="text-3xl font-serif font-light text-[var(--color-text-primary)] mt-3">{card.value}</p>
              </div>
              <card.icon className="w-5 h-5 text-[var(--secondary)]" strokeWidth={1} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
