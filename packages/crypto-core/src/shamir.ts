import { blake2b } from '@noble/hashes/blake2b';
import { ensureSodium } from './init.js';
import { zeroize } from './zeroize.js';

// Primitive polynomial for GF(256): x^8 + x^4 + x^3 + x^2 + 1 (0x11d = 285)
const GF_POLY = 0x11d;
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

// Initialize GF(256) exponential and logarithm lookup tables
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x = (x << 1) ^ (x & 0x80 ? GF_POLY : 0);
  }
  LOG_TABLE[0] = 0; // Guard for 0
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a]! + LOG_TABLE[b]!]!;
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero in GF(256)');
  if (a === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a]! - LOG_TABLE[b]! + 255) % 255]!;
}

export interface ShamirShare {
  index: number; // 1..255
  threshold: number;
  totalShares: number;
  value: Uint8Array;
  commitment: Uint8Array; // 32 bytes BLAKE2b
}

export class ShareIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShareIntegrityError';
  }
}

export class InsufficientSharesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientSharesError';
  }
}

/**
 * Computes a 32-byte BLAKE2b commitment binding the share to its vault, index, and parameters.
 */
export function computeShareCommitment(
  vaultId: string,
  index: number,
  threshold: number,
  totalShares: number,
  value: Uint8Array
): Uint8Array {
  const encoder = new TextEncoder();
  const header = encoder.encode(`cip-v1:${vaultId}:${index}:${threshold}:${totalShares}:`);
  const data = new Uint8Array(header.length + value.length);
  data.set(header, 0);
  data.set(value, header.length);
  return blake2b(data, { dkLen: 32 });
}

/**
 * Verifies a share's integrity commitment in constant time.
 */
export async function verifyShareCommitment(
  share: ShamirShare,
  vaultId: string
): Promise<boolean> {
  const sodium = await ensureSodium();
  const expected = computeShareCommitment(
    vaultId,
    share.index,
    share.threshold,
    share.totalShares,
    share.value
  );

  return sodium.memcmp(share.commitment, expected);
}

/**
 * Splits a master secret into n threshold shares using Verifiable Shamir Secret Sharing over GF(256).
 * Any t shares can reconstruct the secret; fewer than t reveal zero information.
 */
export async function splitSecret(
  secret: Uint8Array,
  threshold: number,
  totalShares: number,
  vaultId: string
): Promise<ShamirShare[]> {
  const sodium = await ensureSodium();

  if (secret.length === 0) {
    throw new Error('Secret cannot be empty');
  }
  if (threshold < 2) {
    throw new Error(`Threshold must be at least 2, got ${threshold}`);
  }
  if (totalShares < threshold) {
    throw new Error(`Total shares (${totalShares}) cannot be less than threshold (${threshold})`);
  }
  if (totalShares > 255) {
    throw new Error(`Total shares cannot exceed 255 in GF(256), got ${totalShares}`);
  }
  if (!vaultId) {
    throw new Error('Vault ID is required to bind share integrity commitments');
  }

  // Pre-allocate share buffers
  const shares: ShamirShare[] = [];
  for (let i = 1; i <= totalShares; i++) {
    shares.push({
      index: i,
      threshold,
      totalShares,
      value: new Uint8Array(secret.length),
      commitment: new Uint8Array(32)
    });
  }

  // For each byte of the secret, generate random coefficients and evaluate polynomial
  const coeffBuffer = new Uint8Array(threshold - 1);

  for (let byteIdx = 0; byteIdx < secret.length; byteIdx++) {
    const secretByte = secret[byteIdx]!;
    // Generate threshold - 1 random coefficients from CSPRNG
    const randomBytes = sodium.randombytes_buf(threshold - 1);
    coeffBuffer.set(randomBytes);

    for (let shareIdx = 0; shareIdx < totalShares; shareIdx++) {
      const x = shareIdx + 1;
      // Evaluate polynomial f(x) = secretByte + a1*x + a2*x^2 + ... in GF(256)
      // Horner's method:
      let y = 0;
      for (let deg = threshold - 2; deg >= 0; deg--) {
        y = gfMul(y, x) ^ coeffBuffer[deg]!;
      }
      y = gfMul(y, x) ^ secretByte;

      shares[shareIdx]!.value[byteIdx] = y;
    }
  }

  zeroize(coeffBuffer);

  // Compute commitments for each share
  for (const share of shares) {
    share.commitment = computeShareCommitment(
      vaultId,
      share.index,
      threshold,
      totalShares,
      share.value
    );
  }

  return shares;
}

