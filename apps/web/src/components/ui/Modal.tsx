import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type Accent = 'primary' | 'danger' | 'default';

interface ModalProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  accent?: Accent;
  className?: string;
}

const accents: Record<Accent, string> = {
  primary: 'border-primary/25',
  danger: 'border-red-400/30',
  default: 'border-line/[0.08]'
};

export function Modal({
  title,
  icon,
  onClose,
  children,
  footer,
  accent = 'default',
  className = ''
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={[
          'glass-strong edge-highlight relative w-full rounded-3xl p-6 animate-fade-up max-h-[88vh] flex flex-col',
          accents[accent],
          className
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-line/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            {icon && <span className="shrink-0">{icon}</span>}
            <h3 className="text-base font-bold tracking-tight text-ink truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-faint hover:text-ink hover:bg-line/[0.06] transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto flex-1 pr-1">{children}</div>
        {footer && (
          <div className="pt-5 mt-5 border-t border-line/[0.08] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
