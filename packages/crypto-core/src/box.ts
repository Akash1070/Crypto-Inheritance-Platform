import { ensureSodium } from './init.js';

export const BOX_PUBLIC_KEY_BYTES = 32;
export const BOX_PRIVATE_KEY_BYTES = 32;

export interface BoxKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export class SealedBoxAuthError extends Error {
  constructor(message: string = 'Sealed box decryption failed: corrupted ciphertext or incorrect recipient key') {
    super(message);
    this.name = 'SealedBoxAuthError';
  }
}

/**
 * Generates an X25519 keypair for sealed box public-key encryption.
 */
export async function generateBoxKeyPair(): Promise<BoxKeyPair> {
  const sodium = await ensureSodium();
  const kp = sodium.crypto_box_keypair();
  return {
    publicKey: kp.publicKey,
    privateKey: kp.privateKey
  };
}

/**
 * Encrypts plaintext to a recipient's X25519 public key using a sealed box.
 * Generates an ephemeral keypair internally; only the recipient can decrypt.
 */
export async function sealBox(
  recipientPublicKey: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const sodium = await ensureSodium();

  if (recipientPublicKey.length !== BOX_PUBLIC_KEY_BYTES) {
    throw new Error(
      `Invalid public key length: expected ${BOX_PUBLIC_KEY_BYTES} bytes, got ${recipientPublicKey.length}`
    );
  }

  return sodium.crypto_box_seal(plaintext, recipientPublicKey);
}

/**
 * Decrypts a sealed box ciphertext using the recipient's X25519 private and public keys.
 */
export async function openSealedBox(
  recipientPublicKey: Uint8Array,
  recipientPrivateKey: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  const sodium = await ensureSodium();

  if (recipientPublicKey.length !== BOX_PUBLIC_KEY_BYTES) {
    throw new Error(
      `Invalid public key length: expected ${BOX_PUBLIC_KEY_BYTES} bytes, got ${recipientPublicKey.length}`
    );
  }
  if (recipientPrivateKey.length !== BOX_PRIVATE_KEY_BYTES) {
    throw new Error(
      `Invalid private key length: expected ${BOX_PRIVATE_KEY_BYTES} bytes, got ${recipientPrivateKey.length}`
    );
  }

  try {
    return sodium.crypto_box_seal_open(ciphertext, recipientPublicKey, recipientPrivateKey);
  } catch {
    throw new SealedBoxAuthError();
  }
}