/**
 * Reconstructs the master secret from at least threshold valid shares using Lagrange interpolation.
 * Strictly verifies the BLAKE2b commitment of every share before reconstruction.
 */
export async function reconstructSecret(
  shares: ShamirShare[],
  vaultId: string
): Promise<Uint8Array> {
  if (!shares || shares.length === 0) {
    throw new Error('No shares provided for reconstruction');
  }

  const first = shares[0]!;
  const threshold = first.threshold;
  const secretLen = first.value.length;

  // Validate duplicate indices and uniform threshold
  const seenIndices = new Set<number>();
  for (const share of shares) {
    if (share.index < 1 || share.index > 255) {
      throw new ShareIntegrityError(`Invalid share index: ${share.index}`);
    }
    if (seenIndices.has(share.index)) {
      throw new ShareIntegrityError(`Duplicate share index detected: ${share.index}`);
    }
    seenIndices.add(share.index);

    if (share.threshold !== threshold) {
      throw new ShareIntegrityError('Mismatched share thresholds across provided shares');
    }
    if (share.value.length !== secretLen) {
      throw new ShareIntegrityError('Mismatched share value lengths');
    }

    // Verify cryptographic commitment
    const isValid = await verifyShareCommitment(share, vaultId);
    if (!isValid) {
      throw new ShareIntegrityError(
        `Share commitment verification failed for share index ${share.index}: share is corrupted or belongs to a different vault`
      );
    }
  }

  if (shares.length < threshold) {
    throw new InsufficientSharesError(
      `Insufficient shares: need at least ${threshold} valid shares, but only got ${shares.length}`
    );
  }

  // Use the first `threshold` shares for Lagrange interpolation
  const activeShares = shares.slice(0, threshold);
  const reconstructed = new Uint8Array(secretLen);

  // Precompute Lagrange basis polynomials at x=0 for each share:
  // l_i(0) = \prod_{j \ne i} (x_j / (x_i \oplus x_j))
  const lagrangeWeights = new Uint8Array(threshold);
  for (let i = 0; i < threshold; i++) {
    let num = 1;
    let den = 1;
    const xi = activeShares[i]!.index;

    for (let j = 0; j < threshold; j++) {
      if (i === j) continue;
      const xj = activeShares[j]!.index;
      num = gfMul(num, xj);
      den = gfMul(den, xi ^ xj);
    }

    lagrangeWeights[i] = gfDiv(num, den);
  }

  // Reconstruct byte-by-byte: secret[b] = \bigoplus_{i=0}^{t-1} (y_i[b] * l_i(0))
  for (let byteIdx = 0; byteIdx < secretLen; byteIdx++) {
    let secretByte = 0;
    for (let i = 0; i < threshold; i++) {
      const yi = activeShares[i]!.value[byteIdx]!;
      secretByte ^= gfMul(yi, lagrangeWeights[i]!);
    }
    reconstructed[byteIdx] = secretByte;
  }

  return reconstructed;
}

/**
 * Encodes a ShamirShare into an armored hex string for safe storage or QR codes.
 */
export function serializeShare(share: ShamirShare): string {
  const hexVal = Buffer.from(share.value).toString('hex');
  const hexCom = Buffer.from(share.commitment).toString('hex');
  return `cip:v1:${share.index}:${share.threshold}:${share.totalShares}:${hexVal}:${hexCom}`;
}

/**
 * Parses an armored share string back into a ShamirShare object.
 */
export function deserializeShare(serialized: string): ShamirShare {
  const parts = serialized.trim().split(':');
  if (parts.length !== 7 || parts[0] !== 'cip' || parts[1] !== 'v1') {
    throw new ShareIntegrityError('Invalid serialized share format: expected cip:v1:... format');
  }

  const index = parseInt(parts[2]!, 10);
  const threshold = parseInt(parts[3]!, 10);
  const totalShares = parseInt(parts[4]!, 10);
  const hexVal = parts[5]!;
  const hexCom = parts[6]!;

  if (isNaN(index) || isNaN(threshold) || isNaN(totalShares)) {
    throw new ShareIntegrityError('Malformed share numeric fields');
  }

  const value = new Uint8Array(Buffer.from(hexVal, 'hex'));
  const commitment = new Uint8Array(Buffer.from(hexCom, 'hex'));

  return {
    index,
    threshold,
    totalShares,
    value,
    commitment
  };
}

