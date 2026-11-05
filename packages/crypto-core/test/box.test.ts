import { describe, it, expect } from 'vitest';
import {
  generateBoxKeyPair,
  deriveBoxKeyPairFromPrivate,
  sealBox,
  openSealedBox,
  SealedBoxAuthError,
  BOX_PUBLIC_KEY_BYTES,
  BOX_PRIVATE_KEY_BYTES
} from '../src/index.js';

describe('X25519 Sealed Box', () => {
  it('generates and derives 32-byte public and private keys deterministically', async () => {
    const kp = await generateBoxKeyPair();
    expect(kp.publicKey.length).toBe(BOX_PUBLIC_KEY_BYTES);
    expect(kp.privateKey.length).toBe(BOX_PRIVATE_KEY_BYTES);

    const derived = await deriveBoxKeyPairFromPrivate(kp.privateKey);
    expect(derived.publicKey).toEqual(kp.publicKey);
    expect(derived.privateKey).toEqual(kp.privateKey);

    await expect(deriveBoxKeyPairFromPrivate(new Uint8Array(16))).rejects.toThrow('Invalid private key length');
  });

  it('seals and opens plaintext successfully', async () => {
    const recipient = await generateBoxKeyPair();
    const message = new TextEncoder().encode('Confidential heir share threshold piece');

    const ciphertext = await sealBox(recipient.publicKey, message);
    expect(ciphertext.length).toBe(message.length + 48); // 32 bytes ephemeral pubkey + 16 bytes auth tag

    const decrypted = await openSealedBox(recipient.publicKey, recipient.privateKey, ciphertext);
    expect(new TextDecoder().decode(decrypted)).toBe('Confidential heir share threshold piece');
  });

  it('fails closed when wrong private key is used', async () => {
    const recipientA = await generateBoxKeyPair();
    const recipientB = await generateBoxKeyPair();
    const message = new TextEncoder().encode('Top secret payload');

    const ciphertext = await sealBox(recipientA.publicKey, message);

    await expect(
      openSealedBox(recipientB.publicKey, recipientB.privateKey, ciphertext)
    ).rejects.toThrow(SealedBoxAuthError);
  });

  it('fails closed when ciphertext is corrupted', async () => {
    const recipient = await generateBoxKeyPair();
    const message = new TextEncoder().encode('Payload');

    const ciphertext = await sealBox(recipient.publicKey, message);
    ciphertext[0]! ^= 0xff; // Corrupt first byte

    await expect(
      openSealedBox(recipient.publicKey, recipient.privateKey, ciphertext)
    ).rejects.toThrow(SealedBoxAuthError);
  });

  it('rejects invalid key lengths', async () => {
    const shortKey = new Uint8Array(16);
    const validKey = new Uint8Array(32);
    const data = new Uint8Array(10);

    await expect(sealBox(shortKey, data)).rejects.toThrow('Invalid public key length');
    await expect(openSealedBox(shortKey, validKey, data)).rejects.toThrow(
      'Invalid public key length'
    );
    await expect(openSealedBox(validKey, shortKey, data)).rejects.toThrow(
      'Invalid private key length'
    );
  });
});

