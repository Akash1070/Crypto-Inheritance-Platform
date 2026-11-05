/**
 * @cip/crypto-core
 * The isolated cryptographic core of Crypto Inheritance Platform.
 * 
 * Invariants:
 * 1. Zero network syscalls.
 * 2. Constant-time operations for secret comparisons.
 * 3. Memory buffers explicitly zeroized where feasible.
 */

export const CIP_CRYPTO_VERSION = "0.1.0";
export const CIP_SUITE_ID = 0x0001; // XChaCha20-Poly1305 + Argon2id + Shamir-Commitment

