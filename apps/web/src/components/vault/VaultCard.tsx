import React from 'react';
import { Clock, Fingerprint, Pause, Play, FileText, ShieldAlert } from 'lucide-react';
import type { VaultSummary } from '../../lib/api';
import { SpotlightCard } from '../ui/SpotlightCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NumberTicker } from '../ui/NumberTicker';
import type { Tone } from '../ui/Badge';

type VaultState = VaultSummary['state'];

const STATE_META: Record<VaultState, { tone: Tone; dot?: boolean; pulse?: boolean }> = {
  ACTIVE: { tone: 'success', dot: true },
  REMINDER_WINDOW: { tone: 'warning', dot: true, pulse: true },
  PENDING: { tone: 'neutral', dot: true },
  CHALLENGE: { tone: 'danger', dot: true, pulse: true },
  RELEASED: { tone: 'violet', dot: true },
  PAUSED: { tone: 'neutral', dot: false },
  CANCELLED: { tone: 'neutral', dot: false }
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
    return 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.40)]';
  }
  if (daysRemaining > 7) {
    return 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.40)]';
  }
  return 'bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.50)]';
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
      className="p-5 space-y-4 border-slate-800 bg-slate-900/60 transition-all hover:border-slate-700 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-white text-base truncate">{vault.label}</h3>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">UUID: {vault.id.slice(0, 16)}...</p>
        </div>
        <Badge
          tone={stateMeta.tone}
          dot={stateMeta.dot ?? false}
          pulse={stateMeta.pulse ?? false}
          className="shrink-0"
        >
          {vault.state}
        </Badge>
      </div>

      {vault.state === 'CHALLENGE' ? (
        <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-200 space-y-1">
          <p className="font-semibold flex items-center gap-1.5 text-red-400">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            30-Day Heir Challenge Window Active
          </p>
          <p className="text-slate-300">
            An heir requested release. Cancel below with your passkey if you are alive.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Time to next check-in
            </span>
            <span className="font-bold text-slate-200">
              <NumberTicker value={daysRemaining} /> / {vault.checkinIntervalDays} days
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800/80 overflow-hidden p-0.5 border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressFill(daysRemaining)}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 pt-2 border-t border-white/5">
        <div>
          <span className="text-[10px] uppercase tracking-wider block text-slate-500">Grace Period</span>
          <span className="font-semibold text-slate-200">{vault.gracePeriodDays} days</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider block text-slate-500">Challenge Window</span>
          <span className="font-semibold text-slate-200">{vault.challengeWindowDays} days</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
          onClick={onCheckin}
          loading={busy}
          disabled={busy || vault.state === 'CANCELLED' || vault.state === 'RELEASED' || vault.state === 'CHALLENGE'}
        >
          {vault.state === 'CHALLENGE' ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5" /> Claim Active
            </>
          ) : (
            <>
              <Fingerprint className="w-3.5 h-3.5" /> Assert Liveness
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="font-mono text-xs text-slate-300 border-slate-700 hover:bg-slate-800"
          onClick={onTogglePause}
          disabled={busy || !['ACTIVE', 'REMINDER_WINDOW', 'PAUSED'].includes(vault.state)}
        >
          {vault.state === 'PAUSED' ? (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Resume
            </>
          ) : (
            <>
              <Pause className="w-3.5 h-3.5 text-slate-400" /> Pause
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="font-mono text-xs text-slate-400 hover:text-white"
          onClick={onViewChain}
          title="Inspect Merkle Audit Chain"
        >
          <FileText className="w-3.5 h-3.5" />
        </Button>
      </div>
    </SpotlightCard>
  );
}
