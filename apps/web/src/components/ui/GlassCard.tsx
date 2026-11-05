import React from 'react';

type GlassTone = 'default' | 'subtle' | 'strong';

type GlassGlow = 'none' | 'emerald' | 'red' | 'amber';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: GlassTone;
  glow?: GlassGlow;
  edgeHighlight?: boolean;
}

const tones: Record<GlassTone, string> = {
  default: 'glass',
  subtle: 'glass-subtle',
  strong: 'glass-strong'
};

const glows: Record<GlassGlow, string> = {
  none: '',
  emerald: 'shadow-glow-emerald',
  red: 'shadow-glow-red',
  amber: 'shadow-glow-amber'
};

export function GlassCard({
  tone = 'default',
  glow = 'none',
  edgeHighlight = false,
  className = '',
  ...props
}: GlassCardProps) {
  return (
    <div
      className={[
        'relative rounded-2xl',
        tones[tone],
        glows[glow],
        edgeHighlight ? 'edge-highlight' : '',
        className
      ].join(' ')}
      {...props}
    />
  );
}
