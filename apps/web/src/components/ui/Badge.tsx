import React from 'react';

export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'violet';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
}

const tones: Record<Tone, string> = {
  primary: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-primary/10 dark:text-primary dark:border-primary/25',
  success: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30',
  danger: 'bg-red-100 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-500/30',
  warning: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30',
  neutral: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-zinc-800/60 dark:text-zinc-300 dark:border-zinc-700',
  info: 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-500/30',
  violet: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30'
};

const dotColors: Record<Tone, string> = {
  primary: 'bg-primary',
  success: 'bg-emerald-400',
  danger: 'bg-red-400',
  warning: 'bg-amber-400',
  neutral: 'bg-zinc-400',
  info: 'bg-cyan-400',
  violet: 'bg-violet-400'
};

export function Badge({
  tone = 'neutral',
  dot = false,
  pulse = false,
  className = '',
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 border px-2.5 py-0.5 rounded-full text-[11px] font-sans font-bold tracking-wide shadow-xs',
        tones[tone],
        className
      ].join(' ')}
      {...props}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotColors[tone],
            pulse ? 'animate-pulse' : ''
          ].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
