import { describe, it, expect } from 'vitest';
import {
  secureRandomBytes,
  secureRandomHex,
  constantTimeEqual,
  sha256Hex,
  hmacSha256Hex
} from '../src/utils.js';

describe('Cryptographic Utilities (packages/crypto-core)', () => {
  it('generates secure random bytes and hex', async () => {
    const bytes = await secureRandomBytes(32);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(32);

    const hex = await secureRandomHex(16);
    expect(hex).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(hex)).toBe(true);
  });

  it('performs constant-time comparison correctly', async () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 4]);
    const c = new Uint8Array([1, 2, 3, 5]);
    const d = new Uint8Array([1, 2, 3]);

    expect(await constantTimeEqual(a, b)).toBe(true);
    expect(await constantTimeEqual(a, c)).toBe(false);
    expect(await constantTimeEqual(a, d)).toBe(false);
  });

  it('computes sha256 and hmacsha256 hex correctly', () => {
    const hash = sha256Hex('test payload');
    expect(hash).toHaveLength(64);

    const hmac = hmacSha256Hex('secret-key', 'message');
    expect(hmac).toHaveLength(64);
  });
});
