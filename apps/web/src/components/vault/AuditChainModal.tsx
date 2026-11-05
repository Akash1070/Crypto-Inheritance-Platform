import React from 'react';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import type { AuditEventItem, ChainVerificationResult } from '../../lib/api';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface AuditChainModalProps {
  open: boolean;
  loading: boolean;
  events: AuditEventItem[] | null;
  verification: ChainVerificationResult | null;
  onClose: () => void;
}

function SkeletonRow() {
  return (
    <div className="p-3 rounded-lg space-y-2 animate-pulse">
      <div className="flex justify-between gap-4">
        <div className="h-3 w-24 rounded bg-line/[0.08]" />
        <div className="h-3 w-20 rounded bg-line/[0.05]" />
      </div>
      <div className="h-2.5 w-full rounded bg-line/[0.05]" />
      <div className="h-2.5 w-2/3 rounded bg-line/[0.05]" />
    </div>
  );
}

export function AuditChainModal({ open, loading, events, verification, onClose }: AuditChainModalProps) {
  if (!open) return null;

  const isValid = verification?.valid ?? false;
  const accent = loading ? 'default' : isValid ? 'primary' : 'danger';
  const iconTone = loading ? 'text-sub' : isValid ? 'text-primary' : 'text-red-500 dark:text-red-300';

  return (
    <Modal
      title="Merkle Event Chain Audit Trail"
      icon={<ShieldCheck className={`w-5 h-5 ${iconTone}`} />}
      accent={accent}
      onClose={onClose}
      className="max-w-3xl"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-subtle rounded-xl px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {isValid ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-300 shrink-0" />
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                    Cryptographic integrity verified
                  </span>
                  <Badge tone="success" className="hidden sm:inline-flex">
                    Ed25519 VALID
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500 dark:text-red-300 shrink-0" />
                  <span className="text-red-700 dark:text-red-300 font-semibold text-xs">
                    Verification alert: chain tampered or broken
                  </span>
                </>
              )}
            </div>
            <span className="text-faint font-mono text-[11px] shrink-0">
              {events?.length ?? 0} events
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {events?.map((evt) => (
              <div
                key={evt.id}
                className="p-3 bg-line/[0.03] border border-line/[0.07] rounded-lg space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-primary font-bold">#{evt.sequence} {evt.type}</span>
                  <span className="text-faint text-[10px] shrink-0">{evt.createdAt}</span>
                </div>
                <div className="text-sub text-[11px] flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">Payload hash</span>
                  <span className="text-ink truncate">{evt.payloadHash}</span>
                </div>
                <div className="text-faint text-[10px] flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">Prev hash</span>
                  <span className="truncate">{evt.prevHash}</span>
                </div>
                <div className="text-faint text-[10px] flex items-center gap-1.5 min-w-0">
                  <span className="shrink-0">Signature</span>
                  <span className="truncate">{evt.signature.slice(0, 40)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
