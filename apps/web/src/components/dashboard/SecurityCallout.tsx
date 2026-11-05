import React from 'react';
import { ShieldCheck, CheckCircle2, Lock, HeartHandshake } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';

export function SecurityCallout() {
  return (
    <GlassCard tone="subtle" edgeHighlight className="p-5 sm:p-6 flex flex-col justify-between h-full gap-4">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">How Your Crypto Stays Safe</p>
            <div className="mt-0.5">
              <Badge tone="success" dot={false} pulse={false}>
                Non-Custodial Protection
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          This system <strong className="text-slate-900 dark:text-white">never holds your coins or sees your secret recovery phrase</strong>. Your crypto remains in your own personal wallets. We only monitor your liveness check-in and deliver instructions to your heirs if you ever stop responding.
        </p>
      </div>

      <div className="pt-3 border-t border-slate-200 dark:border-white/10 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-500" /> Key Ownership
          </span>
          <span className="text-slate-900 dark:text-white font-semibold">100% You (Self-Custody)</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Server Access
          </span>
          <span className="text-slate-900 dark:text-white font-semibold">Zero access to funds</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5 text-purple-500" /> Beneficiary Delivery
          </span>
          <span className="text-slate-900 dark:text-white font-semibold">Automatic via grace period</span>
        </div>
      </div>
    </GlassCard>
  );
}
