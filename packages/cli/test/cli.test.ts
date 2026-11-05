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

  it('generates and verifies web bundle checksum manifest with strict tamper detection', async () => {
    const cli = createCli();

    // Setup mock dist directory
    const distDir = path.join(tmpDir, 'web-dist');
    const assetsDir = path.join(distDir, 'assets');
    await fs.mkdir(assetsDir, { recursive: true });

    const indexHtml = path.join(distDir, 'index.html');
    const mainJs = path.join(assetsDir, 'main.js');
    const stylesCss = path.join(assetsDir, 'styles.css');

    await fs.writeFile(indexHtml, '<!DOCTYPE html><html><body>Secure</body></html>', 'utf-8');
    await fs.writeFile(mainJs, 'console.log("CIP Web Loaded");', 'utf-8');
    await fs.writeFile(stylesCss, 'body { background: #000; }', 'utf-8');

    const manifestFile = path.join(distDir, 'checksums.json');

    // 1. Generate manifest
    await cli.parseAsync([
      'node',
      'cip',
      'verify-bundle',
      '--dir',
      distDir,
      '--manifest',
      manifestFile,
      '--generate'
    ]);

    expect((await fs.stat(manifestFile)).isFile()).toBe(true);
    const manifestJson = JSON.parse(await fs.readFile(manifestFile, 'utf-8'));
    expect(manifestJson['index.html']).toBeDefined();
    expect(manifestJson['assets/main.js']).toBeDefined();
    expect(manifestJson['assets/styles.css']).toBeDefined();
    expect(manifestJson['assets/main.js'].sha256Hex).toBeDefined();
    expect(manifestJson['assets/main.js'].sri.startsWith('sha256-')).toBe(true);

    // 2. Verify legitimate bundle passes cleanly
    await expect(
      cli.parseAsync([
        'node',
        'cip',
        'verify-bundle',
        '--dir',
        distDir,
        '--manifest',
        manifestFile
      ])
    ).resolves.not.toThrow();

    // 3. Detect tampered file
    await fs.writeFile(mainJs, 'console.log("MALICIOUS INJECTED CODE");', 'utf-8');
    await expect(
      cli.parseAsync([
        'node',
        'cip',
        'verify-bundle',
        '--dir',
        distDir,
        '--manifest',
        manifestFile
      ])
    ).rejects.toThrow(/tampering|verification failed/i);

    // Restore main.js
    await fs.writeFile(mainJs, 'console.log("CIP Web Loaded");', 'utf-8');

    // 4. Detect unexpected file injection
    const evilJs = path.join(assetsDir, 'backdoor.js');
    await fs.writeFile(evilJs, 'maliciousPayload();', 'utf-8');
    await expect(
      cli.parseAsync([
        'node',
        'cip',
        'verify-bundle',
        '--dir',
        distDir,
        '--manifest',
        manifestFile
      ])
    ).rejects.toThrow(/unexpected extraneous files/i);

    // Clean up evilJs
    await fs.unlink(evilJs);

    // 5. Detect missing file
    await fs.unlink(stylesCss);
    await expect(
      cli.parseAsync([
        'node',
        'cip',
        'verify-bundle',
        '--dir',
        distDir,
        '--manifest',
        manifestFile
      ])
    ).rejects.toThrow(/missing bundle files/i);
  });
});
