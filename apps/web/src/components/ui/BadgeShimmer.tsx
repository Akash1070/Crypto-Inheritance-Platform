import React from 'react';

interface BadgeShimmerProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'blue' | 'purple' | 'amber';
  className?: string;
}

export function BadgeShimmer({
  children,
  variant = 'emerald',
  className = ''
}: BadgeShimmerProps) {
  const variantStyles = {
    emerald: 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-100/80 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300',
    blue: 'border-blue-300 dark:border-blue-500/30 bg-blue-100/80 dark:bg-blue-950/50 text-blue-900 dark:text-blue-300',
    purple: 'border-purple-300 dark:border-purple-500/30 bg-purple-100/80 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300',
    amber: 'border-amber-300 dark:border-amber-500/30 bg-amber-100/80 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300'
  };

  return (
    <div
      className={`relative inline-flex items-center overflow-hidden rounded-full border px-3 py-1 text-xs font-sans font-bold tracking-wide backdrop-blur-md shadow-xs ${variantStyles[variant]} ${className}`}
    >
      <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-20deg)] animate-shimmer">
        <div className="h-full w-8 bg-white/20 dark:bg-white/10" />
      </div>
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </div>
  );
}
