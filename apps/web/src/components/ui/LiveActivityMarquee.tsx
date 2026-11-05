import React from 'react';
import { ShieldCheck, Lock, Fingerprint, Clock, CheckCircle2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: string;
  vaultId: string;
  timestamp: string;
  icon: typeof ShieldCheck;
  tag: string;
}

const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    type: 'LIVENESS_CHECKIN_VERIFIED',
    vaultId: 'v-8f92..3a1c',
    timestamp: '2m ago',
    icon: Fingerprint,
    tag: 'WebAuthn PRF'
  },
  {
    id: '2',
    type: 'MERKLE_EVENT_CHAIN_SIGNED',
    vaultId: 'seq #14',
    timestamp: '5m ago',
    icon: ShieldCheck,
    tag: 'Ed25519 Anchor'
  },
  {
    id: '3',
    type: 'ENCLAVE_ROUGHTIME_SYNCED',
    vaultId: 'drift 12ms',
    timestamp: '8m ago',
    icon: Clock,
    tag: 'Cloudflare / Google'
  },
  {
    id: '4',
    type: 'THRESHOLD_SHARE_AUDITED',
    vaultId: '2-of-2 GF(256)',
    timestamp: '14m ago',
    icon: Lock,
    tag: 'BLAKE2b Tag OK'
  },
  {
    id: '5',
    type: 'AIR_GAP_BUNDLE_VERIFIED',
    vaultId: '100% hash match',
    timestamp: '18m ago',
    icon: CheckCircle2,
    tag: 'SHA-256 Provenance'
  }
];

export function LiveActivityMarquee() {
  return (
    <div className="relative w-full overflow-hidden border-y border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-950/40 py-2.5 backdrop-blur-md">
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-slate-100 dark:from-[#090D16] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-slate-100 dark:from-[#090D16] to-transparent" />

      <div className="flex w-max animate-marquee space-x-8 hover:[animation-play-state:paused]">
        {[...DEMO_ACTIVITIES, ...DEMO_ACTIVITIES].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.id}-${idx}`}
              className="flex items-center space-x-2.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 px-3 py-1 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Icon className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{item.type}</span>
              <span className="text-slate-400 dark:text-slate-500">·</span>
              <span className="text-slate-600 dark:text-slate-400">{item.vaultId}</span>
              <span className="rounded bg-emerald-50 dark:bg-white/5 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                {item.tag}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

