import React from 'react';
import {
  ShieldCheck,
  Landmark,
  AlertTriangle,
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
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  // Calculate days remaining (sample 89 days)
  const daysRemaining = active > 0 ? 89 : 0;
  const progressPercent = active > 0 ? Math.round((daysRemaining / 90) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg dark:shadow-2xl">
      <BorderBeam size={280} duration={16} colorFrom="#10B981" colorTo="#3B82F6" />
      <SpotlightCard
        spotlightColor="rgba(16, 185, 129, 0.12)"
        className="p-6 sm:p-7 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl relative"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Greeting, Status & CTAs (7 cols) */}
          <div className="md:col-span-7 space-y-5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <BadgeShimmer variant="emerald">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                PROTECTION RUNNING · PASSKEY ACTIVE
              </BadgeShimmer>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">
                {dateLabel}
              </span>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome back,{' '}
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 dark:from-blue-400 dark:via-sky-300 dark:to-emerald-400 bg-clip-text text-transparent">
                  {user.username}
                </span>
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
                Your dead-man's switch is actively monitored. Tap below to confirm you are alive and keep your estate timer live.
              </p>
            </div>

            {/* Quick Action Button Bar */}
            <div className="flex items-center gap-2.5 flex-wrap pt-1">
              <Button
                variant="primary"
                size="md"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-md shadow-blue-500/20 gap-2"
                onClick={onOpenCreateVault}
              >
                <Plus className="w-4 h-4" /> + Protect Vault
              </Button>

              {active > 0 && onQuickCheckin && (
                <Button
                  variant="primary"
                  size="md"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-md shadow-emerald-500/20 gap-2 animate-pulse"
                  onClick={onQuickCheckin}
                >
                  <HeartPulse className="w-4 h-4" /> I Am Alive — Check In
                </Button>
              )}

              <Button
                variant="secondary"
                size="md"
                className="border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-xs sm:text-sm"
                onClick={onOpenWalletModal}
              >
                <Wallet className="w-4 h-4 text-blue-500" /> Link Wallet
              </Button>

              {vaults.length === 0 && (
                <Button
                  variant="secondary"
                  size="md"
                  className="border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 font-medium text-xs sm:text-sm"
                  onClick={onQuickDemoVault}
                >
                  <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Quickstart Demo (1-Click)
                </Button>
              )}
            </div>

            {/* Micro KPIs */}
            <div className="flex items-center gap-5 pt-3 border-t border-slate-200 dark:border-white/10 text-xs">
              <div className="flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Vaults:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{vaults.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-500 dark:text-slate-400">Liveness:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{active} Active</span>
              </div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className={`w-4 h-4 ${challenged > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                <span className="text-slate-500 dark:text-slate-400">Claims:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{challenged}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Liveness Dial Gauge (5 cols) */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/60 dark:from-slate-950/80 dark:to-slate-900/40 border border-slate-200 dark:border-slate-800 shadow-inner">
            <div className="relative flex items-center justify-center">
              {/* Radial Progress Ring */}
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-slate-800 stroke-current"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-emerald-500 stroke-current transition-all duration-1000 ease-out"
                  fill="transparent"
                />
              </svg>

              {/* Dial Center Text */}
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  <NumberTicker value={daysRemaining} />
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">d</span>
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Remaining
                </span>
              </div>
            </div>

            <div className="mt-3 text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Heartbeat Nominal
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Next check-in due in 89 days
              </p>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
