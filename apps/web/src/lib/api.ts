import {
  startAuthentication as browserStartAuthentication
} from '@simplewebauthn/browser';

const API_BASE = import.meta.env['VITE_API_BASE'] || 'http://localhost:3000';

export interface VaultSummary {
  id: string;
  label: string;
  state: 'ACTIVE' | 'REMINDER_WINDOW' | 'PENDING' | 'CHALLENGE' | 'RELEASED' | 'PAUSED' | 'CANCELLED';
  checkinIntervalDays: number;
  gracePeriodDays: number;
  challengeWindowDays: number;
  lastCheckinAt: string;
  version: number;
  createdAt: string;
}

export interface AuditEventItem {
  id: string;
  sequence: number;
  type: string;
  payloadHash: string;
  prevHash: string;
  signature: string;
  createdAt: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  headSequence?: number;
  error?: string;
}

export async function fetchVaults(): Promise<VaultSummary[]> {
  const res = await fetch(`${API_BASE}/vaults`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load vaults');
  const data = await res.json();
  return data.vaults;
}

export async function checkinVault(vaultId: string): Promise<{ success: boolean; state: string; lastCheckinAt: string }> {
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/checkin`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Checkin failed');
  }
  return res.json();
}

export async function pauseVault(vaultId: string): Promise<{ success: boolean; state: string }> {
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/pause`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to pause vault');
  return res.json();
}

export async function resumeVault(vaultId: string): Promise<{ success: boolean; state: string }> {
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/resume`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to resume vault');
  return res.json();
}

export async function fetchEventChain(vaultId: string): Promise<{ events: AuditEventItem[]; serverPublicKey: string }> {
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/events`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load event chain');
  return res.json();
}

export async function verifyEventChain(vaultId: string): Promise<ChainVerificationResult> {
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/events/verify`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to verify event chain');
  return res.json();
}

/**
 * Triggers hardware WebAuthn biometric step-up ceremony to obtain a 5-minute single-use token.
 */
export async function getStepUpToken(action: string): Promise<string> {
  // 1. Fetch authentication options
  const optRes = await fetch(`${API_BASE}/auth/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!optRes.ok) throw new Error('Failed to initiate step-up ceremony');
  const { options } = await optRes.json();

  // 2. Hardware passkey assertion
  const authResponse = await browserStartAuthentication({ optionsJSON: options });

  // 3. Obtain step-up token
  const verifyRes = await fetch(`${API_BASE}/auth/stepup/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, response: authResponse })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.message || 'Step-up verification failed');
  }

  const { stepUpToken } = await verifyRes.json();
  return stepUpToken;
}

export async function cancelActiveClaim(vaultId: string, reason: string): Promise<void> {
  const stepUpToken = await getStepUpToken('CANCEL_CLAIM');
  const res = await fetch(`${API_BASE}/vaults/${vaultId}/claim/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ stepUpToken, reason })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to cancel claim');
  }
}

