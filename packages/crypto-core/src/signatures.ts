import { blake2b } from '@noble/hashes/blake2b';
import { ensureSodium } from './init.js';

export const SIGN_PUBLIC_KEY_BYTES = 32;
export const SIGN_PRIVATE_KEY_BYTES = 64;

export interface SigningKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generates an Ed25519 digital signature keypair.
 */
export async function generateSigningKeyPair(): Promise<SigningKeyPair> {
  const sodium = await ensureSodium();
  const kp = sodium.crypto_sign_keypair();
  return {
    publicKey: kp.publicKey,
    privateKey: kp.privateKey
  };
}

/**
 * Derives an Ed25519 signing keypair from either a 32-byte seed or a 64-byte private key.
 */
export async function deriveSigningKeyPairFromPrivate(privateKey: Uint8Array): Promise<SigningKeyPair> {
  const sodium = await ensureSodium();
  if (privateKey.length === 32) {
    const kp = sodium.crypto_sign_seed_keypair(privateKey);
    return {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey
    };
  }
  if (privateKey.length === SIGN_PRIVATE_KEY_BYTES) {
    const publicKey = sodium.crypto_sign_ed25519_sk_to_pk(privateKey);
    return {
      publicKey,
      privateKey
    };
  }
  throw new Error(`Invalid private key length: expected 32 or ${SIGN_PRIVATE_KEY_BYTES} bytes, got ${privateKey.length}`);
}

/**
 * Signs a 32-byte hash using an Ed25519 private key.
 */
export async function signHash(
  hashBytes: Uint8Array,
  privateKey: Uint8Array
): Promise<Uint8Array> {
  const sodium = await ensureSodium();
  if (privateKey.length !== SIGN_PRIVATE_KEY_BYTES) {
    throw new Error(`Invalid private key length: expected ${SIGN_PRIVATE_KEY_BYTES} bytes, got ${privateKey.length}`);
  }
  return sodium.crypto_sign_detached(hashBytes, privateKey);
}

/**
 * Verifies an Ed25519 detached signature against a hash and public key.
 */
export async function verifySignature(
  signature: Uint8Array,
  hashBytes: Uint8Array,
  publicKey: Uint8Array
): Promise<boolean> {
  const sodium = await ensureSodium();
  if (publicKey.length !== SIGN_PUBLIC_KEY_BYTES) {
    throw new Error(`Invalid public key length: expected ${SIGN_PUBLIC_KEY_BYTES} bytes, got ${publicKey.length}`);
  }
  return sodium.crypto_sign_verify_detached(signature, hashBytes, publicKey);
}

/**
 * Computes a deterministic cryptographic BLAKE2b Merkle event hash for state machine chaining.
 */
export function computeEventHash(
  sequence: number,
  type: string,
  payloadHash: string,
  prevHash: string,
  timestamp: string
): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`cip-event:${sequence}:${type}:${payloadHash}:${prevHash}:${timestamp}`);
  const hashBytes = blake2b(data, { dkLen: 32 });
  return Buffer.from(hashBytes).toString('hex');
}

/**
 * Computes a blind HMAC index for PII (e.g. emails) to permit indexed database lookups
 * without storing or exposing plaintext emails.
 */
export function computeBlindIndex(value: string, secretSalt: string): string {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const key = encoder.encode(secretSalt);
  const data = encoder.encode(normalized);
  const hash = blake2b(data, { key, dkLen: 32 });
  return Buffer.from(hash).toString('hex');
}

