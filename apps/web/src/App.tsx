import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, ShieldCheck, Lock, AlertTriangle } from 'lucide-react';
import {
  fetchCurrentUser,
  loginWithPasskey,
  registerPasskey
} from './lib/auth';
import type { UserProfile } from './lib/auth';
import {
  fetchVaults,
  checkinVault,
  pauseVault,
  resumeVault,
  fetchEventChain,
  verifyEventChain,
  cancelActiveClaim
} from './lib/api';
import type { VaultSummary, AuditEventItem, ChainVerificationResult } from './lib/api';
import { AppShell } from './components/layout/AppShell';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { AuthScreen } from './components/auth/AuthScreen';
import { HeroCard } from './components/dashboard/HeroCard';
import { SecurityCallout } from './components/dashboard/SecurityCallout';
import { MetricsBar } from './components/dashboard/MetricsBar';
import { VaultCard } from './components/vault/VaultCard';
import { AuditChainModal } from './components/vault/AuditChainModal';
import { CancelClaimModal } from './components/vault/CancelClaimModal';
import { ToastStack } from './components/ui/Toast';
import type { ToastKind, ToastMessage } from './components/ui/Toast';

type Theme = 'light' | 'dark';

interface AuditState {
  vaultId: string;
  loading: boolean;
  events: AuditEventItem[] | null;
  verification: ChainVerificationResult | null;
}

interface CancellingState {
  vaultId: string;
  label: string;
}

