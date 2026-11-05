import fs from 'node:fs/promises';
import {
  deserializeShare,
  reconstructSecret,
  openVaultPackage,
  ShamirShare
} from '@cip/crypto-core';

export interface RecoverOptions {
  vaultPackage: string;
  shares: string[];
  out: string;
}

export async function recoverAction(options: RecoverOptions): Promise<void> {
  const packageContent = await fs.readFile(options.vaultPackage, 'utf-8');
  const envelope = JSON.parse(packageContent);
  const vaultId = envelope.vaultId;

  if (!vaultId) {
    throw new Error('Vault package is missing valid vaultId field');
  }

  const parsedShares: ShamirShare[] = [];

  for (const sharePathOrStr of options.shares) {
    let raw = sharePathOrStr;
    try {
      raw = await fs.readFile(sharePathOrStr, 'utf-8');
    } catch {
      // If not a valid file path, treat as raw share string
    }

    const shareLine = raw.split('\n').find((l) => l.trim().startsWith('cip:v1:'));
    if (!shareLine) {
      throw new Error(`Could not parse share from: ${sharePathOrStr}`);
    }

    parsedShares.push(deserializeShare(shareLine.trim()));
  }

  console.log(` Loaded ${parsedShares.length} share(s). Verifying BLAKE2b integrity commitments...`);

  // Reconstruct Vault Key (VK)
  const vaultKey = await reconstructSecret(parsedShares, vaultId);
  console.log(' Vault Key successfully reconstructed via Lagrange interpolation.');

  // Decrypt vault package
  console.log(' Decrypting estate package with XChaCha20-Poly1305...');
  const decryptedPayload = await openVaultPackage(vaultKey, envelope);

  // Write recovered estate payload to disk
  await fs.writeFile(options.out, decryptedPayload);

  console.log(` Estate successfully recovered and written to: ${options.out}`);
  console.log(' IMPORTANT: Move recovered funds to a fresh wallet immediately.');
}

