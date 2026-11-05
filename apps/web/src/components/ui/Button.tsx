import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'outline';

type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white font-semibold shadow-glow-primary hover:brightness-110 active:scale-[0.98]',
  secondary:
    'bg-line/[0.04] text-ink border border-line/[0.12] hover:bg-line/[0.08] hover:border-line/[0.20] active:scale-[0.98] backdrop-blur',
  ghost: 'text-sub hover:text-ink hover:bg-line/[0.06] active:scale-[0.98]',
  danger: 'bg-gradient-to-b from-red-500 to-red-600 text-white font-semibold shadow-glow-red hover:brightness-110 active:scale-[0.98]',
  inverse: 'bg-ink text-base font-bold hover:opacity-85 active:scale-[0.98]',
  outline: 'border border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/60 active:scale-[0.98]'
};

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3 text-base rounded-xl gap-2.5'
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        className
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
