import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Zap
} from 'lucide-react';
import {
  fetchCurrentUser,
  loginWithPasskey,
  registerPasskey,
  logoutUser
} from './lib/auth';
import type { UserProfile } from './lib/auth';
import {
  fetchVaults,
  checkinVault,
  pauseVault,
  resumeVault,
  fetchEventChain,
  verifyEventChain,
  cancelActiveClaim,
  createDemoVault
} from './lib/api';
import type { VaultSummary, AuditEventItem, ChainVerificationResult } from './lib/api';
import { AppShell } from './components/layout/AppShell';
import { DashboardHeader } from './components/layout/DashboardHeader';
import { AuthScreen } from './components/auth/AuthScreen';
import { HeroCard } from './components/dashboard/HeroCard';
import { SecurityCallout } from './components/dashboard/SecurityCallout';
import { MetricsBar } from './components/dashboard/MetricsBar';
import { EstateAssetsCard } from './components/dashboard/EstateAssetsCard';
import { HeirsDirectoryCard } from './components/dashboard/HeirsDirectoryCard';
import { VaultCard } from './components/vault/VaultCard';
import { AuditChainModal } from './components/vault/AuditChainModal';
import { CancelClaimModal } from './components/vault/CancelClaimModal';
import { CreateVaultModal } from './components/vault/CreateVaultModal';
import { WalletConnectModal } from './components/ui/WalletConnectModal';
import type { EstateAsset } from './components/ui/WalletConnectModal';
import { ToastStack } from './components/ui/Toast';
import type { ToastKind, ToastMessage } from './components/ui/Toast';
import { SpotlightCard } from './components/ui/SpotlightCard';
import { Button } from './components/ui/Button';

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
      const saved = localStorage.getItem('cip-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [createVaultModalOpen, setCreateVaultModalOpen] = useState(false);

  // Estate Assets & Wallet state (persisted). Empty by default: sample portfolios are
  // only ever loaded explicitly via the "Load Sample Estate" action in the wallet modal.
  const [connectedAddress, setConnectedAddress] = useState<string | null>(() => {
    try {
      return localStorage.getItem('cip-wallet-address');
    } catch {
      return null;
    }
  });

  const [assets, setAssets] = useState<EstateAsset[]>(() => {
    try {
      const raw = localStorage.getItem('cip-estate-assets');
      return raw ? (JSON.parse(raw) as EstateAsset[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
      pushToast('success', 'Passkey registered! Your biometric device is now your key.');
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

  async function handleLogout() {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
      setVaults([]);
      pushToast('info', 'Signed out successfully.');
    } finally {
      setLoading(false);
    }
  }

  function handleConnectWallet(address: string, newAssets: EstateAsset[]) {
    setConnectedAddress(address);
    setAssets(newAssets);
    try {
      localStorage.setItem('cip-wallet-address', address);
      localStorage.setItem('cip-estate-assets', JSON.stringify(newAssets));
    } catch {
      // ignore
    }
    pushToast('success', `Assets linked: ${address.slice(0, 6)}...${address.slice(-4)}`);
  }

  async function handleQuickDemoVault() {
    setBusyId('quick-demo');
    try {
      const res = await createDemoVault('Family Bitcoin & Savings Trust', 90);
      pushToast('success', `Vault "${res.label}" created successfully! Check-in timer started.`);
      await loadVaults();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to create vault');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCheckin(vault: VaultSummary) {
    setBusyId(vault.id);
    try {
      await checkinVault(vault.id);
      pushToast('success', `Liveness confirmed! Timer reset for "${vault.label}".`);
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
        pushToast('success', `Vault "${vault.label}" resumed.`);
      } else {
        await pauseVault(vault.id);
        pushToast('success', `Vault "${vault.label}" paused for vacation / off-grid.`);
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
              <div className="absolute -inset-5 rounded-full bg-blue-500/20 blur-2xl" />
              <ShieldCheck className="relative w-10 h-10 text-blue-500 animate-pulse" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading your vaults...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  const challengedVaults = vaults.filter((v) => v.state === 'CHALLENGE');

  return (
    <AppShell>
      <DashboardHeader
        user={user}
        theme={theme}
        connectedAddress={connectedAddress}
        onToggleTheme={toggleTheme}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenCreateVault={() => setCreateVaultModalOpen(true)}
      />

      {!user ? (
        <div className="flex-1 w-full flex flex-col">
          <AuthScreen error={authError} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 space-y-6">
          {/* Top Row: Hero Stats + Security Explainer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8">
              <HeroCard
                user={user}
                vaults={vaults}
                onOpenCreateVault={() => setCreateVaultModalOpen(true)}
                onOpenWalletModal={() => setWalletModalOpen(true)}
                onQuickDemoVault={handleQuickDemoVault}
                onQuickCheckin={() => {
                  const activeVault = vaults.find((v) => v.state === 'ACTIVE');
                  if (activeVault) handleCheckin(activeVault);
                }}
              />
            </div>
            <div className="lg:col-span-4">
              <SecurityCallout />
            </div>
          </div>

          {/* Visual Succession Protocol Pipeline */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/80 shadow-md space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <Zap className="w-4 h-4 text-blue-500" />
                <span>Automated Succession Pipeline (How Your Estate Is Protected)</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STAGE 1 ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              {/* Stage 1 */}
              <div className="p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-50/60 dark:bg-emerald-950/20 relative flex flex-col justify-between gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-md">
                    1
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-200/60 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                    CURRENT STAGE
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Owner Biometric Heartbeat</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    You tap Face ID, Touch ID, or Windows Hello every 90 days. Every tap records a signed cryptographic liveness proof.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Countdown Active: 89 Days
                </div>
              </div>

              {/* Stage 2 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 relative flex flex-col justify-between gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-mono font-bold text-xs shadow-md">
                    2
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400">
                    ESCALATION BUFFER
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">30-Day Emergency Window</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    If you miss your check-in deadline, multi-channel alerts fire every 72 hours. You can cancel with 1 biometric tap anytime.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                  <span>0 Emergency Claims Active</span>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 relative flex flex-col justify-between gap-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-mono font-bold text-xs shadow-md">
                    3
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400">
                    AUTOMATED RELEASE
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Enclave Heir Handover</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    If the 30-day window expires with zero check-in, the isolated AWS Nitro enclave releases keys directly to designated heirs.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-purple-700 dark:text-purple-400 font-semibold flex items-center gap-1.5 pt-1">
                  <span>Designated: Sarah (70%), David (30%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Red Alert Banner if Claim in Progress */}
          {challengedVaults.length > 0 && (
            <div className="border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-950/50 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-red-100 dark:bg-red-500/20 border border-red-300 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-300">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-wide text-red-900 dark:text-red-200">
                    EMERGENCY ALERT: INHERITANCE CLAIM STARTED
                  </h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    An heir has initiated a release claim. If you are alive, tap the button below to cancel it immediately.
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
                  className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition shadow-lg shrink-0 disabled:opacity-50"
                >
                  I AM ALIVE — CANCEL CLAIM
                </button>
              ))}
            </div>
          )}

          {/* Protected Assets & Estate Portfolio Bento */}
          <EstateAssetsCard
            assets={assets}
            connectedAddress={connectedAddress}
            onOpenWalletModal={() => setWalletModalOpen(true)}
          />

          {/* Beneficiaries & Heirs Bento */}
          <HeirsDirectoryCard
            onAddHeirClick={() => setCreateVaultModalOpen(true)}
          />

          {/* Numerical Metrics Bar */}
          <MetricsBar vaults={vaults} />

          {/* Coordinated Vaults Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Your Protection Vaults
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 tabular-nums font-semibold">
                  {vaults.length} Active
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-md shadow-blue-500/20"
                  onClick={() => setCreateVaultModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> + Protect a Vault
                </Button>
              </div>
            </div>

            {vaults.length === 0 ? (
              /* Friendly, Welcoming Empty State with Direct 1-Click Action */
              <SpotlightCard
                spotlightColor="rgba(59, 130, 246, 0.12)"
                className="p-8 sm:p-10 text-center border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    You don't have any active vaults yet
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Set up your first inheritance vault in under 60 seconds. Choose who gets your crypto
                    if something happens to you, and how often you want to check in.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-6 py-3 shadow-lg shadow-blue-500/20"
                    onClick={() => setCreateVaultModalOpen(true)}
                  >
                    <Plus className="w-4 h-4" /> Create Your First Vault (Easy Setup)
                  </Button>

                  <Button
                    variant="secondary"
                    size="lg"
                    className="border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 text-sm px-5 py-3 font-medium"
                    onClick={handleQuickDemoVault}
                    loading={busyId === 'quick-demo'}
                  >
                    <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 1-Click Sample Vault
                  </Button>
                </div>
              </SpotlightCard>
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

      {/* Honest, Clean Open-Source Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/40 backdrop-blur-md px-6 py-5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 dark:text-slate-400 font-sans">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-900 dark:text-slate-300 font-semibold">Crypto Inheritance Platform</span>
            <span className="text-slate-400">·</span>
            <span>Open Source & Non-Custodial Protocol</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
            <a href="#how-it-works" className="hover:text-blue-600 dark:hover:text-blue-400 transition">How It Works</a>
            <span>·</span>
            <a href="https://github.com/aethel-network/crypto-inheritance-platform" target="_blank" rel="noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition">GitHub Source</a>
            <span>·</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Modals Suite */}
      {user && (
        <>
          <WalletConnectModal
            open={walletModalOpen}
            connectedAddress={connectedAddress}
            onConnect={handleConnectWallet}
            onClose={() => setWalletModalOpen(false)}
          />

          <CreateVaultModal
            open={createVaultModalOpen}
            onSuccess={(createdLabel) => {
              pushToast('success', `Vault "${createdLabel}" created successfully!`);
              loadVaults();
            }}
            onClose={() => setCreateVaultModalOpen(false)}
          />

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
