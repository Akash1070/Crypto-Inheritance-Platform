import React from 'react';

export type Tone = 'primary' | 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'violet';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
}

const tones: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary border-primary/25',
  success: 'bg-emerald-400/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/25',
  danger: 'bg-red-400/10 text-red-700 dark:text-red-300 border-red-400/25',
  warning: 'bg-amber-400/10 text-amber-700 dark:text-amber-300 border-amber-400/25',
  neutral: 'bg-zinc-400/10 text-zinc-600 dark:text-zinc-300 border-zinc-400/25',
  info: 'bg-cyan-400/10 text-cyan-700 dark:text-cyan-300 border-cyan-400/25',
  violet: 'bg-violet-400/10 text-violet-700 dark:text-violet-300 border-violet-400/25'
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
        'inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-xs font-medium font-mono tracking-wide',
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
