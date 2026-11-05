import React from 'react';
import { ShieldCheck, Lock, Clock, CheckCircle2, FileCheck2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';

export function SecurityCallout() {
  const securityTiles = [
    {
      icon: Lock,
      title: 'Key Custody',
      desc: 'You only (100% Cold)',
      tone: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20'
    },
    {
      icon: ShieldCheck,
      title: 'Zero Secrets',
      desc: 'Zero seed phrases stored',
      tone: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
    },
    {
      icon: Clock,
      title: 'Clock Defense',
      desc: 'Multi-source Roughtime',
      tone: 'text-purple-500 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20'
    },
    {
      icon: FileCheck2,
      title: 'Merkle Audit',
      desc: 'Signed Ed25519 chain',
      tone: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
    }
  ];

  return (
    <GlassCard tone="subtle" edgeHighlight className="p-5 sm:p-6 flex flex-col justify-between h-full gap-4 border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/85 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security Invariants</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Cryptographic Guarantees</p>
          </div>
        </div>
        <Badge tone="success" dot={false} pulse={false} className="font-mono text-[10px]">
          ACTIVE
        </Badge>
      </div>

      {/* Visual 4-Tile Security Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {securityTiles.map((tile) => (
          <div
            key={tile.title}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col gap-1.5 shadow-sm"
          >
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${tile.tone}`}>
              <tile.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{tile.title}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{tile.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Isolated Enclave
        </span>
        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">AWS Nitro / Confidential VM</span>
      </div>
    </GlassCard>
  );
}
