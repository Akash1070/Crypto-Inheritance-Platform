import React, { useState } from 'react';
import {
  ShieldCheck,
  Fingerprint,
  AlertTriangle,
  HeartHandshake,
  Clock,
  KeyRound,
  CheckCircle2
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
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        className={[
          'w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:bg-white dark:focus:bg-blue-950/20',
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
  const [deviceName, setDeviceName] = useState('My iPhone / Mac');
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
          {/* Left Column: Plain-English Pitch & Benefits Bento (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-4">
              <BadgeShimmer variant="emerald">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Open Source Protocol · Non-Custodial · Zero Passwords
              </BadgeShimmer>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
                Protect Your Crypto Estate{' '}
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                  For Those You Love
                </span>
              </h1>

              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                A simple, non-custodial safety net for Bitcoin, Ethereum, and digital assets. If you ever
                become incapacitated or pass away, your designated family members receive access automatically —
                without trusting any central middleman.
              </p>
            </div>

            {/* Bento Highlights Grid - Plain English */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.12)"
                className="p-5 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    You Keep 100% Control
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  We never hold your seed phrases or private keys. Your master keys stay safely in your hands at all times.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(16, 185, 129, 0.12)"
                className="p-5 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    Biometric Passkeys
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Sign in with Touch ID, Face ID, or Windows Hello. No passwords to remember, lose, or get phished.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(168, 85, 247, 0.12)"
                className="p-5 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    Effortless Check-Ins
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Every 3 to 12 months, simply tap "I'm Alive" on your phone to reset the countdown. Takes 2 seconds.
                </p>
              </SpotlightCard>

              <SpotlightCard
                spotlightColor="rgba(245, 158, 11, 0.12)"
                className="p-5 border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/60 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                    Guaranteed Family Handover
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  If you stop checking in, your chosen heirs receive step-by-step instructions to safely unlock the inheritance.
                </p>
              </SpotlightCard>
            </div>

            {/* Simple Numbers Bar */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/60 backdrop-blur-md grid grid-cols-3 gap-4 text-center shadow-sm">
              <div>
                <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  <NumberTicker value={100} />%
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Non-Custodial
                </p>
              </div>
              <div className="border-x border-slate-200 dark:border-white/10">
                <p className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  <NumberTicker value={30} />d
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Grace Period Window
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  <NumberTicker value={0} />
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Secrets Stored On Server
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Passkey Authentication Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <BorderBeam size={250} duration={14} colorFrom="#3B82F6" colorTo="#10B981" />
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.15)"
                className="p-6 sm:p-8 bg-white/95 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-2xl relative"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Biometric Sign-In
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Fast, passwordless hardware authentication
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${
                      mode === 'signin'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${
                      mode === 'register'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    CREATE ACCOUNT
                  </button>
                </div>

                {error && (
                  <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/50 px-3.5 py-3 text-xs text-red-700 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {mode === 'signin' ? (
                  <div className="space-y-5">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Tap your Touch ID, Face ID, Windows Hello, or hardware key. Your device signs you in securely.
                    </p>

                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 shadow-lg shadow-blue-500/20"
                      onClick={handleLogin}
                      loading={submittingLogin}
                    >
                      <Fingerprint className="w-5 h-5" /> Sign In with Passkey
                    </Button>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        New here?{' '}
                        <button
                          type="button"
                          onClick={() => setMode('register')}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                        >
                          Create an account in 30 seconds
                        </button>
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <Field
                      label="Your Name or Alias"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. Alex"
                      required
                    />

                    <Field
                      label="Email for Check-In Reminders"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@example.com"
                      required
                    />

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Your Device Authenticator
                      </label>
                      <select
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="Touch ID / Face ID">Apple Touch ID / Face ID</option>
                        <option value="Windows Hello">Windows Hello Fingerprint / PIN</option>
                        <option value="YubiKey 5C NFC">YubiKey / Security Key</option>
                        <option value="Android Biometrics">Android Biometrics</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-300 space-y-1">
                      <p className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Zero Passwords Needed
                      </p>
                      <p className="text-slate-600 dark:text-slate-400">
                        Your biometric passkey stays locked inside your hardware. We never receive or store your fingerprint or face data.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3.5 shadow-lg shadow-emerald-500/20"
                      loading={submittingRegister}
                    >
                      <Fingerprint className="w-5 h-5" /> Create My Passkey & Enter
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
