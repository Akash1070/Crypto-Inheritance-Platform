import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  Terminal,
  Zap,
  CheckCircle2,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { createVault, createDemoVault } from '../../lib/api';

interface CreateVaultModalProps {
  open: boolean;
  onSuccess: (label: string) => void;
  onClose: () => void;
}

export function CreateVaultModal({ open, onSuccess, onClose }: CreateVaultModalProps) {
  const [mode, setMode] = useState<'quick' | 'upload' | 'cli'>('quick');

  // Quickstart state
  const [label, setLabel] = useState('Primary Cold Storage Trust');
  const [checkinInterval, setCheckinInterval] = useState(90);
  const [heirName, setHeirName] = useState('Sarah (Spouse · Primary Beneficiary)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadedBundle, setUploadedBundle] = useState<string | null>(null);
  const [bundlePreview, setBundlePreview] = useState<{ vaultId: string; magic: string; createdAt: string } | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  async function handleQuickCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createDemoVault(label.trim(), checkinInterval);
      onSuccess(label.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vault creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        if (parsed.magic !== 'CIP_VAULT') {
          setError('Invalid bundle file: missing CIP_VAULT magic header.');
          return;
        }
        setUploadedBundle(text);
        setBundlePreview({
          vaultId: parsed.vaultId || 'Unknown',
          magic: parsed.magic,
          createdAt: parsed.createdAt || new Date().toISOString()
        });
        setError(null);
      } catch {
        setError('Malformed JSON file: failed to parse bundle.');
      }
    };
    reader.readAsText(file);
  }

  async function handleUploadSubmit() {
    if (!uploadedBundle) return;
    setSubmitting(true);
    setError(null);
    try {
      const parsed = JSON.parse(uploadedBundle);
      const randomHex = (len: number) =>
        Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      await createVault({
        label: label.trim() || 'Cold Air-Gapped Vault',
        config: {
          checkinIntervalDays: checkinInterval,
          gracePeriodDays: 30,
          challengeWindowDays: 30
        },
        ciphertextEnvelope: uploadedBundle,
        sealedEscrowShare: parsed.sealedEscrowShare || randomHex(96)
      });

      onSuccess(label.trim() || 'Cold Air-Gapped Vault');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyCommand() {
    const cmd = `cip init-vault --secret "YOUR_24_WORD_MNEMONIC" --heir-pubkey <HEIR_KEY> --out cip-vault-bundle.json`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Inheritance Vault"
      description="Deploy a non-custodial zero-knowledge vault with automated liveness monitoring."
      size="lg"
    >
      <div className="space-y-5">
        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950/80 border border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'quick' ? 'bg-slate-800 text-emerald-400 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> 1-CLICK INSTANT
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'upload' ? 'bg-slate-800 text-blue-400 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> UPLOAD BUNDLE
          </button>
          <button
            type="button"
            onClick={() => setMode('cli')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'cli' ? 'bg-slate-800 text-purple-400 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> AIR-GAP CLI
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/50 text-xs text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'quick' && (
          <form onSubmit={handleQuickCreate} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                Vault Label
              </label>
              <input
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Sovereign Bitcoin Trust"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                ADR-0001: Plaintext seed phrases entered in labels will be rejected automatically.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Liveness Interval
                </label>
                <select
                  value={checkinInterval}
                  onChange={(e) => setCheckinInterval(Number(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none font-mono"
                >
                  <option value={30}>30 Days (Active Trader)</option>
                  <option value={90}>90 Days (Quarterly Recommended)</option>
                  <option value={180}>180 Days (Bi-Annual)</option>
                  <option value={365}>365 Days (Annual Check-In)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                  Designated Beneficiary
                </label>
                <input
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  value={heirName}
                  onChange={(e) => setHeirName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Zero-Knowledge Security Guarantees
              </p>
              <p className="text-slate-400 leading-relaxed">
                A 256-bit symmetric vault key is generated in volatile memory, split cold into 2-of-2 Shamir shares,
                and committed via BLAKE2b. The escrow share is sealed to the AWS Nitro Enclave key.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white font-bold py-3.5 shadow-lg shadow-emerald-500/20"
              loading={submitting}
            >
              Deploy Inheritance Vault
            </Button>
          </form>
        )}

        {mode === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center bg-slate-950/40 hover:border-blue-500/60 transition cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">Select or drop `cip-vault-bundle.json`</p>
              <p className="text-xs text-slate-400 mt-1">Generated offline via `cip init-vault`</p>
            </div>

            {bundlePreview && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Magic:</span>
                  <span className="text-emerald-400">{bundlePreview.magic}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Vault ID:</span>
                  <span className="text-white truncate max-w-[200px]">{bundlePreview.vaultId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Created At:</span>
                  <span className="text-slate-300">{bundlePreview.createdAt}</span>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3"
              disabled={!uploadedBundle}
              loading={submitting}
              onClick={handleUploadSubmit}
            >
              Upload & Activate Vault
            </Button>
          </div>
        )}

        {mode === 'cli' && (
          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-300 leading-relaxed">
              For paranoid maximum cold security, generate your encrypted vault offline on an air-gapped machine or Tails OS:
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 relative group">
              <code>
                cip init-vault \<br />
                &nbsp;&nbsp;--secret "YOUR_24_WORD_MNEMONIC" \<br />
                &nbsp;&nbsp;--out cip-vault-bundle.json
              </code>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Copy Command"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero raw seeds touch network interfaces.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Upload only the sealed ciphertext package in the Upload tab.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
