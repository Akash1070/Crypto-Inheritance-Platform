import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type Accent = 'primary' | 'danger' | 'default';

interface ModalProps {
  open?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  accent?: Accent;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

const accents: Record<Accent, string> = {
  primary: 'border-primary/25',
  danger: 'border-red-400/30',
  default: 'border-slate-800'
};

export function Modal({
  open = true,
  title,
  description,
  icon,
  onClose,
  children,
  footer,
  accent = 'default',
  size = 'md',
  className = ''
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          'relative w-full rounded-2xl p-6 sm:p-7 shadow-2xl animate-fade-up max-h-[90vh] flex flex-col',
          'bg-slate-900/95 border backdrop-blur-xl text-slate-100',
          sizeClasses[size],
          accents[accent],
          className
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              {icon && <span className="shrink-0">{icon}</span>}
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                {title}
              </h3>
            </div>
            {description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto flex-1 pr-1">{children}</div>
        {footer && (
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
