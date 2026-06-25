import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse bg-[var(--muted)] ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <SkeletonPulse className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="space-y-3">
              <SkeletonPulse className="aspect-video w-full rounded-xl" />
              <SkeletonPulse className="h-5 w-3/4" />
              <SkeletonPulse className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContentSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <SkeletonPulse className="h-10 w-3/4" />
        <SkeletonPulse className="h-5 w-1/3" />
        <SkeletonPulse className="aspect-[2/1] w-full rounded-xl" />
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="space-y-3">
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-full" />
            <SkeletonPulse className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-4">
        <SkeletonPulse className="h-8 w-32 mb-8" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between py-4 border-b border-[var(--color-border)]">
            <div className="flex-1 space-y-2">
              <SkeletonPulse className="h-5 w-3/5" />
              <SkeletonPulse className="h-3 w-1/4" />
            </div>
            <SkeletonPulse className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ErrorState({
  icon: Icon = AlertCircle,
  message,
  onRetry,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-[var(--color-text-secondary)]">
      <Icon className="w-10 h-10 mb-4 text-[var(--color-accent)]" />
      <p className="mb-4 font-light">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" />
          重试
        </button>
      )}
    </div>
  );
}

export function NotFoundState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-8 py-24">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[var(--color-text-secondary)] font-light">{message}</p>
        <button
          onClick={onAction}
          className="mt-8 text-[var(--color-accent)] hover:opacity-80 font-light"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
