import React from 'react';
import { Shield } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Badge } from '../ui/Badge';

export function SecurityCallout() {
  return (
    <GlassCard tone="subtle" edgeHighlight className="p-5 sm:p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">Two-Tier Secret Separation</p>
          <div className="mt-0.5">
            <Badge tone="primary" dot>
              ADR-0001
            </Badge>
          </div>
        </div>
      </div>

      <p className="text-xs text-sub leading-relaxed">
        This platform strictly coordinates planning, WebAuthn liveness assertion, and alert
        schedules. It <strong className="text-ink">never</strong> asks for, receives, processes,
        or stores unencrypted seed phrases or private keys. All master key generation and
        threshold splitting happen cold and air-gapped via the offline{' '}
        <code className="text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-mono text-[11px]">
          cip
        </code>{' '}
        CLI.
      </p>

      <div className="pt-3 border-t border-line/[0.08] space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-faint">Key custody</span>
          <span className="text-ink font-medium">You only. Cold & air-gapped.</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-faint">Authentication</span>
          <span className="text-ink font-medium">FIDO2 resident passkeys</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-faint">Ledger</span>
          <span className="text-ink font-medium">Signed Merkle event chain</span>
        </div>
      </div>
    </GlassCard>
  );
}