export function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('cip-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditState | null>(null);
  const [cancelling, setCancelling] = useState<CancellingState | null>(null);
  const [cancelReason, setCancelReason] = useState('I am alive and well');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('cip-theme', theme);
    } catch {
      // storage unavailable
    }
  }, [theme]);

  useEffect(() => {
    loadUserAndVaults();
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function pushToast(kind: ToastKind, text: string) {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, kind, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function loadUserAndVaults() {
    setLoading(true);
    try {
      const u = await fetchCurrentUser();
      setUser(u);
      if (u) {
        const v = await fetchVaults();
        setVaults(v);
      }
    } catch {
      // unauthenticated
    } finally {
      setLoading(false);
    }
  }

  async function loadVaults() {
    const v = await fetchVaults();
    setVaults(v);
  }

  async function handleRegister(username: string, email: string, deviceName: string) {
    setAuthError(null);
    try {
      await registerPasskey(username, email, deviceName);
      pushToast('success', 'Passkey registered. Your hardware authenticator is now bound.');
      await loadUserAndVaults();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Registration failed');
    }
  }

  async function handleLogin() {
    setAuthError(null);
    try {
      await loginWithPasskey();
      await loadUserAndVaults();
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  async function handleCheckin(vault: VaultSummary) {
    setBusyId(vault.id);
    try {
      await checkinVault(vault.id);
      pushToast('success', `Liveness asserted. Countdown reset for "${vault.label}".`);
      await loadVaults();
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Checkin failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePauseResume(vault: VaultSummary) {
    setBusyId(vault.id);
    try {
      if (vault.state === 'PAUSED') {
        await resumeVault(vault.id);
        pushToast('success', `Countdown resumed for "${vault.label}".`);
      } else {
        await pauseVault(vault.id);
        pushToast('success', `Countdown paused for "${vault.label}".`);
      }
      await loadVaults();
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function handleViewAuditChain(vault: VaultSummary) {
    setBusyId(vault.id);
    setAudit({ vaultId: vault.id, loading: true, events: null, verification: null });
    try {
      const [eventsRes, verification] = await Promise.all([
        fetchEventChain(vault.id),
        verifyEventChain(vault.id)
      ]);
      setAudit({ vaultId: vault.id, loading: false, events: eventsRes.events, verification });
    } catch (err: unknown) {
      setAudit(null);
      pushToast('error', err instanceof Error ? err.message : 'Failed to load audit chain');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancelClaim() {
    if (!cancelling) return;
    setBusyId(cancelling.vaultId);
    try {
      await cancelActiveClaim(cancelling.vaultId, cancelReason.trim() || 'I am alive and well');
      pushToast('success', `Claim cancelled. Vault "${cancelling.label}" restored to ACTIVE.`);
      setCancelling(null);
      await loadVaults();
    } catch (err: unknown) {
      pushToast('error', err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="relative w-fit">
              <div className="absolute -inset-5 rounded-full bg-primary/20 blur-2xl" />
              <ShieldCheck className="relative w-10 h-10 text-primary animate-pulse" />
            </div>
            <p className="text-sm text-sub flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading platform state...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const challengedVaults = vaults.filter((v) => v.state === 'CHALLENGE');

  return (
    <AppShell>
      <DashboardHeader user={user} theme={theme} onToggleTheme={toggleTheme} onLogin={handleLogin} />

      {!user ? (
        <div className="flex-1 w-full flex flex-col">
          <AuthScreen error={authError} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      ) : (
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-14 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <HeroCard user={user} vaults={vaults} />
            </div>
            <div className="md:col-span-1">
              <SecurityCallout />
            </div>
          </div>

          {challengedVaults.length > 0 && (
            <div className="glass-strong edge-highlight border-red-400/30 rounded-2xl p-5 shadow-glow-red flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-red-400/10 border border-red-400/30 flex items-center justify-center text-red-500 dark:text-red-300">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-wide text-ink">
                    RED ALERT: INHERITANCE CLAIM INITIATED
                  </h3>
                  <p className="text-xs text-red-700/80 dark:text-red-200/80 mt-0.5">
                    An authorized heir has initiated a release claim. The challenge window is
                    running. If you are alive, tap your passkey to cancel immediately.
                  </p>
                </div>
              </div>
              {challengedVaults.map((vault) => (
                <button
                  key={vault.id}
                  onClick={() => {
                    setCancelling({ vaultId: vault.id, label: vault.label });
                    setCancelReason('I am alive and well');
                  }}
                  disabled={busyId !== null}
                  className="px-5 py-2.5 bg-ink text-base font-bold text-sm rounded-xl hover:opacity-85 transition shadow-lg shrink-0 disabled:opacity-50 disabled:pointer-events-none"
                >
                  I AM ALIVE — CANCEL CLAIM
                </button>
              ))}
            </div>
          )}

          <MetricsBar vaults={vaults} />

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-ink">
                Coordinated Vaults
                <span className="ml-2 text-sm font-mono text-faint tabular-nums">
                  ({vaults.length})
                </span>
              </h2>
              <p className="text-xs text-faint">Every action requires your hardware passkey.</p>
            </div>

            {vaults.length === 0 ? (
              <div className="glass-subtle rounded-3xl py-16 px-6 text-center !border-dashed">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-line/[0.04] border border-line/[0.10] flex items-center justify-center text-faint mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-ink">No vaults connected to this account yet.</p>
                <p className="text-xs text-faint mt-1.5 max-w-md mx-auto leading-relaxed">
                  Initialize a cold vault on your air-gapped machine using{' '}
                  <code className="text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded font-mono">
                    cip init-vault
                  </code>{' '}
                  then upload its metadata here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {vaults.map((vault) => (
                  <VaultCard
                    key={vault.id}
                    vault={vault}
                    busy={busyId === vault.id}
                    onCheckin={() => handleCheckin(vault)}
                    onTogglePause={() => handlePauseResume(vault)}
                    onViewChain={() => handleViewAuditChain(vault)}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      )}

      <footer className="w-full border-t border-slate-800/80 bg-slate-950/40 backdrop-blur-md px-6 py-5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">CIP v0.1.0-PRODUCTION</span>
            <span className="text-slate-600">|</span>
            <span>ZERO-KNOWLEDGE VERIFIABLE RECONSTRUCTION</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#architecture" className="hover:text-blue-400 transition">ADR-0001 AIR-GAP</a>
            <span className="text-slate-700">·</span>
            <a href="#security" className="hover:text-blue-400 transition">SECURITY AUDIT</a>
            <span className="text-slate-700">·</span>
            <span className="text-emerald-400 font-semibold">$250,000 BUG BOUNTY</span>
          </div>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {user && (
        <>
          <AuditChainModal
            open={audit !== null}
            loading={audit?.loading ?? false}
            events={audit?.events ?? null}
            verification={audit?.verification ?? null}
            onClose={() => setAudit(null)}
          />
          <CancelClaimModal
            open={cancelling !== null}
            vaultLabel={cancelling?.label ?? ''}
            reason={cancelReason}
            onReasonChange={setCancelReason}
            onConfirm={confirmCancelClaim}
            onClose={() => setCancelling(null)}
            busy={busyId !== null && cancelling !== null}
          />
        </>
      )}
    </AppShell>
  );
}
