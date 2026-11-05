import { ensureSodium } from './init.js';

export const AEAD_KEY_BYTES = 32;
export const AEAD_NONCE_BYTES = 24;

export class CryptoAuthError extends Error {
  constructor(message: string = 'AEAD authentication tag mismatch or invalid associated data') {
    super(message);
    this.name = 'CryptoAuthError';
  }
}

export interface EncryptedAeadResult {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

/**
 * Encrypts plaintext using XChaCha20-Poly1305 with authenticated associated data.
 * Generates a fresh 192-bit (24-byte) random nonce from OS CSPRNG.
 */
export async function encryptAead(
  key: Uint8Array,
  plaintext: Uint8Array,
  associatedData: Uint8Array
): Promise<EncryptedAeadResult> {
  const sodium = await ensureSodium();

  if (key.length !== AEAD_KEY_BYTES) {
    throw new Error(`Invalid key length: expected ${AEAD_KEY_BYTES} bytes, got ${key.length}`);
  }
  if (!associatedData || associatedData.length === 0) {
    throw new Error('Associated data (AD) must be non-empty to prevent context-substitution attacks');
  }

  const nonce = sodium.randombytes_buf(AEAD_NONCE_BYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData,
    null,
    nonce,
    key
  );

  return { nonce, ciphertext };
}

/**
 * Decrypts and authenticates ciphertext using XChaCha20-Poly1305.
 * Fails closed if the authentication tag or associated data does not match.
 */
export async function decryptAead(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  associatedData: Uint8Array
): Promise<Uint8Array> {
  const sodium = await ensureSodium();

  if (key.length !== AEAD_KEY_BYTES) {
    throw new Error(`Invalid key length: expected ${AEAD_KEY_BYTES} bytes, got ${key.length}`);
  }
  if (nonce.length !== AEAD_NONCE_BYTES) {
    throw new Error(`Invalid nonce length: expected ${AEAD_NONCE_BYTES} bytes, got ${nonce.length}`);
  }
  if (!associatedData || associatedData.length === 0) {
    throw new Error('Associated data (AD) must be non-empty');
  }

  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      ciphertext,
      associatedData,
      nonce,
      key
    );
  } catch {
    throw new CryptoAuthError();
  }
}

