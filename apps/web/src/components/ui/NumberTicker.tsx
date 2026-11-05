import React, { useEffect, useState } from 'react';

interface NumberTickerProps {
  value: number;
  direction?: 'up' | 'down';
  className?: string;
  delay?: number;
  decimalPlaces?: number;
}

export function NumberTicker({
  value,
  direction = 'up',
  className = '',
  delay = 0,
  decimalPlaces = 0
}: NumberTickerProps) {
  const [current, setCurrent] = useState(direction === 'down' ? value : 0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;
    const duration = 1500;

    const timeout = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        // easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        if (direction === 'up') {
          setCurrent(Number((easeProgress * value).toFixed(decimalPlaces)));
        } else {
          setCurrent(Number(((1 - easeProgress) * value).toFixed(decimalPlaces)));
        }

        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        }
      };

      animationFrame = requestAnimationFrame(step);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animationFrame);
    };
  }, [value, direction, delay, decimalPlaces]);

  return <span className={`font-mono tabular-nums ${className}`}>{current}</span>;
}
