import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Leaf, Check } from 'lucide-react';

const rechargeOptions = [
  { amount: 50, points: 50, label: '50' },
  { amount: 100, points: 100, label: '100' },
  { amount: 200, points: 200, label: '200' },
];

export default function Recharge() {
  const { userData, refreshUserData } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleRecharge = async () => {
    if (!selectedAmount) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      refreshUserData();
      setTimeout(() => setSuccess(false), 2000);
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-6">
      <div className="text-center mb-16">
        <div className="w-16 h-16 bg-[#5a7a6b]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Leaf className="w-8 h-8 text-[#5a7a6b]" />
        </div>
        <h1 className="text-2xl font-light text-[#3d3d3d] tracking-wide mb-2">预存路径</h1>
        <p className="text-[#8a8a8a] text-sm">1元 = 1迹</p>
      </div>

      <div className="bg-[#faf9f7] rounded-lg p-8 mb-12 text-center">
        <p className="text-[#8a8a8a] text-sm mb-2">当前余额</p>
        <p className="text-4xl font-light text-[#3d3d3d]">{userData?.points ?? 0}</p>
      </div>

      <div className="mb-12">
        <p className="text-center text-[#8a8a8a] text-sm mb-8">选择充值金额</p>
        <div className="grid grid-cols-3 gap-4">
          {rechargeOptions.map((option) => (
            <button
              key={option.amount}
              onClick={() => setSelectedAmount(option.amount)}
              className={`relative py-6 rounded-sm border ${
                selectedAmount === option.amount
                  ? 'border-[#5a7a6b] bg-[#5a7a6b]/5'
                  : 'border-[#e0d8cf] bg-white hover:border-[#c9bfb0]'
              }`}
            >
              <span className="text-2xl font-light text-[#3d3d3d]">{option.label}</span>
              <span className="text-xs text-[#8a8a8a] ml-1">元</span>
              {selectedAmount === option.amount && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-[#5a7a6b]" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleRecharge}
        disabled={!selectedAmount || loading}
        className="w-full py-4 bg-[#5a7a6b] text-white text-sm tracking-widest rounded-sm hover:bg-[#4a6a5b] disabled:bg-[#d4ccc4] disabled:cursor-not-allowed"
      >
        {loading ? '处理中...' : success ? '充值成功' : '立即充值'}
      </button>

      <p className="text-center text-xs text-[#b0a696] mt-8">
        支付接口预留：微信支付/支付宝
      </p>
    </div>
  );
}
