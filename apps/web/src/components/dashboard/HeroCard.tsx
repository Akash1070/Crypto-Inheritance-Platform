import React from 'react';
import {
  ShieldCheck,
  Landmark,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Wallet,
  Zap,
  HeartPulse
} from 'lucide-react';
import type { VaultSummary } from '../../lib/api';
import type { UserProfile } from '../../lib/auth';
import { SpotlightCard } from '../ui/SpotlightCard';
import { BorderBeam } from '../ui/BorderBeam';
import { BadgeShimmer } from '../ui/BadgeShimmer';
import { NumberTicker } from '../ui/NumberTicker';
import { Button } from '../ui/Button';

interface HeroCardProps {
  user: UserProfile;
  vaults: VaultSummary[];
  onOpenCreateVault: () => void;
  onOpenWalletModal: () => void;
  onQuickDemoVault: () => void;
  onQuickCheckin?: () => void;
}

export function HeroCard({
  user,
  vaults,
  onOpenCreateVault,
  onOpenWalletModal,
  onQuickDemoVault,
  onQuickCheckin
}: HeroCardProps) {
  const active = vaults.filter((v) => v.state === 'ACTIVE').length;
  const challenged = vaults.filter((v) => v.state === 'CHALLENGE').length;
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const summary = [
    { icon: Landmark, label: 'Protected Vaults', value: vaults.length, tone: 'text-slate-900 dark:text-white' },
    { icon: ShieldCheck, label: 'Active Liveness', value: active, tone: 'text-emerald-600 dark:text-emerald-400' },
    {
      icon: AlertTriangle,
      label: 'Emergency Claims',
      value: challenged,
      tone: challenged > 0 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'
    }
  ];

  const simpleSteps = [
    'You keep 100% control — we never see your passwords or private seeds',
    'Periodic check-ins: A simple tap every few months confirms you are okay',
    '30-day safety buffer: Even if an heir files a claim, you have 30 days to cancel'
  ];

  return (
    <div className="relative rounded-2xl overflow-hidden">
      <BorderBeam size={280} duration={16} colorFrom="#10B981" colorTo="#3B82F6" />
      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.12)"
        className="p-6 sm:p-7 flex flex-col justify-between gap-6 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-md dark:shadow-2xl relative"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <BadgeShimmer variant="emerald">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PROTECTION SYSTEM ACTIVE · BIOMETRIC SECURED
          </BadgeShimmer>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{dateLabel}</span>
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 dark:from-blue-400 dark:via-sky-300 dark:to-emerald-400 bg-clip-text text-transparent">
              {user.username}
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            Your crypto inheritance safety switch is running. If you ever stop checking in, your
            designated family members will be guided on how to claim your estate.
          </p>
        </div>

        {/* Big, Clear Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap pt-1">
          <Button
            variant="primary"
            size="md"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-lg shadow-blue-500/20 gap-2"
            onClick={onOpenCreateVault}
          >
            <Plus className="w-4 h-4" /> + Protect a New Vault
          </Button>

          {active > 0 && onQuickCheckin && (
            <Button
              variant="primary"
              size="md"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-lg shadow-emerald-500/20 gap-2"
              onClick={onQuickCheckin}
            >
              <HeartPulse className="w-4 h-4" /> I Am Alive — Check In Now
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm"
            onClick={onOpenWalletModal}
          >
            <Wallet className="w-4 h-4 text-blue-500" /> Link Wallet / View Assets
          </Button>

          {vaults.length === 0 && (
            <Button
              variant="secondary"
              size="md"
              className="border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium text-xs sm:text-sm"
              onClick={onQuickDemoVault}
            >
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Quickstart Sample Vault (1-Click)
            </Button>
          )}
        </div>

        {/* Status Metrics & Simple Guarantees */}
        <div className="flex flex-col sm:flex-row gap-5 sm:items-end sm:justify-between pt-4 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-6">
            {summary.map((item, index) => (
              <React.Fragment key={item.label}>
                {index > 0 && <span className="w-px h-8 bg-slate-200 dark:bg-slate-800" />}
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
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
            {simpleSteps.map((step) => (
              <div key={step} className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
