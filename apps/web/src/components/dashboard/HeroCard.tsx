import React from 'react';
import { ShieldCheck, Landmark, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { VaultSummary } from '../../lib/api';
import type { UserProfile } from '../../lib/auth';
import { SpotlightCard } from '../ui/SpotlightCard';
import { BorderBeam } from '../ui/BorderBeam';
import { BadgeShimmer } from '../ui/BadgeShimmer';
import { NumberTicker } from '../ui/NumberTicker';

interface HeroCardProps {
  user: UserProfile;
  vaults: VaultSummary[];
}

export function HeroCard({ user, vaults }: HeroCardProps) {
  const active = vaults.filter((v) => v.state === 'ACTIVE').length;
  const challenged = vaults.filter((v) => v.state === 'CHALLENGE').length;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const summary = [
    { icon: Landmark, label: 'Vaults', value: vaults.length, tone: 'text-white' },
    { icon: ShieldCheck, label: 'Active', value: active, tone: 'text-emerald-400' },
    {
      icon: AlertTriangle,
      label: 'Challenge',
      value: challenged,
      tone: challenged > 0 ? 'text-red-400' : 'text-slate-400'
    }
  ];

  const guarantees = [
    'Tier-1 passkey liveness (WebAuthn FIDO2)',
    'Non-custodial — secrets never touch this tier',
    'Signed Merkle event chain, ADR-0001 enforced'
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <BorderBeam size={280} duration={16} colorFrom="#10B981" colorTo="#3B82F6" />
      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.15)"
        className="p-6 sm:p-7 flex flex-col justify-between gap-6 border-slate-800 bg-slate-900/80 shadow-2xl relative"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <BadgeShimmer variant="emerald">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ALL SYSTEMS NOMINAL · PASSKEY ACTIVE
          </BadgeShimmer>
          <span className="text-xs font-mono text-slate-400">{dateLabel}</span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back,{' '}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              {user.username}
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-lg leading-relaxed">
            Your estate is coordinated, monitored, and protected. Assert liveness with your
            hardware security key to reset countdown timers and keep threshold shares locked.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 sm:items-end sm:justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-6">
            {summary.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <span className="w-px h-8 bg-slate-800" />}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <item.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
                      {item.label}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold font-mono tabular-nums leading-tight mt-0.5 ${item.tone}`}>
                    <NumberTicker value={item.value} />
                  </p>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="space-y-1.5">
            {guarantees.map((g) => (
              <div key={g} className="flex items-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{g}</span>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
