import React from 'react';
import { AlertTriangle, Fingerprint } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface CancelClaimModalProps {
  open: boolean;
  vaultLabel: string;
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  busy: boolean;
}

export function CancelClaimModal({
  open,
  vaultLabel,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  busy
}: CancelClaimModalProps) {
  if (!open) return null;

  return (
    <Modal
      title="Confirm liveness & cancel claim"
      icon={<AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-300" />}
      accent="danger"
      onClose={onClose}
      className="max-w-lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>
            Abort
          </Button>
          <Button variant="danger" size="md" onClick={onConfirm} loading={busy}>
            <Fingerprint className="w-4 h-4" /> Assert Liveness & Cancel Claim
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-sub leading-relaxed">
          This will immediately abort the heir's release request for{' '}
          <strong className="text-ink">{vaultLabel}</strong> and restore the vault to{' '}
          <strong className="text-primary">ACTIVE</strong> status. A WebAuthn biometric
          passkey step-up assertion is required.
        </p>
        <div>
          <label className="block text-xs font-semibold text-faint uppercase tracking-wider mb-2">
            Cancellation reason / statement
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. I am alive and well"
            className="w-full bg-line/[0.03] border border-line/[0.10] rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-faint focus:border-red-400/50 focus:bg-red-400/[0.04] focus:outline-none focus:ring-2 focus:ring-red-400/20 transition"
          />
        </div>
      </div>
    </Modal>
  );
}
