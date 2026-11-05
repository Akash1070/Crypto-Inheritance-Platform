import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createCli } from '../src/index.js';
import { generateBoxKeyPair } from '@cip/crypto-core';

describe('CLI End-to-End Offline Workflow', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cip-cli-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('executes full offline lifecycle: init-vault -> split-key -> seal-share -> heir-kit -> recover', async () => {
    const cli = createCli();

    // 1. Prepare raw estate secret
    const secretContent = 'BIP-39 Mnemonic: abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const payloadFile = path.join(tmpDir, 'raw-estate.txt');
    await fs.writeFile(payloadFile, secretContent, 'utf-8');

    const vaultPackageFile = path.join(tmpDir, 'vault-package.json');
    const vaultKeyFile = path.join(tmpDir, 'vault.key');
    const vaultId = '4f8d2e1a-9b3c-4d5e-8f7a-1b2c3d4e5f6a';

    // 2. Init Vault
    await cli.parseAsync([
      'node',
      'cip',
      'init-vault',
      '--input',
      payloadFile,
      '--out-vault',
      vaultPackageFile,
      '--out-key',
      vaultKeyFile,
      '--vault-id',
      vaultId
    ]);

    const packageExists = await fs.stat(vaultPackageFile);
    expect(packageExists.isFile()).toBe(true);

    const packageJson = JSON.parse(await fs.readFile(vaultPackageFile, 'utf-8'));
    expect(packageJson.vaultId).toBe(vaultId);
    expect(packageJson.magic).toBe('CIP_VAULT');

    // 3. Split Key into 2-of-2 shares
    const sharesDir = path.join(tmpDir, 'shares');
    await cli.parseAsync([
      'node',
      'cip',
      'split-key',
      '--key-file',
      vaultKeyFile,
      '--vault-id',
      vaultId,
      '--threshold',
      '2',
      '--total-shares',
      '2',
      '--out-dir',
      sharesDir
    ]);

    const heirShareFile = path.join(sharesDir, 'share-1-heir.txt');
    const escrowShareFile = path.join(sharesDir, 'share-2-escrow.txt');

    expect((await fs.stat(heirShareFile)).isFile()).toBe(true);
    expect((await fs.stat(escrowShareFile)).isFile()).toBe(true);

    // 4. Seal Escrow Share to recipient public key
    const enclaveKeyPair = await generateBoxKeyPair();
    const enclavePubHex = Buffer.from(enclaveKeyPair.publicKey).toString('hex');
    const sealedEscrowFile = path.join(tmpDir, 'sealed-escrow.hex');

    await cli.parseAsync([
      'node',
      'cip',
      'seal-share',
      '--share-file',
      escrowShareFile,
      '--recipient-pubkey',
      enclavePubHex,
      '--out',
      sealedEscrowFile
    ]);

    expect((await fs.stat(sealedEscrowFile)).isFile()).toBe(true);

    // 5. Generate Printable Heir Kit
    const heirKitHtmlFile = path.join(tmpDir, 'heir-kit.html');
    await cli.parseAsync([
      'node',
      'cip',
      'heir-kit',
      '--share-file',
      heirShareFile,
      '--vault-package-file',
      vaultPackageFile,
      '--heir-name',
      'Alice Doe',
      '--out-html',
      heirKitHtmlFile
    ]);

    const htmlContent = await fs.readFile(heirKitHtmlFile, 'utf-8');
    expect(htmlContent.includes('OFFLINE EMERGENCY HEIR KIT')).toBe(true);
    expect(htmlContent.includes('<svg')).toBe(true);
    expect(htmlContent.includes('Alice Doe')).toBe(true);

    // 6. Offline Recovery
    const recoveredFile = path.join(tmpDir, 'recovered-estate.txt');
    await cli.parseAsync([
      'node',
      'cip',
      'recover',
      '--vault-package',
      vaultPackageFile,
      '--shares',
      heirShareFile,
      escrowShareFile,
      '--out',
      recoveredFile
    ]);

    const recoveredContent = await fs.readFile(recoveredFile, 'utf-8');
    expect(recoveredContent).toBe(secretContent);
  });
});
