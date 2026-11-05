import {
  startRegistration as browserStartRegistration,
  startAuthentication as browserStartAuthentication
} from '@simplewebauthn/browser';

const API_BASE = import.meta.env['VITE_API_BASE'] || (import.meta.env.PROD ? '/api' : 'http://localhost:3000');

export interface UserProfile {
  id: string;
  username: string;
  status: string;
  credentials: { id: string; deviceName: string; createdAt: string; lastUsedAt: string }[];
  minimumMet: boolean;
  hasEmergencyKit: boolean;
}

export async function registerPasskey(username: string, email: string, deviceName: string) {
  // 1. Fetch registration options from server
  const optRes = await fetch(`${API_BASE}/auth/register/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email })
  });

  if (!optRes.ok) {
    const err = await optRes.json();
    throw new Error(err.message || 'Failed to initialize passkey registration');
  }

  const { userId, options } = await optRes.json();

  // 2. Trigger browser WebAuthn ceremony (Touch ID, Face ID, Windows Hello, YubiKey)
  const regResponse = await browserStartRegistration({ optionsJSON: options });

  // 3. Send response back to server for verification
  const verifyRes = await fetch(`${API_BASE}/auth/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, deviceName, response: regResponse })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.message || 'Passkey verification failed');
  }

  return verifyRes.json();
}

export async function loginWithPasskey(username?: string) {
  // 1. Fetch authentication options
  const optRes = await fetch(`${API_BASE}/auth/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!optRes.ok) {
    const err = await optRes.json();
    throw new Error(err.message || 'Failed to initialize login');
  }

  const { options } = await optRes.json();

  // 2. Trigger browser WebAuthn ceremony
  const authResponse = await browserStartAuthentication({ optionsJSON: options });

  // 3. Verify assertion with server
  const verifyRes = await fetch(`${API_BASE}/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ response: authResponse })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.message || 'Login verification failed');
  }

  return verifyRes.json();
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch {
    // ignore
  }
}

