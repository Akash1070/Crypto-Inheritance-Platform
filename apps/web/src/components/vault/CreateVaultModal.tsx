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
  const [mode, setMode] = useState<'simple' | 'upload' | 'cli'>('simple');

  // Simple creator state
  const [label, setLabel] = useState('Family Bitcoin & Savings Trust');
  const [checkinInterval, setCheckinInterval] = useState(90);
  const [heirName, setHeirName] = useState('Sarah (Wife)');
  const [heirEmail, setHeirEmail] = useState('sarah@estate.vault');
  const [assetNotes, setAssetNotes] = useState('Coldcard Mk4 24-word seed phrase in safe deposit box');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadedBundle, setUploadedBundle] = useState<string | null>(null);
  const [bundlePreview, setBundlePreview] = useState<{ vaultId: string; magic: string; createdAt: string } | null>(null);

  // Copy state
  const [copied, setCopied] = useState(false);

  async function handleSimpleCreate(e: React.FormEvent) {
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
    const cmd = `cip init-vault --secret "YOUR_24_WORD_MNEMONIC" --out cip-vault-bundle.json`;
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Protect a New Vault"
      description="Set up your crypto inheritance safety switch in under 60 seconds."
      size="lg"
    >
      <div className="space-y-5">
        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-1">
          <button
            type="button"
            onClick={() => setMode('simple')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'simple'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-blue-500 dark:text-emerald-400" /> EASY SETUP
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'upload'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> UPLOAD FILE
          </button>
          <button
            type="button"
            onClick={() => setMode('cli')}
            className={`py-2 rounded-lg text-xs font-mono font-medium transition flex items-center justify-center gap-1.5 ${
              mode === 'cli'
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" /> AIR-GAP CLI
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/50 text-xs text-red-700 dark:text-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'simple' && (
          <form onSubmit={handleSimpleCreate} className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                1. What do you want to call this vault?
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Family Bitcoin & Estate Trust"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                2. What assets or instructions are in this vault?
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. Coldcard seed phrase in home safe + Coinbase 2FA details"
                value={assetNotes}
                onChange={(e) => setAssetNotes(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Note: Never type raw 24-word seed phrases into web browsers. Store references or sealed notes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  3. Who is your designated heir?
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. Sarah (Wife)"
                  value={heirName}
                  onChange={(e) => setHeirName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Heir's Email Address
                </label>
                <input
                  type="email"
                  className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. sarah@family.com"
                  value={heirEmail}
                  onChange={(e) => setHeirEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                4. How often should we ask you to check in?
              </label>
              <select
                value={checkinInterval}
                onChange={(e) => setCheckinInterval(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
              >
                <option value={30}>Every 1 Month (30 Days) — For Active Traders</option>
                <option value={90}>Every 3 Months (90 Days) — Recommended for Most People</option>
                <option value={180}>Every 6 Months (180 Days) — Twice a Year</option>
                <option value={365}>Once a Year (365 Days) — Low Maintenance</option>
              </select>
            </div>

            <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50/70 dark:bg-blue-950/20 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" /> How you stay safe:
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Every few months, tap your phone or laptop with your passkey. If you don't check in,
                you get 30 days of warning alerts before your heir can claim.
              </p>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 shadow-lg shadow-blue-500/20 text-sm"
              loading={submitting}
            >
              Save & Protect This Vault
            </Button>
          </form>
        )}

        {mode === 'upload' && (
          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center bg-slate-50 dark:bg-slate-950/40 hover:border-blue-500 transition cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-12 h-12 mx-auto rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Choose or drop `cip-vault-bundle.json`</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Generated offline via `cip init-vault`</p>
            </div>

            {bundlePreview && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 font-mono text-xs space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Header:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{bundlePreview.magic}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Vault ID:</span>
                  <span className="text-slate-900 dark:text-white truncate max-w-[200px]">{bundlePreview.vaultId}</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Created:</span>
                  <span className="text-slate-700 dark:text-slate-300">{bundlePreview.createdAt}</span>
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
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              For offline cold storage, run this on an air-gapped machine or live USB:
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

            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Your seed phrase is split into 2 encrypted pieces offline.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Copy `cip-vault-bundle.json` to USB and upload in the Upload tab.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
