import { describe, it, expect } from 'vitest';
import {
  createVaultPackage,
  openVaultPackage,
  CIP_VAULT_MAGIC,
  CIP_FORMAT_VERSION,
  CIP_SUITE_ID,
  ensureSodium,
  CryptoAuthError
} from '../src/index.js';

describe('Vault Envelope Packaging', () => {
  const testVaultId = 'e2b3c4d5-6789-4abc-def0-123456789abc';

  it('creates and opens an encrypted vault package successfully', async () => {
    const sodium = await ensureSodium();
    const vaultKey = sodium.randombytes_buf(32);
    const payload = new TextEncoder().encode('JSON with hardware wallet recovery instructions');
    const metadata = { ownerName: 'Alice', hardwareWallet: 'Ledger Nano X' };

    const { packageJson, envelope } = await createVaultPackage(
      testVaultId,
      vaultKey,
      payload,
      metadata
    );

    expect(envelope.magic).toBe(CIP_VAULT_MAGIC);
    expect(envelope.formatVersion).toBe(CIP_FORMAT_VERSION);
    expect(envelope.suiteId).toBe(CIP_SUITE_ID);
    expect(envelope.vaultId).toBe(testVaultId);

    // Open using parsed envelope object
    const decrypted1 = await openVaultPackage(vaultKey, envelope);
    expect(new TextDecoder().decode(decrypted1)).toBe(
      'JSON with hardware wallet recovery instructions'
    );

    // Open using raw JSON string
    const decrypted2 = await openVaultPackage(vaultKey, packageJson);
    expect(new TextDecoder().decode(decrypted2)).toBe(
      'JSON with hardware wallet recovery instructions'
    );
  });

  it('fails closed when wrong vault key is used', async () => {
    const sodium = await ensureSodium();
    const vaultKeyA = sodium.randombytes_buf(32);
    const vaultKeyB = sodium.randombytes_buf(32);
    const payload = new TextEncoder().encode('Confidential payload');

    const { envelope } = await createVaultPackage(testVaultId, vaultKeyA, payload);

    await expect(openVaultPackage(vaultKeyB, envelope)).rejects.toThrow(CryptoAuthError);
  });

  it('fails closed if metadata hash is modified in envelope', async () => {
    const sodium = await ensureSodium();
    const vaultKey = sodium.randombytes_buf(32);
    const payload = new TextEncoder().encode('Payload');

    const { envelope } = await createVaultPackage(testVaultId, vaultKey, payload);
    envelope.metadataHash = '0000000000000000000000000000000000000000000000000000000000000000';

    await expect(openVaultPackage(vaultKey, envelope)).rejects.toThrow(CryptoAuthError);
  });

  it('rejects unsupported headers, versions, and suites', async () => {
    const sodium = await ensureSodium();
    const vaultKey = sodium.randombytes_buf(32);
    const payload = new TextEncoder().encode('Test');

    const { envelope } = await createVaultPackage(testVaultId, vaultKey, payload);

    const badMagic = { ...envelope, magic: 'FAKE_VAULT' as any };
    await expect(openVaultPackage(vaultKey, badMagic)).rejects.toThrow('Invalid vault magic');

    const badVersion = { ...envelope, formatVersion: 99 as any };
    await expect(openVaultPackage(vaultKey, badVersion)).rejects.toThrow('Unsupported format version');

    const badSuite = { ...envelope, suiteId: 0x9999 as any };
    await expect(openVaultPackage(vaultKey, badSuite)).rejects.toThrow('Unsupported cipher suite');
  });
});

