import { describe, it, expect } from 'vitest';
import {
  splitSecret,
  reconstructSecret,
  serializeShare,
  deserializeShare,
  ShareIntegrityError,
  InsufficientSharesError,
  ensureSodium
} from '../src/index.js';

describe('Verifiable Shamir Secret Sharing (VSSS GF(256))', () => {
  const testVaultId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  it('splits and reconstructs a 256-bit Vault Key in Standard 2-of-2 mode', async () => {
    const sodium = await ensureSodium();
    const vaultKey = sodium.randombytes_buf(32);

    const shares = await splitSecret(vaultKey, 2, 2, testVaultId);
    expect(shares.length).toBe(2);
    expect(shares[0]!.index).toBe(1);
    expect(shares[1]!.index).toBe(2);
    expect(shares[0]!.commitment.length).toBe(32);

    const reconstructed = await reconstructSecret(shares, testVaultId);
    expect(reconstructed).toEqual(vaultKey);
  });

  it('reconstructs correctly from all C(5, 3) = 10 subsets in 3-of-5 threshold mode', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 3, 5, testVaultId);
    expect(shares.length).toBe(5);

    // Generate all 3-share combinations from 5 shares
    const combinations: number[][] = [
      [0, 1, 2],
      [0, 1, 3],
      [0, 1, 4],
      [0, 2, 3],
      [0, 2, 4],
      [0, 3, 4],
      [1, 2, 3],
      [1, 2, 4],
      [1, 3, 4],
      [2, 3, 4]
    ];

    for (const [i1, i2, i3] of combinations) {
      const subset = [shares[i1!]!, shares[i2!]!, shares[i3!]!];
      const reconstructed = await reconstructSecret(subset, testVaultId);
      expect(reconstructed).toEqual(secret);
    }
  });

  it('fails closed when fewer than threshold shares are provided', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 3, 5, testVaultId);
    const twoShares = [shares[0]!, shares[1]!];

    await expect(reconstructSecret(twoShares, testVaultId)).rejects.toThrow(
      InsufficientSharesError
    );
  });

  it('detects single-bit tampering and throws ShareIntegrityError', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 2, 3, testVaultId);
    // Tamper with one bit of share 0's value
    shares[0]!.value[0]! ^= 0x01;

    await expect(reconstructSecret([shares[0]!, shares[1]!], testVaultId)).rejects.toThrow(
      ShareIntegrityError
    );
  });

  it('detects swapped share index and throws ShareIntegrityError', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 2, 3, testVaultId);
    // Swap share 0 index to 3
    shares[0]!.index = 3;

    await expect(reconstructSecret([shares[0]!, shares[1]!], testVaultId)).rejects.toThrow(
      ShareIntegrityError
    );
  });

  it('rejects shares used against an incorrect vault ID', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 2, 2, testVaultId);
    const wrongVaultId = '00000000-0000-0000-0000-000000000000';

    await expect(reconstructSecret(shares, wrongVaultId)).rejects.toThrow(ShareIntegrityError);
  });

  it('detects duplicate share indices', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 2, 3, testVaultId);
    const duplicates = [shares[0]!, shares[0]!];

    await expect(reconstructSecret(duplicates, testVaultId)).rejects.toThrow(
      'Duplicate share index detected'
    );
  });

  it('detects mismatched thresholds or value lengths', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const shares = await splitSecret(secret, 2, 2, testVaultId);
    shares[1]!.threshold = 3;

    await expect(reconstructSecret(shares, testVaultId)).rejects.toThrow(
      'Mismatched share thresholds'
    );

    const sharesB = await splitSecret(secret, 2, 2, testVaultId);
    sharesB[1]!.value = new Uint8Array(16);

    await expect(reconstructSecret(sharesB, testVaultId)).rejects.toThrow(
      'Mismatched share value lengths'
    );
  });

  it('validates invalid parameters in splitSecret', async () => {
    const secret = new Uint8Array(32);

    await expect(splitSecret(new Uint8Array(0), 2, 2, testVaultId)).rejects.toThrow(
      'Secret cannot be empty'
    );
    await expect(splitSecret(secret, 1, 2, testVaultId)).rejects.toThrow(
      'Threshold must be at least 2'
    );
    await expect(splitSecret(secret, 3, 2, testVaultId)).rejects.toThrow(
      'Total shares (2) cannot be less than threshold'
    );
    await expect(splitSecret(secret, 2, 256, testVaultId)).rejects.toThrow(
      'Total shares cannot exceed 255'
    );
    await expect(splitSecret(secret, 2, 3, '')).rejects.toThrow('Vault ID is required');
  });

  it('rejects empty share array or invalid index out of bounds', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);
    const shares = await splitSecret(secret, 2, 2, testVaultId);

    await expect(reconstructSecret([], testVaultId)).rejects.toThrow('No shares provided');

    const outOfBoundsShare = { ...shares[0]!, index: 0 };
    await expect(reconstructSecret([outOfBoundsShare, shares[1]!], testVaultId)).rejects.toThrow(
      'Invalid share index'
    );
  });

  it('serializes and deserializes shares cleanly', async () => {
    const sodium = await ensureSodium();
    const secret = sodium.randombytes_buf(32);

    const [share] = await splitSecret(secret, 2, 2, testVaultId);
    const serialized = serializeShare(share!);

    expect(serialized.startsWith('cip:v1:1:2:2:')).toBe(true);

    const deserialized = deserializeShare(serialized);
    expect(deserialized.index).toBe(share!.index);
    expect(deserialized.threshold).toBe(share!.threshold);
    expect(deserialized.totalShares).toBe(share!.totalShares);
    expect(deserialized.value).toEqual(share!.value);
    expect(deserialized.commitment).toEqual(share!.commitment);
  });

  it('rejects malformed serialized share strings', () => {
    expect(() => deserializeShare('invalid:data')).toThrow(ShareIntegrityError);
    expect(() => deserializeShare('cip:v2:1:2:3:val:com')).toThrow(ShareIntegrityError);
    expect(() => deserializeShare('cip:v1:not-a-number:2:3:val:com')).toThrow(ShareIntegrityError);
  });
});
