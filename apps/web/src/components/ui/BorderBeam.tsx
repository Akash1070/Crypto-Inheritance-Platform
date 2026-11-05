import React from 'react';

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

export function BorderBeam({
  size = 200,
  duration = 10,
  delay = 0,
  colorFrom = '#10B981',
  colorTo = '#3B82F6',
  className = ''
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--delay': delay,
          '--color-from': colorFrom,
          '--color-to': colorTo
        } as React.CSSProperties
      }
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] ${className}`}
    >
      <div
        className="absolute aspect-square w-[calc(var(--size)*1px)] animate-border-beam [animation-delay:calc(var(--delay)*1s)] [background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] [offset-anchor:calc(var(--size)*0.5px)_50%] [offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]"
      />
    </div>
  );
}
