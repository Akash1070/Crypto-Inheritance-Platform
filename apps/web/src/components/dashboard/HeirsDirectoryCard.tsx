import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  Plus,
  CheckCircle2
} from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { Button } from '../ui/Button';

export interface HeirItem {
  id: string;
  name: string;
  relationship: string;
  allocationPercent: number;
  emailMasked: string;
  pubkeyPreview: string;
  status: 'active' | 'pending_key';
  deliveryMode: string;
}

export const DEFAULT_DEMO_HEIRS: HeirItem[] = [
  {
    id: 'heir-1',
    name: 'Sarah Vance',
    relationship: 'Spouse & Primary Beneficiary',
    allocationPercent: 70,
    emailMasked: 's****@estate.vault',
    pubkeyPreview: 'x25519:7a4f...91c2',
    status: 'active',
    deliveryMode: 'Physical Emergency Kit Delivered'
  },
  {
    id: 'heir-2',
    name: 'David Vance',
    relationship: 'Son & Secondary Trustee',
    allocationPercent: 30,
    emailMasked: 'd****@estate.vault',
    pubkeyPreview: 'x25519:3e8b...44fa',
    status: 'active',
    deliveryMode: 'Hardware FIDO2 Enrolled'
  }
];

interface HeirsDirectoryCardProps {
  onAddHeirClick: () => void;
}

export function HeirsDirectoryCard({ onAddHeirClick }: HeirsDirectoryCardProps) {
  const [heirs] = useState<HeirItem[]>(DEFAULT_DEMO_HEIRS);

  return (
    <SpotlightCard
      spotlightColor="rgba(168, 85, 247, 0.12)"
      className="p-6 border-slate-800 bg-slate-900/80 shadow-2xl relative space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Designated Beneficiaries & Heirs
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border bg-purple-500/10 text-purple-300 border-purple-500/20">
              {heirs.length} BENEFICIARIES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Authorized recipients entitled to claim cryptographic threshold shares after challenge expiry.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          className="bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs shadow-md shadow-purple-500/20 shrink-0"
          onClick={onAddHeirClick}
        >
          <Plus className="w-3.5 h-3.5" /> Add Beneficiary
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {heirs.map((heir) => (
          <div
            key={heir.id}
            className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700/80 transition space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold font-mono text-sm">
                  {heir.name.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{heir.name}</p>
                  <p className="text-[11px] text-slate-400">{heir.relationship}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  {heir.allocationPercent}% SHARE
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5 truncate">
                <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{heir.emailMasked}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate text-emerald-400">
                <KeyRound className="w-3 h-3 shrink-0" />
                <span className="truncate">{heir.pubkeyPreview}</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{heir.deliveryMode}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>ADR-0003: Step-up biometric passkey authentication required to modify allocations.</span>
        </span>
        <span className="font-mono text-[11px] text-slate-500">100% TOTAL ALLOCATED</span>
      </div>
    </SpotlightCard>
  );
}
