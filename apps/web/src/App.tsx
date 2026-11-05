import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Key,
  Fingerprint,
  AlertTriangle,
  Clock,
  Pause,
  Play,
  CheckCircle2,
  XCircle,
  Lock,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  fetchCurrentUser,
  loginWithPasskey,
  registerPasskey,
  UserProfile
} from './lib/auth.js';
import {
  fetchVaults,
  checkinVault,
  pauseVault,
  resumeVault,
  fetchEventChain,
  verifyEventChain,
  cancelActiveClaim,
  VaultSummary,
  AuditEventItem,
  ChainVerificationResult
} from './lib/api.js';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [selectedVaultEvents, setSelectedVaultEvents] = useState<{
    vaultId: string;
    events: AuditEventItem[];
    verification: ChainVerificationResult | null;
  } | null>(null);

  // Auth form states
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('My YubiKey 5C');
  const [authError, setAuthError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingVaultId, setCancellingVaultId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('I am alive and well');

  useEffect(() => {
    loadUserAndVaults();
  }, []);

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
      // Unauthenticated
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      await registerPasskey(usernameInput, emailInput, deviceNameInput);
      setActionSuccess('Passkey registered successfully! Please log in.');
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

  async function handleCheckin(vaultId: string) {
    setActionError(null);
    try {
      await checkinVault(vaultId);
      setActionSuccess('Liveness asserted successfully! Countdown timer reset.');
      const v = await fetchVaults();
      setVaults(v);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Checkin failed');
    }
  }

  async function handlePauseResume(vault: VaultSummary) {
    setActionError(null);
    try {
      if (vault.state === 'PAUSED') {
        await resumeVault(vault.id);
        setActionSuccess(`Vault "${vault.label}" resumed.`);
      } else {
        await pauseVault(vault.id);
        setActionSuccess(`Vault "${vault.label}" countdown paused.`);
      }
      const v = await fetchVaults();
      setVaults(v);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  function handleOpenCancelModal(vaultId: string) {
    setCancellingVaultId(vaultId);
    setCancelReasonInput('I am alive and well');
  }

  async function confirmCancelClaim() {
    if (!cancellingVaultId) return;
    setActionError(null);
    try {
      await cancelActiveClaim(cancellingVaultId, cancelReasonInput || 'I am alive and well');
      setActionSuccess('Claim cancelled and vault restored to ACTIVE status.');
      setCancellingVaultId(null);
      const v = await fetchVaults();
      setVaults(v);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Cancellation failed');
    }
  }

  async function handleViewAuditChain(vaultId: string) {
    setActionError(null);
    try {
      const { events } = await fetchEventChain(vaultId);
      const verification = await verifyEventChain(vaultId);
      setSelectedVaultEvents({ vaultId, events, verification });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to load audit chain');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Loading platform state...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Crypto Inheritance Platform
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ZERO-KNOWLEDGE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Tier-1 Passkey Liveness & Event Coordination</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400">
                User: <strong className="text-slate-200">{user.username}</strong>
              </span>
              <span className="inline-flex items-center text-xs px-2.5 py-1 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">
                <Fingerprint className="w-3.5 h-3.5 mr-1" /> FIDO2 Passkeys Active
              </span>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition flex items-center shadow-lg shadow-emerald-950"
            >
              <Fingerprint className="w-4 h-4 mr-2" /> Log In with Passkey
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Architectural Invariant Security Callout */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-start space-x-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-slate-200">
              Two-Tier Secret Separation Invariant (ADR-0001)
            </p>
            <p className="text-slate-400 leading-relaxed">
              This web platform strictly coordinates planning, WebAuthn liveness assertion, and alert schedules.
              It <strong>never</strong> asks for, receives, processes, or stores unencrypted seed phrases or private keys.
              All master key generation and threshold splitting happen cold and air-gapped via the offline{' '}
              <code className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">cip</code> CLI.
            </p>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm rounded-lg flex items-center justify-between">
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline text-emerald-400">Dismiss</button>
          </div>
        )}

        {actionError && (
          <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 text-sm rounded-lg flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-xs hover:underline text-red-400">Dismiss</button>
          </div>
        )}

        {/* Authentication Form if Unauthenticated */}
        {!user && (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">Passkey Authentication</h2>
              <p className="text-xs text-slate-400">
                Phishing-resistant WebAuthn resident keys. No passwords, no SMS tokens.
              </p>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-lg">
                {authError}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Estate Owner Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. alice_estate"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Encrypted Notification Email</label>
                <input
                  type="email"
                  required
                  placeholder="alice@proton.me"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Hardware Token Label</label>
                <input
                  type="text"
                  required
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition shadow-lg shadow-emerald-950 flex items-center justify-center"
              >
                <Fingerprint className="w-4 h-4 mr-2" /> Register Passkey on Hardware
              </button>
            </form>

            <div className="border-t border-slate-800 pt-4 text-center">
              <button
                onClick={handleLogin}
                className="text-xs text-emerald-400 hover:underline"
              >
                Already registered? Sign in with your hardware passkey &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Authenticated Dashboard */}
        {user && (
          <div className="space-y-6">
            {/* Active Challenge Alert Banner (If Any Vault is in CHALLENGE) */}
            {vaults.some((v) => v.state === 'CHALLENGE') && (
              <div className="rounded-xl border border-red-600 bg-red-950/80 p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-red-900 border border-red-500 flex items-center justify-center text-red-200 shrink-0">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-wide">
                      RED ALERT: INHERITANCE CLAIM INITIATED
                    </h3>
                    <p className="text-xs text-red-200 mt-0.5">
                      An authorized heir has initiated a release claim. 30-day challenge window is running.
                      If you are alive, tap your passkey to cancel immediately.
                    </p>
                  </div>
                </div>

                {vaults.filter((v) => v.state === 'CHALLENGE').map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleOpenCancelModal(v.id)}
                    className="px-5 py-2.5 bg-white text-red-950 font-bold text-sm rounded-lg hover:bg-red-100 transition shadow-lg shrink-0"
                  >
                    I AM ALIVE — CANCEL CLAIM
                  </button>
                ))}
              </div>
            )}

            {/* Vault Cards Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Coordinated Vaults ({vaults.length})</h2>
                <div className="text-xs text-slate-400">
                  Total Managed Threshold Shares: <strong>{vaults.length * 2}</strong>
                </div>
              </div>

              {vaults.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                  <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-medium">No vaults connected to this account yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Initialize cold vault on your air-gapped machine using <code className="text-emerald-400">cip init-vault</code> and upload metadata.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {vaults.map((vault) => {
                    const lastCheckin = new Date(vault.lastCheckinAt);
                    const daysSinceCheckin = Math.floor((Date.now() - lastCheckin.getTime()) / (24 * 3600 * 1000));
                    const daysRemaining = Math.max(0, vault.checkinIntervalDays - daysSinceCheckin);

                    return (
                      <div
                        key={vault.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-lg hover:border-slate-700 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-white text-base">{vault.label}</h3>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {vault.id.slice(0, 13)}...</p>
                          </div>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-mono font-medium border ${vault.state === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                : vault.state === 'CHALLENGE'
                                  ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                                  : vault.state === 'PAUSED'
                                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                                    : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}
                          >
                            {vault.state}
                          </span>
                        </div>

                        {/* Countdown Widget */}
                        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400 flex items-center">
                              <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Liveness Countdown
                            </span>
                            <span className="font-mono font-bold text-emerald-400">
                              {vault.state === 'PAUSED' ? 'PAUSED' : `${daysRemaining} days remaining`}
                            </span>
                          </div>

                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${daysRemaining > 30 ? 'bg-emerald-500' : daysRemaining > 7 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                              style={{ width: `${Math.min(100, Math.max(5, (daysRemaining / vault.checkinIntervalDays) * 100))}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Checkin Interval: {vault.checkinIntervalDays}d</span>
                            <span>Grace Period: {vault.gracePeriodDays}d</span>
                            <span>Challenge: {vault.challengeWindowDays}d</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleCheckin(vault.id)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center transition shadow-md shadow-emerald-950"
                          >
                            <Fingerprint className="w-3.5 h-3.5 mr-1.5" /> Assert Liveness (Passkey)
                          </button>

                          <button
                            onClick={() => handlePauseResume(vault)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center transition"
                            title={vault.state === 'PAUSED' ? 'Resume Countdown' : 'Pause Countdown'}
                          >
                            {vault.state === 'PAUSED' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleViewAuditChain(vault.id)}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center transition"
                            title="Inspect Cryptographic Merkle Chain"
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" /> Chain
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cryptographic Merkle Event Chain Audit Modal */}
            {selectedVaultEvents && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-white text-base">
                        Merkle Event Chain Audit Trail
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedVaultEvents(null)}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      &times; Close
                    </button>
                  </div>

                  {/* Verification Banner */}
                  <div className="p-3 rounded-lg border flex items-center justify-between text-xs bg-slate-950">
                    <div className="flex items-center space-x-2">
                      {selectedVaultEvents.verification?.valid ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300 font-semibold">
                            Cryptographic Integrity Verified (Ed25519 Signatures Valid)
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-red-300 font-semibold">
                            Verification Alert: Chain Tampered or Broken
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-slate-400 font-mono">
                      Events: {selectedVaultEvents.events.length}
                    </span>
                  </div>

                  {/* Event Chain List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                    {selectedVaultEvents.events.map((evt) => (
                      <div
                        key={evt.id}
                        className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">
                            #{evt.sequence} {evt.type}
                          </span>
                          <span className="text-slate-500 text-[10px]">{evt.createdAt}</span>
                        </div>
                        <div className="text-slate-400 text-[11px] truncate">
                          Payload Hash: <span className="text-slate-300">{evt.payloadHash}</span>
                        </div>
                        <div className="text-slate-500 text-[10px] truncate">
                          Prev Hash: {evt.prevHash}
                        </div>
                        <div className="text-slate-500 text-[10px] truncate">
                          Signature: {evt.signature.slice(0, 32)}...
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile-Friendly Modal for Step-Up Claim Cancellation */}
        {cancellingVaultId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-red-500/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-red-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold text-white">Confirm Liveness & Cancel Claim</h3>
              </div>
              <p className="text-sm text-slate-300">
                This will immediately abort the heir's release request and restore your vault to <strong>ACTIVE</strong> status.
                A WebAuthn biometric passkey step-up assertion is required.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Cancellation Reason / Statement
                </label>
                <input
                  type="text"
                  value={cancelReasonInput}
                  onChange={(e) => setCancelReasonInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-red-500"
                  placeholder="e.g. I am alive and well"
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingVaultId(null)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                >
                  Abort
                </button>
                <button
                  type="button"
                  onClick={confirmCancelClaim}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-lg transition shadow-lg"
                >
                  Assert Liveness & Cancel Claim
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
