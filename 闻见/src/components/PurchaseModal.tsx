import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Wallet, AlertCircle, CheckCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '../supabase/client';

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'confirm' | 'insufficient' | 'xiaohongshu' | 'points-only';
  courseTitle: string;
  pointsPrice: number;
  userPoints: number;
  purchaseUrl?: string | null;
  onConfirm?: () => void;
}

export default function PurchaseModal({
  isOpen,
  onClose,
  mode,
  courseTitle,
  pointsPrice,
  userPoints,
  purchaseUrl,
  onConfirm
}: PurchaseModalProps) {
  const navigate = useNavigate();
  const [xiaohongshuUrl, setXiaohongshuUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchXiaohongshuLink();
    }
  }, [isOpen]);

  const fetchXiaohongshuLink = async () => {
    const { data } = await supabase
      .from('external_links')
      .select('url')
      .eq('key', 'xiaohongshu_shop')
      .eq('is_enabled', true)
      .maybeSingle();
    if (data) {
      setXiaohongshuUrl(data.url);
    }
  };

  if (!isOpen) return null;

  const handleRecharge = () => {
    onClose();
    if (xiaohongshuUrl) {
      window.open(xiaohongshuUrl, '_blank');
    } else {
      navigate('/recharge');
    }
  };

  const handleXiaohongshu = () => {
    if (purchaseUrl) {
      window.open(purchaseUrl, '_blank');
    }
    onClose();
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const renderContent = () => {
    switch (mode) {
      case 'confirm':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[var(--secondary)]" />
              </div>
              <h3 className="font-serif text-lg text-[var(--color-text-primary)]">确认兑换</h3>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-6">
              <p>课程：{courseTitle}</p>
              <p>所需迹：<span className="text-[var(--secondary)] font-medium">{pointsPrice}</span></p>
              <p>当前迹：<span className="text-[var(--color-text-primary)]">{userPoints}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors text-sm font-light"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity text-sm font-light"
              >
                确认兑换
              </button>
            </div>
          </>
        );

      case 'insufficient':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-serif text-lg text-[var(--color-text-primary)]">迹不足</h3>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-6">
              <p>课程：{courseTitle}</p>
              <p>所需迹：<span className="text-[var(--secondary)] font-medium">{pointsPrice}</span></p>
              <p>当前迹：<span className="text-amber-500 font-medium">{userPoints}</span></p>
              <p className="text-xs text-amber-600">还差 {pointsPrice - userPoints} 迹</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors text-sm font-light"
              >
                取消
              </button>
              <button
                onClick={handleRecharge}
                className="flex-1 py-2.5 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity text-sm font-light flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                去预存迹
              </button>
            </div>
          </>
        );

      case 'xiaohongshu':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--color-rose)]/10 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-[var(--color-rose)]" />
              </div>
              <h3 className="font-serif text-lg text-[var(--color-text-primary)]">前往小红书购买</h3>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-6">
              <p>课程：{courseTitle}</p>
              <p>该课程支持在小红书平台购买</p>
              <p className="text-xs text-[var(--color-text-secondary)]/70">购买后将获得课程解锁码</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors text-sm font-light"
              >
                取消
              </button>
              <button
                onClick={handleXiaohongshu}
                className="flex-1 py-2.5 bg-[var(--color-rose)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-light flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                前往小红书
              </button>
            </div>
          </>
        );

      case 'points-only':
        return (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[var(--secondary)]" />
              </div>
              <h3 className="font-serif text-lg text-[var(--color-text-primary)]">仅支持积分兑换</h3>
            </div>
            <div className="space-y-3 text-sm text-[var(--color-text-secondary)] mb-6">
              <p>课程：{courseTitle}</p>
              <p>该课程仅支持使用「迹」兑换</p>
              <p>当前迹：<span className="text-[var(--color-text-primary)]">{userPoints}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors text-sm font-light"
              >
                取消
              </button>
              <button
                onClick={handleRecharge}
                className="flex-1 py-2.5 bg-[var(--secondary)] text-[var(--color-bg-primary)] rounded-lg hover:opacity-90 transition-opacity text-sm font-light flex items-center justify-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                去预存迹
              </button>
            </div>
          </>
        );

        default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[var(--muted)] rounded-xl shadow-2xl w-full max-w-sm p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {renderContent()}
      </div>
    </div>
  );
}
