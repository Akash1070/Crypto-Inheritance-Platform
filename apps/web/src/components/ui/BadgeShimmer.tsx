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
    emerald: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
    blue: 'border-blue-500/30 bg-blue-950/40 text-blue-300',
    purple: 'border-purple-500/30 bg-purple-950/40 text-purple-300',
    amber: 'border-amber-500/30 bg-amber-950/40 text-amber-300'
  };

  return (
    <div
      className={`relative inline-flex items-center overflow-hidden rounded-full border px-3 py-1 text-xs font-mono font-medium uppercase tracking-wider backdrop-blur-md ${variantStyles[variant]} ${className}`}
    >
      <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-20deg)] animate-shimmer">
        <div className="h-full w-8 bg-white/10" />
      </div>
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </div>
  );
}
