import React from 'react';
import { Landmark, ShieldCheck, AlertTriangle, PauseCircle } from 'lucide-react';
import type { VaultSummary } from '../../lib/api';
import { SpotlightCard } from '../ui/SpotlightCard';
import { NumberTicker } from '../ui/NumberTicker';

interface MetricsBarProps {
  vaults: VaultSummary[];
}

export function MetricsBar({ vaults }: MetricsBarProps) {
  const active = vaults.filter((v) => v.state === 'ACTIVE').length;
  const challenged = vaults.filter((v) => v.state === 'CHALLENGE').length;
  const paused = vaults.filter((v) => v.state === 'PAUSED').length;
  const other = vaults.length - active - challenged - paused;

  const metrics = [
    {
      label: 'TOTAL VAULTS',
      value: vaults.length,
      icon: Landmark,
      color: 'blue',
      glow: 'rgba(59, 130, 246, 0.15)',
      textColor: 'text-blue-400'
    },
    {
      label: 'ACTIVE LIVENESS',
      value: active,
      icon: ShieldCheck,
      color: 'emerald',
      glow: 'rgba(16, 185, 129, 0.15)',
      textColor: 'text-emerald-400'
    },
    {
      label: 'UNDER CHALLENGE',
      value: challenged,
      icon: AlertTriangle,
      color: 'red',
      glow: challenged > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(148, 163, 184, 0.10)',
      textColor: challenged > 0 ? 'text-red-400' : 'text-slate-400'
    },
    {
      label: 'PAUSED / STANDBY',
      value: paused + other,
      icon: PauseCircle,
      color: 'purple',
      glow: 'rgba(168, 85, 247, 0.12)',
      textColor: 'text-purple-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <SpotlightCard
            key={m.label}
            spotlightColor={m.glow}
            className="p-5 border-slate-800 bg-slate-900/60"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                {m.label}
              </span>
              <Icon className={`w-4 h-4 ${m.textColor}`} />
            </div>
            <p className={`text-3xl font-bold font-mono tracking-tight ${m.textColor}`}>
              <NumberTicker value={m.value} />
            </p>
          </SpotlightCard>
        );
      })}
    </div>
  );
}
