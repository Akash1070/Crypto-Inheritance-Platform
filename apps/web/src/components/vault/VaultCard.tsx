import React from 'react';
import { Clock, Pause, Play, FileText, HeartPulse } from 'lucide-react';
import type { VaultSummary } from '../../lib/api';
import { SpotlightCard } from '../ui/SpotlightCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NumberTicker } from '../ui/NumberTicker';
import type { Tone } from '../ui/Badge';

type VaultState = VaultSummary['state'];

const STATE_META: Record<VaultState, { label: string; tone: Tone; dot?: boolean; pulse?: boolean }> = {
  ACTIVE: { label: 'PROTECTED & ACTIVE', tone: 'success', dot: true },
  REMINDER_WINDOW: { label: 'CHECK-IN DUE SOON', tone: 'warning', dot: true, pulse: true },
  PENDING: { label: 'CHECK-IN MISSED', tone: 'neutral', dot: true },
  CHALLENGE: { label: 'EMERGENCY CLAIM RUNNING', tone: 'danger', dot: true, pulse: true },
  RELEASED: { label: 'RELEASED TO HEIR', tone: 'violet', dot: true },
  PAUSED: { label: 'PAUSED / OFF-GRID', tone: 'neutral', dot: false },
  CANCELLED: { label: 'CANCELLED', tone: 'neutral', dot: false }
};

interface VaultCardProps {
  vault: VaultSummary;
  busy: boolean;
  onCheckin: () => void;
  onTogglePause: () => void;
  onViewChain: () => void;
}

function progressFill(daysRemaining: number) {
  if (daysRemaining > 30) {
    return 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.30)]';
  }
  if (daysRemaining > 7) {
    return 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.30)]';
  }
  return 'bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.40)]';
}

export function VaultCard({ vault, busy, onCheckin, onTogglePause, onViewChain }: VaultCardProps) {
  const lastCheckin = new Date(vault.lastCheckinAt);
  const daysSinceCheckin = Math.floor(
    (Date.now() - lastCheckin.getTime()) / (24 * 3600 * 1000)
  );
  const daysRemaining = Math.max(0, vault.checkinIntervalDays - daysSinceCheckin);
  const percent = Math.min(100, Math.max(5, (daysRemaining / vault.checkinIntervalDays) * 100));
  const stateMeta = STATE_META[vault.state];

  return (
    <SpotlightCard
      spotlightColor="rgba(59, 130, 246, 0.12)"
      className="p-5 sm:p-6 space-y-4 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-md dark:shadow-2xl transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{vault.label}</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
            Vault ID: {vault.id.slice(0, 18)}...
          </p>
        </div>
        <Badge
          tone={stateMeta.tone}
          dot={stateMeta.dot ?? false}
          pulse={stateMeta.pulse ?? false}
          className="shrink-0"
        >
          {stateMeta.label}
        </Badge>
      </div>

      {/* Progress Bar & Days Remaining */}
      <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <Clock className="w-3.5 h-3.5 text-blue-500" /> Time Until Next Check-In
          </span>
          <span className="font-mono font-bold text-slate-900 dark:text-white">
            <span className="text-base text-blue-600 dark:text-blue-400">
              <NumberTicker value={daysRemaining} />
            </span>{' '}
            days left
          </span>
        </div>

        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 rounded-full ${progressFill(daysRemaining)}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
          <span>Cadence: Every {vault.checkinIntervalDays} days</span>
          <span>Buffer: {vault.challengeWindowDays}d grace window</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20"
          onClick={onCheckin}
          disabled={busy || vault.state === 'PAUSED'}
        >
          <HeartPulse className="w-3.5 h-3.5" /> Check In Now
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
          onClick={onTogglePause}
          disabled={busy || vault.state === 'CHALLENGE'}
        >
          {vault.state === 'PAUSED' ? (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-500" /> Resume
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-500" /> Pause
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
          onClick={onViewChain}
          disabled={busy}
        >
          <FileText className="w-3.5 h-3.5" /> Audit Trail
        </Button>
      </div>
    </SpotlightCard>
  );
}
