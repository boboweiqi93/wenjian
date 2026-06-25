import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';

interface PurchaseRecord {
  id: string;
  user_id: string;
  course_id: string;
  points_spent: number;
  created_at: string | null;
  user: { username: string };
  course: { title: string };
}

interface RechargeRecord {
  id: string;
  user_id: string;
  amount: number;
  points: number;
  payment_status: string | null;
  created_at: string | null;
  user: { username: string };
}

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState<'purchases' | 'recharges'>('purchases');
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: purchaseData } = await supabase
      .from('user_courses')
      .select('*, user:users(username), course:courses(title)')
      .order('created_at', { ascending: false });

    const { data: rechargeData } = await supabase
      .from('recharges')
      .select('*, user:users(username)')
      .order('created_at', { ascending: false });

    setPurchases(purchaseData || []);
    setRecharges(rechargeData || []);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-[var(--border)] pb-6">
        <h1 className="text-2xl font-serif font-light text-[var(--color-text-primary)] tracking-wide">订单记录</h1>
      </div>

      <div className="flex space-x-8 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`pb-4 font-serif text-sm tracking-wide border-b-2 ${
            activeTab === 'purchases'
              ? 'text-[var(--color-text-primary)] border-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] border-transparent hover:text-[#5a6b5a]'
          }`}
        >
          购买记录
        </button>
        <button
          onClick={() => setActiveTab('recharges')}
          className={`pb-4 font-serif text-sm tracking-wide border-b-2 ${
            activeTab === 'recharges'
              ? 'text-[var(--color-text-primary)] border-[var(--color-text-primary)]'
              : 'text-[var(--color-text-secondary)] border-transparent hover:text-[#5a6b5a]'
          }`}
        >
          充值记录
        </button>
      </div>

      <div className="bg-[#faf9f7] border border-[#e0d8cf]">
        {activeTab === 'purchases' ? (
          <div className="divide-y divide-[#e0d8cf]">
            {purchases.length === 0 ? (
              <p className="text-center py-16 text-[#9a9082] font-light">暂无购买记录</p>
            ) : (
              purchases.map((record) => (
                <div key={record.id} className="py-5 px-6 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-serif text-[var(--color-text-primary)]">{record.user?.username}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">{record.course?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-[var(--color-text-primary)]">-{record.points_spent}</p>
                    <p className="text-xs text-[#9a9082] mt-1">{formatDate(record.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#e0d8cf]">
            {recharges.length === 0 ? (
              <p className="text-center py-16 text-[#9a9082] font-light">暂无充值记录</p>
            ) : (
              recharges.map((record) => (
                <div key={record.id} className="py-5 px-6 flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-serif text-[var(--color-text-primary)]">{record.user?.username}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1">¥{record.amount}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif text-[var(--color-sage)]">+{record.points}</p>
                    <p className="text-xs text-[#9a9082] mt-1">{formatDate(record.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
