import React, { useState } from 'react';
import {
  ShieldCheck,
  Fingerprint,
  Lock,
  AlertTriangle,
  HardDrive,
  Clock,
  KeyRound
} from 'lucide-react';
import { SpotlightCard } from '../ui/SpotlightCard';
import { BorderBeam } from '../ui/BorderBeam';
import { BadgeShimmer } from '../ui/BadgeShimmer';
import { NumberTicker } from '../ui/NumberTicker';
import { LiveActivityMarquee } from '../ui/LiveActivityMarquee';
import { Button } from '../ui/Button';

interface AuthScreenProps {
  error: string | null;
  onLogin: () => Promise<void>;
  onRegister: (username: string, email: string, deviceName: string) => Promise<void>;
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

function Field({ label, className = '', ...props }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        className={[
          'w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100',
          'placeholder:text-slate-500 focus:border-blue-500 focus:bg-blue-950/20',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition font-sans',
          className
        ].join(' ')}
        {...props}
      />
    </div>
  );
}

export function AuthScreen({ error, onLogin, onRegister }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [deviceName, setDeviceName] = useState('My YubiKey 5C NFC');
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [submittingRegister, setSubmittingRegister] = useState(false);

  async function handleLogin() {
    setSubmittingLogin(true);
    try {
      await onLogin();
    } finally {
      setSubmittingLogin(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingRegister(true);
    try {
      await onRegister(username.trim(), email.trim(), deviceName.trim());
    } finally {
      setSubmittingRegister(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col justify-between w-full">
      {/* Live Activity Ticker */}
      <LiveActivityMarquee />

      {/* Main Bento Hero */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Protocol Pitch & Architecture Bento (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <BadgeShimmer variant="emerald">
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Knowledge Protocol · FIDO2 Passkeys Only · Lazarus APT Resilient
              </BadgeShimmer>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.12]">
                Autonomous Crypto Inheritance{' '}
                <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
                  Without Custodial Risk
                </span>
              </h1>

              <p className="text-base text-slate-300 leading-relaxed max-w-2xl">
                Protect generational Bitcoin, private keys, and estate instructions against sudden death
                or incapacitation. Mathematical guarantees enforced by{' '}
                <strong className="text-white">Verifiable Shamir Secret Sharing</strong>,{' '}
                <strong className="text-white">FIDO2 WebAuthn Passkeys</strong>, and{' '}
                <strong className="text-white">Isolated Nitro Enclaves</strong>.
              </p>
            </div>

            {/* Bento Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.15)"
                className="p-5 border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Two-Tier Air-Gap</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Plaintext seeds and master keys are split cold on an air-gapped machine using the audited{' '}
                  <code className="text-emerald-400 font-mono">cip</code> CLI. Zero raw secrets touch this web app.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.15)"
                className="p-5 border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">FIDO2 Passkeys Only</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Phishing-resistant WebAuthn resident keys with mandatory biometric assertions. No passwords, SMS OTPs, or magic links.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.15)"
                className="p-5 border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Multi-Clock Enclave</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Escrow share S is decrypted strictly by an isolated enclave comparing hardware RTC with multi-source signed Roughtime beacons.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(245, 158, 11, 0.15)"
                className="p-5 border-slate-800 bg-slate-900/50"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Immutable Event Chain</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Append-only Ed25519 Merkle audit chain tracks all liveness check-ins, notifications, and challenge windows cryptographically.
                </p>
              </SpotlightCard>
            </div>

            {/* Space Mono Numbers Bar */}
            <div className="p-4 rounded-xl border border-white/5 bg-slate-950/60 backdrop-blur-md grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold font-mono text-emerald-400">
                  <NumberTicker value={100} />%
                </p>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                  KAT Test Coverage
                </p>
              </div>
              <div className="border-x border-white/5">
                <p className="text-2xl font-bold font-mono text-blue-400">
                  <NumberTicker value={30} />d
                </p>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                  Challenge Window
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-purple-400">
                  <NumberTicker value={0} />
                </p>
                <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mt-0.5">
                  Plaintext Secrets Stored
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Passkey Authentication Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden">
              <BorderBeam size={250} duration={14} colorFrom="#3B82F6" colorTo="#10B981" />
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.20)"
                className="p-6 sm:p-8 bg-slate-900/90 border-slate-800 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Biometric Gateway</h2>
                    <p className="text-xs text-slate-400 mt-0.5">FIDO2 Hardware Authentication</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-lg">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950/80 border border-slate-800 p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`py-2 rounded-lg text-xs font-mono font-medium transition ${
                      mode === 'signin'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`py-2 rounded-lg text-xs font-mono font-medium transition ${
                      mode === 'register'
                        ? 'bg-slate-800 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    CREATE ACCOUNT
                  </button>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/50 px-3.5 py-3 text-xs text-red-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {mode === 'signin' ? (
                  <div className="space-y-5">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Tap your registered hardware security key, Touch ID, Face ID, or Windows Hello. The authenticator verifies your identity via cryptographic signature.
                    </p>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 shadow-lg shadow-blue-500/20"
                      onClick={handleLogin}
                      loading={submittingLogin}
                    >
                      <Fingerprint className="w-5 h-5" /> Assert Passkey to Enter
                    </Button>

                    <div className="pt-2 border-t border-slate-800/80 text-center">
                      <p className="text-[11px] text-slate-500 font-mono">
                        No passkey yet?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('register')}
                          className="text-blue-400 hover:underline font-semibold"
                        >
                          Enroll Hardware Authenticator
                        </button>
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Field
                      label="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. satoshi_cold"
                      required
                    />

                    <Field
                      label="Encrypted Notification Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alerts@estate.vault"
                      required
                    />

                    <div>
                      <label className="block text-xs font-mono font-medium text-slate-300 uppercase tracking-wider mb-1.5">
                        Hardware Security Key Type
                      </label>
                      <select
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="YubiKey 5C NFC">YubiKey 5C NFC / 5Ci</option>
                        <option value="Touch ID / Face ID">Apple Touch ID / Face ID</option>
                        <option value="Windows Hello">Windows Hello TPM</option>
                        <option value="Ledger / Trezor FIDO2">Hardware Wallet FIDO2</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-800/40 text-[11px] text-blue-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Two-Passkey Safety Policy
                      </p>
                      <p className="text-slate-400">
                        Upon registration, you will be prompted to enroll a secondary backup passkey and receive an offline 24-word emergency recovery kit.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 shadow-lg shadow-emerald-500/20"
                      loading={submittingRegister}
                    >
                      <Fingerprint className="w-5 h-5" /> Register Hardware Passkey
                    </Button>
                  </form>
                )}
              </SpotlightCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
