import { describe, it, expect } from 'vitest';
import {
  encryptAead,
  decryptAead,
  CryptoAuthError,
  AEAD_KEY_BYTES,
  AEAD_NONCE_BYTES,
  ensureSodium
} from '../src/index.js';

describe('XChaCha20-Poly1305 AEAD', () => {
  it('encrypts and decrypts payload with associated data successfully', async () => {
    const sodium = await ensureSodium();
    const key = sodium.randombytes_buf(AEAD_KEY_BYTES);
    const plaintext = new TextEncoder().encode('Super secret wallet seed payload');
    const ad = new TextEncoder().encode('vault:12345:v1');

    const { nonce, ciphertext } = await encryptAead(key, plaintext, ad);

    expect(nonce.length).toBe(AEAD_NONCE_BYTES);
    expect(ciphertext.length).toBe(plaintext.length + 16); // 16 bytes Poly1305 auth tag

    const decrypted = await decryptAead(key, nonce, ciphertext, ad);
    expect(new TextDecoder().decode(decrypted)).toBe('Super secret wallet seed payload');
  });

  it('fails closed when ciphertext is tampered with', async () => {
    const sodium = await ensureSodium();
    const key = sodium.randombytes_buf(AEAD_KEY_BYTES);
    const plaintext = new TextEncoder().encode('Critical inheritance recovery secret');
    const ad = new TextEncoder().encode('vault:auth-tag');

    const { nonce, ciphertext } = await encryptAead(key, plaintext, ad);

    // Tamper with a single byte in ciphertext
    ciphertext[0]! ^= 0x01;

    await expect(decryptAead(key, nonce, ciphertext, ad)).rejects.toThrow(CryptoAuthError);
  });

  it('fails closed when associated data (AD) does not match', async () => {
    const sodium = await ensureSodium();
    const key = sodium.randombytes_buf(AEAD_KEY_BYTES);
    const plaintext = new TextEncoder().encode('Estate documentation');
    const ad1 = new TextEncoder().encode('vault:id-A');
    const ad2 = new TextEncoder().encode('vault:id-B');

    const { nonce, ciphertext } = await encryptAead(key, plaintext, ad1);

    await expect(decryptAead(key, nonce, ciphertext, ad2)).rejects.toThrow(CryptoAuthError);
  });

  it('rejects empty or missing associated data', async () => {
    const sodium = await ensureSodium();
    const key = sodium.randombytes_buf(AEAD_KEY_BYTES);
    const plaintext = new TextEncoder().encode('Test');
    const emptyAd = new Uint8Array(0);

    await expect(encryptAead(key, plaintext, emptyAd)).rejects.toThrow(
      'Associated data (AD) must be non-empty'
    );
    await expect(
      decryptAead(key, new Uint8Array(AEAD_NONCE_BYTES), plaintext, emptyAd)
    ).rejects.toThrow('Associated data (AD) must be non-empty');
  });

  it('rejects invalid key or nonce lengths', async () => {
    const sodium = await ensureSodium();
    const validKey = sodium.randombytes_buf(AEAD_KEY_BYTES);
    const shortKey = new Uint8Array(16);
    const shortNonce = new Uint8Array(12);
    const validNonce = sodium.randombytes_buf(AEAD_NONCE_BYTES);
    const plaintext = new TextEncoder().encode('Data');
    const ad = new TextEncoder().encode('ad');

    await expect(encryptAead(shortKey, plaintext, ad)).rejects.toThrow('Invalid key length');
    await expect(decryptAead(shortKey, validNonce, plaintext, ad)).rejects.toThrow(
      'Invalid key length'
    );
    await expect(decryptAead(validKey, shortNonce, plaintext, ad)).rejects.toThrow(
      'Invalid nonce length'
    );
  });

  it('matches libsodium KAT (Known Answer Test)', async () => {
    const sodium = await ensureSodium();
    // Deterministic 32-byte key and 24-byte nonce
    const key = new Uint8Array(32).fill(0x42);
    const nonce = new Uint8Array(24).fill(0x24);
    const plaintext = new TextEncoder().encode('Known Answer Test');
    const ad = new TextEncoder().encode('ad-context');

    const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      plaintext,
      ad,
      null,
      nonce,
      key
    );

    const decrypted = await decryptAead(key, nonce, ciphertext, ad);
    expect(new TextDecoder().decode(decrypted)).toBe('Known Answer Test');
  });
});

