import { ensureSodium } from './init.js';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * Generates cryptographically secure random bytes using libsodium.
 */
export async function secureRandomBytes(length: number): Promise<Uint8Array> {
  const sodium = await ensureSodium();
  return sodium.randombytes_buf(length);
}

/**
 * Generates a cryptographically secure random hex string.
 */
export async function secureRandomHex(bytesLength: number): Promise<string> {
  const buf = await secureRandomBytes(bytesLength);
  return bytesToHex(buf);
}

/**
 * Constant-time byte array comparison to prevent timing side-channel attacks.
 */
export async function constantTimeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }
  const sodium = await ensureSodium();
  return sodium.memcmp(a, b);
}

/**
 * Computes SHA-256 hash formatted as hex string.
 */
export function sha256Hex(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = sha256(bytes);
  return bytesToHex(hash);
}

/**
 * Computes HMAC-SHA256 formatted as hex string (used for blind index computation).
 */
export function hmacSha256Hex(key: string | Uint8Array, data: string | Uint8Array): string {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const res = hmac(sha256, keyBytes, dataBytes);
  return bytesToHex(res);
}
