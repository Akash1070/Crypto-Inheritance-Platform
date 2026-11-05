import React, { useState, useEffect, useRef } from 'react';
import {
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Wallet,
  Zap,
  Terminal
} from 'lucide-react';
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
import { WalletConnectModal, DEFAULT_DEMO_ESTATE } from './components/ui/WalletConnectModal';
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

  // Modals state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [createVaultModalOpen, setCreateVaultModalOpen] = useState(false);

  // Estate Assets & Wallet state (persisted)
  const [connectedAddress, setConnectedAddress] = useState<string | null>(() => {
    try {
      return localStorage.getItem('cip-wallet-address') || '0x71C5681A7b93910398F78627b0f6D472eC7F49A2';
    } catch {
      return '0x71C5681A7b93910398F78627b0f6D472eC7F49A2';
    }
  });

  const [assets, setAssets] = useState<EstateAsset[]>(() => {
    try {
      const raw = localStorage.getItem('cip-estate-assets');
      return raw ? JSON.parse(raw) : DEFAULT_DEMO_ESTATE;
    } catch {
      return DEFAULT_DEMO_ESTATE;
    }
  });

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

  function handleConnectWallet(address: string, newAssets: EstateAsset[]) {
    setConnectedAddress(address);
    setAssets(newAssets);
    try {
      localStorage.setItem('cip-wallet-address', address);
      localStorage.setItem('cip-estate-assets', JSON.stringify(newAssets));
    } catch {
      // ignore
    }
    pushToast('success', `Estate assets updated. Watched address: ${address.slice(0, 6)}...${address.slice(-4)}`);
  }

  async function handleQuickDemoVault() {
    setBusyId('quick-demo');
    try {
      const res = await createDemoVault('Primary Sovereign Bitcoin Trust', 90);
      pushToast('success', `Vault "${res.label}" initialized! Tamper-proof event chain started.`);
      await loadVaults();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Failed to create demo vault');
    } finally {
      setBusyId(null);
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
      <DashboardHeader
        user={user}
        theme={theme}
        connectedAddress={connectedAddress}
        onToggleTheme={toggleTheme}
        onLogin={handleLogin}
        onOpenWalletModal={() => setWalletModalOpen(true)}
        onOpenCreateVault={() => setCreateVaultModalOpen(true)}
      />

      {!user ? (
        <div className="flex-1 w-full flex flex-col">
          <AuthScreen error={authError} onLogin={handleLogin} onRegister={handleRegister} />
        </div>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-16 space-y-6">
          {/* Top Row: Hero Stats + Security Callout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8">
              <HeroCard
                user={user}
                vaults={vaults}
                onOpenCreateVault={() => setCreateVaultModalOpen(true)}
                onOpenWalletModal={() => setWalletModalOpen(true)}
                onQuickDemoVault={handleQuickDemoVault}
              />
            </div>
            <div className="lg:col-span-4">
              <SecurityCallout />
            </div>
          </div>

          {/* Red Alert Banner if Claim in Progress */}
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
                <h2 className="text-lg font-bold tracking-tight text-ink">
                  Coordinated Inheritance Vaults
                </h2>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-slate-700 bg-slate-900/60 text-slate-300 tabular-nums">
                  {vaults.length} Active
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs shadow-md shadow-blue-500/20"
                  onClick={() => setCreateVaultModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> New Vault
                </Button>
                <p className="text-xs text-faint hidden sm:block">Hardware passkey required for all state transitions</p>
              </div>
            </div>

            {vaults.length === 0 ? (
              /* Rich Interactive Action Bento for Zero Vaults */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.15)"
                  className="p-6 border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">1-Click Quickstart Vault</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Initialize a sample encrypted vault with 90-day countdown, test assets, and designated heirs to explore the protocol immediately.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs"
                    onClick={handleQuickDemoVault}
                    loading={busyId === 'quick-demo'}
                  >
                    Deploy 1-Click Vault
                  </Button>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(59, 130, 246, 0.15)"
                  className="p-6 border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Connect Wallet & Assets</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Link your MetaMask, cold storage Bitcoin address, or load the pre-built $1.6M whale estate template.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full border-slate-700 bg-slate-800 text-slate-200 font-mono text-xs"
                    onClick={() => setWalletModalOpen(true)}
                  >
                    Configure Assets
                  </Button>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(168, 85, 247, 0.15)"
                  className="p-6 border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Air-Gapped CLI Paranoia</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Split secrets cold on Tails OS using the <code className="text-purple-300 font-mono">cip</code> CLI and upload the sealed envelope.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full border-slate-700 bg-slate-800 text-slate-200 font-mono text-xs"
                    onClick={() => setCreateVaultModalOpen(true)}
                  >
                    Open CLI Guide / Upload
                  </Button>
                </SpotlightCard>
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

      {/* Institutional Footer */}
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
              pushToast('success', `Vault "${createdLabel}" deployed successfully!`);
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
