import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { ensureSodium, createVaultPackage } from '@cip/crypto-core';

export interface InitVaultOptions {
  input: string;
  outVault?: string;
  outKey?: string;
  vaultId?: string;
}

export async function initVaultAction(options: InitVaultOptions): Promise<void> {
  const sodium = await ensureSodium();
  const inputPath = options.input;
  const outVaultPath = options.outVault || 'vault-package.json';
  const outKeyPath = options.outKey || 'vault.key';
  const vaultId = options.vaultId || crypto.randomUUID();

  // Read input payload
  const payload = await fs.readFile(inputPath);
  if (payload.length === 0) {
    throw new Error('Input payload file is empty');
  }

  // Generate 256-bit Vault Key (VK) from OS CSPRNG
  const vaultKey = sodium.randombytes_buf(32);

  // Encrypt payload into versioned envelope
  const { packageJson } = await createVaultPackage(vaultId, vaultKey, payload, {
    createdOffline: true,
    cliVersion: '0.1.0'
  });

  // Write envelope to disk
  await fs.writeFile(outVaultPath, packageJson, 'utf-8');

  // Write VK hex
  await fs.writeFile(outKeyPath, Buffer.from(vaultKey).toString('hex'), 'utf-8');

  console.log(' Vault Created Successfully (Offline)');
  console.log(` Vault ID:          ${vaultId}`);
  console.log(` Encrypted Package: ${outVaultPath}`);
  console.log(` Vault Key (Cold):  ${outKeyPath}`);
  console.log(' Security Notice: Split this Vault Key immediately using "cip split-key" and delete vault.key.');
}

