import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

const styles: Record<ToastKind, { ring: string; icon: React.ReactNode }> = {
  success: {
    ring: 'border-emerald-400/30',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-300 shrink-0" />
  },
  error: {
    ring: 'border-red-400/30',
    icon: <XCircle className="w-5 h-5 text-red-500 dark:text-red-300 shrink-0" />
  },
  info: {
    ring: 'border-primary/30',
    icon: <Info className="w-5 h-5 text-primary shrink-0" />
  }
};

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'glass-strong flex items-center gap-3 rounded-2xl px-4 py-3 animate-fade-up',
            styles[toast.kind].ring
          ].join(' ')}
        >
          {styles[toast.kind].icon}
          <p className="text-sm text-ink flex-1 leading-snug">{toast.text}</p>
          <button
            onClick={() => onDismiss(toast.id)}
            className="text-faint hover:text-ink transition shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
