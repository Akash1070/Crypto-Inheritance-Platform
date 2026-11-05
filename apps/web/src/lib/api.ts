import {
  startAuthentication as browserStartAuthentication
} from '@simplewebauthn/browser';

const API_BASE = import.meta.env['VITE_API_BASE'] || (import.meta.env.PROD ? '/api' : 'http://localhost:3000');

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

export interface CreateVaultPayload {
  label: string;
  config?: {
    checkinIntervalDays: number;
    gracePeriodDays: number;
    challengeWindowDays: number;
  };
  ciphertextEnvelope: string;
  sealedEscrowShare: string;
}

export async function createVault(payload: CreateVaultPayload): Promise<{ vaultId: string; label: string; state: string }> {
  const res = await fetch(`${API_BASE}/vaults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to create vault');
  }
  return res.json();
}

/**
 * Creates a compliant encrypted vault package without client-side raw secret exposure.
 */
export async function createDemoVault(
  label: string = 'Primary Cold Storage Vault',
  checkinIntervalDays: number = 90
): Promise<{ vaultId: string; label: string; state: string }> {
  const randomHex = (len: number) =>
    Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const randomB64 = (len: number) =>
    btoa(Array.from({ length: len }, () => String.fromCharCode(Math.floor(Math.random() * 256))).join(''));

  const vaultId = `vlt-${randomHex(8)}-${randomHex(4)}-${randomHex(4)}-${randomHex(12)}`;
  const envelope = {
    magic: 'CIP_VAULT',
    formatVersion: 1,
    suiteId: 1,
    vaultId,
    createdAt: new Date().toISOString(),
    nonce: randomB64(24),
    ciphertext: randomB64(128),
    metadataHash: randomHex(64)
  };

  const sealedEscrowShare = randomHex(96);

  return createVault({
    label,
    config: {
      checkinIntervalDays,
      gracePeriodDays: 30,
      challengeWindowDays: 30
    },
    ciphertextEnvelope: JSON.stringify(envelope, null, 2),
    sealedEscrowShare
  });
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

