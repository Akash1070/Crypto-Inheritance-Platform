import { describe, it, expect } from 'vitest';
import {
  generateSigningKeyPair,
  deriveSigningKeyPairFromPrivate,
  signHash,
  verifySignature,
  computeEventHash,
  computeBlindIndex,
  SIGN_PUBLIC_KEY_BYTES,
  SIGN_PRIVATE_KEY_BYTES
} from '../src/index.js';

describe('Ed25519 Signatures & Event Hashing', () => {
  it('generates 32-byte public key and 64-byte private key', async () => {
    const kp = await generateSigningKeyPair();
    expect(kp.publicKey.length).toBe(SIGN_PUBLIC_KEY_BYTES);
    expect(kp.privateKey.length).toBe(SIGN_PRIVATE_KEY_BYTES);

    // Derivation from 64-byte private key
    const derived64 = await deriveSigningKeyPairFromPrivate(kp.privateKey);
    expect(derived64.publicKey).toEqual(kp.publicKey);
    expect(derived64.privateKey).toEqual(kp.privateKey);

    // Derivation from 32-byte seed
    const seed = new Uint8Array(32).fill(77);
    const derivedFromSeed = await deriveSigningKeyPairFromPrivate(seed);
    expect(derivedFromSeed.publicKey.length).toBe(SIGN_PUBLIC_KEY_BYTES);
    expect(derivedFromSeed.privateKey.length).toBe(SIGN_PRIVATE_KEY_BYTES);

    // Invalid length
    await expect(deriveSigningKeyPairFromPrivate(new Uint8Array(20))).rejects.toThrow('Invalid private key length');
  });

  it('signs and verifies a 32-byte hash', async () => {
    const kp = await generateSigningKeyPair();
    const hash = new Uint8Array(32).fill(0xab);

    const signature = await signHash(hash, kp.privateKey);
    expect(signature.length).toBe(64);

    const isValid = await verifySignature(signature, hash, kp.publicKey);
    expect(isValid).toBe(true);

    // Tampered hash should fail
    const tamperedHash = new Uint8Array(32).fill(0xac);
    const isTamperedValid = await verifySignature(signature, tamperedHash, kp.publicKey);
    expect(isTamperedValid).toBe(false);
  });

  it('rejects invalid key lengths in sign and verify', async () => {
    const hash = new Uint8Array(32);
    const shortKey = new Uint8Array(16);

    await expect(signHash(hash, shortKey)).rejects.toThrow('Invalid private key length');
    await expect(verifySignature(new Uint8Array(64), hash, shortKey)).rejects.toThrow(
      'Invalid public key length'
    );
  });

  it('computes deterministic Merkle event hashes', () => {
    const hash1 = computeEventHash(0, 'VAULT_CREATED', 'hashA', 'hashPrev', '2026-11-05T00:00:00Z');
    const hash2 = computeEventHash(0, 'VAULT_CREATED', 'hashA', 'hashPrev', '2026-11-05T00:00:00Z');
    const hashDiff = computeEventHash(1, 'VAULT_CREATED', 'hashA', 'hashPrev', '2026-11-05T00:00:00Z');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDiff);
    expect(hash1.length).toBe(64); // 32 bytes hex
  });

  it('computes deterministic blind index with secret salt', () => {
    const idx1 = computeBlindIndex('user@example.com', 'salt-key-1');
    const idx2 = computeBlindIndex('  USER@EXAMPLE.COM ', 'salt-key-1');
    const idxOther = computeBlindIndex('user@example.com', 'salt-key-2');

    expect(idx1).toBe(idx2);
    expect(idx1).not.toBe(idxOther);
    expect(idx1.length).toBe(64);
  });
});

