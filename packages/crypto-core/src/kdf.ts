import { ensureSodium } from './init.js';

export const KDF_SALT_BYTES = 16;
export const MIN_KDF_MEMORY_BYTES = 32 * 1024 * 1024; // 32 MiB hard floor
export const DEFAULT_KDF_MEMORY_BYTES = 64 * 1024 * 1024; // 64 MiB default
export const MIN_KDF_OPSLIMIT = 3;
export const DEFAULT_KDF_OPSLIMIT = 4;
export const DEFAULT_DERIVED_KEY_BYTES = 32;

export interface KdfParams {
  memoryBytes?: number;
  opslimit?: number;
  outputLength?: number;
}

/**
 * Generates a fresh 128-bit cryptographically secure random salt for Argon2id.
 */
export async function generateKdfSalt(): Promise<Uint8Array> {
  const sodium = await ensureSodium();
  return sodium.randombytes_buf(KDF_SALT_BYTES);
}

/**
 * Derives a cryptographic key using Argon2id with strict parameter validation.
 * Rejects parameters that fall below security minimums.
 */
export async function deriveKeyArgon2id(
  passphrase: string | Uint8Array,
  salt: Uint8Array,
  params: KdfParams = {}
): Promise<Uint8Array> {
  const sodium = await ensureSodium();

  if (salt.length !== KDF_SALT_BYTES) {
    throw new Error(`Invalid salt length: expected ${KDF_SALT_BYTES} bytes, got ${salt.length}`);
  }

  const memoryBytes = params.memoryBytes ?? DEFAULT_KDF_MEMORY_BYTES;
  const opslimit = params.opslimit ?? DEFAULT_KDF_OPSLIMIT;
  const outputLength = params.outputLength ?? DEFAULT_DERIVED_KEY_BYTES;

  if (memoryBytes < MIN_KDF_MEMORY_BYTES) {
    throw new Error(
      `Insecure KDF parameters: memoryBytes ${memoryBytes} is below required minimum of ${MIN_KDF_MEMORY_BYTES} bytes (32 MiB)`
    );
  }
  if (opslimit < MIN_KDF_OPSLIMIT) {
    throw new Error(
      `Insecure KDF parameters: opslimit ${opslimit} is below required minimum of ${MIN_KDF_OPSLIMIT}`
    );
  }

  const pwBytes = typeof passphrase === 'string' ? sodium.from_string(passphrase) : passphrase;

  return sodium.crypto_pwhash(
    outputLength,
    pwBytes,
    salt,
    opslimit,
    memoryBytes,
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );
}

