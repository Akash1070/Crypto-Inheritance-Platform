import fs from 'node:fs/promises';
import path from 'node:path';
import { splitSecret, serializeShare } from '@cip/crypto-core';

export interface SplitKeyOptions {
  keyFile: string;
  vaultId: string;
  threshold?: string;
  totalShares?: string;
  outDir?: string;
}

export async function splitKeyAction(options: SplitKeyOptions): Promise<void> {
  const keyHex = (await fs.readFile(options.keyFile, 'utf-8')).trim();
  const vaultKey = new Uint8Array(Buffer.from(keyHex, 'hex'));

  if (vaultKey.length !== 32) {
    throw new Error(`Invalid Vault Key length: expected 32 bytes (64 hex chars), got ${vaultKey.length}`);
  }

  const threshold = parseInt(options.threshold || '2', 10);
  const totalShares = parseInt(options.totalShares || '2', 10);
  const outDir = options.outDir || './shares';

  await fs.mkdir(outDir, { recursive: true });

  const shares = await splitSecret(vaultKey, threshold, totalShares, options.vaultId);

  const roleLabels = ['heir', 'escrow', 'guardian'];

  for (let i = 0; i < shares.length; i++) {
    const share = shares[i]!;
    const serialized = serializeShare(share);
    const role = roleLabels[i] || `share-${share.index}`;
    const filename = path.join(outDir, `share-${share.index}-${role}.txt`);

    const fileContent = [
      '# Crypto Inheritance Platform - Verifiable Shamir Share',
      `# Vault ID:     ${options.vaultId}`,
      `# Share Index:  ${share.index} of ${totalShares} (Threshold: ${threshold})`,
      `# Role Target:  ${role.toUpperCase()}`,
      '',
      serialized,
      ''
    ].join('\n');

    await fs.writeFile(filename, fileContent, 'utf-8');
    console.log(` Created Share ${share.index}: ${filename}`);
  }

  console.log(`\n Successfully split Vault Key into ${totalShares} shares (Threshold: ${threshold}).`);
}

