import { describe, it, expect } from 'vitest';
import {
  deriveKeyArgon2id,
  generateKdfSalt,
  KDF_SALT_BYTES,
  MIN_KDF_MEMORY_BYTES,
  MIN_KDF_OPSLIMIT
} from '../src/index.js';

describe('Argon2id KDF', () => {
  it('generates a fresh 16-byte salt', async () => {
    const salt1 = await generateKdfSalt();
    const salt2 = await generateKdfSalt();

    expect(salt1.length).toBe(KDF_SALT_BYTES);
    expect(salt2.length).toBe(KDF_SALT_BYTES);
    expect(salt1).not.toEqual(salt2);
  });

  it('derives a deterministic 256-bit key from passphrase and salt', async () => {
    const salt = new Uint8Array(KDF_SALT_BYTES).fill(0x07);
    const passphrase = 'correct horse battery staple';

    // Using minimum parameters for unit test speed
    const key1 = await deriveKeyArgon2id(passphrase, salt, {
      memoryBytes: MIN_KDF_MEMORY_BYTES,
      opslimit: MIN_KDF_OPSLIMIT
    });

    const key2 = await deriveKeyArgon2id(passphrase, salt, {
      memoryBytes: MIN_KDF_MEMORY_BYTES,
      opslimit: MIN_KDF_OPSLIMIT
    });

    expect(key1.length).toBe(32);
    expect(key1).toEqual(key2);

    // Passphrase as Uint8Array
    const key3 = await deriveKeyArgon2id(new TextEncoder().encode(passphrase), salt, {
      memoryBytes: MIN_KDF_MEMORY_BYTES,
      opslimit: MIN_KDF_OPSLIMIT
    });
    expect(key3).toEqual(key1);

    // Call without params to verify default parameters execution
    const keyDefault = await deriveKeyArgon2id(passphrase, salt);
    expect(keyDefault.length).toBe(32);
  });

  it('enforces memory hard floor (rejects < 32 MiB)', async () => {
    const salt = new Uint8Array(KDF_SALT_BYTES).fill(0x01);
    const lowMemory = 16 * 1024 * 1024; // 16 MiB

    await expect(
      deriveKeyArgon2id('password', salt, { memoryBytes: lowMemory, opslimit: 3 })
    ).rejects.toThrow('below required minimum');
  });

  it('enforces opslimit hard floor (rejects < 3)', async () => {
    const salt = new Uint8Array(KDF_SALT_BYTES).fill(0x01);

    await expect(
      deriveKeyArgon2id('password', salt, {
        memoryBytes: MIN_KDF_MEMORY_BYTES,
        opslimit: 2
      })
    ).rejects.toThrow('below required minimum of 3');
  });

  it('rejects invalid salt length', async () => {
    const shortSalt = new Uint8Array(8);

    await expect(deriveKeyArgon2id('password', shortSalt)).rejects.toThrow('Invalid salt length');
  });
});
