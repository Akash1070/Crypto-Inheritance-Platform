import fs from 'node:fs/promises';
import { sealBox } from '@cip/crypto-core';

export interface SealShareOptions {
  shareFile: string;
  recipientPubkey: string;
  out: string;
}

export async function sealShareAction(options: SealShareOptions): Promise<void> {
  const content = await fs.readFile(options.shareFile, 'utf-8');
  // Find the serialized line starting with cip:v1:
  const line = content.split('\n').find((l) => l.trim().startsWith('cip:v1:'));
  if (!line) {
    throw new Error('Could not find serialized share (cip:v1:...) in input file');
  }

  const pubkeyHex = options.recipientPubkey.trim();
  const recipientPubkey = new Uint8Array(Buffer.from(pubkeyHex, 'hex'));
  if (recipientPubkey.length !== 32) {
    throw new Error(`Invalid recipient public key length: expected 32 bytes (64 hex chars), got ${recipientPubkey.length}`);
  }

  const shareBytes = new TextEncoder().encode(line.trim());
  const sealed = await sealBox(recipientPubkey, shareBytes);

  const sealedHex = Buffer.from(sealed).toString('hex');
  await fs.writeFile(options.out, sealedHex, 'utf-8');

  console.log(` Sealed share written to: ${options.out}`);
  console.log(' Sealed share can now be safely uploaded to the platform or sent to recipient.');
}

