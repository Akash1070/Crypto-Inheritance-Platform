import { encryptAead, decryptAead } from './aead.js';
import { blake2b } from '@noble/hashes/blake2b';

export const CIP_VAULT_MAGIC = 'CIP_VAULT';
export const CIP_FORMAT_VERSION = 1;
export const CIP_SUITE_ID = 0x0001;

export interface EncryptedVaultPackage {
  magic: typeof CIP_VAULT_MAGIC;
  formatVersion: typeof CIP_FORMAT_VERSION;
  suiteId: typeof CIP_SUITE_ID;
  vaultId: string;
  createdAt: string;
  nonce: string; // base64
  ciphertext: string; // base64
  metadataHash: string; // hex
}

/**
 * Builds the canonical Associated Data (AD) buffer for a vault package.
 */
export function buildAssociatedData(
  vaultId: string,
  formatVersion: number,
  suiteId: number,
  metadataHash: string
): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(`${CIP_VAULT_MAGIC}:${formatVersion}:${suiteId}:${vaultId}:${metadataHash}`);
}

/**
 * Encrypts an estate payload into a versioned, authenticated vault package.
 */
export async function createVaultPackage(
  vaultId: string,
  vaultKey: Uint8Array,
  payload: Uint8Array,
  metadata: Record<string, unknown> = {}
): Promise<{ packageJson: string; envelope: EncryptedVaultPackage }> {
  const metadataString = JSON.stringify(metadata);
  const metadataHashBytes = blake2b(new TextEncoder().encode(metadataString), { dkLen: 32 });
  const metadataHash = Buffer.from(metadataHashBytes).toString('hex');

  const ad = buildAssociatedData(vaultId, CIP_FORMAT_VERSION, CIP_SUITE_ID, metadataHash);
  const { nonce, ciphertext } = await encryptAead(vaultKey, payload, ad);

  const envelope: EncryptedVaultPackage = {
    magic: CIP_VAULT_MAGIC,
    formatVersion: CIP_FORMAT_VERSION,
    suiteId: CIP_SUITE_ID,
    vaultId,
    createdAt: new Date().toISOString(),
    nonce: Buffer.from(nonce).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    metadataHash
  };

  return {
    packageJson: JSON.stringify(envelope, null, 2),
    envelope
  };
}

/**
 * Decrypts and authenticates a versioned vault package using the reconstructed Vault Key (VK).
 */
export async function openVaultPackage(
  vaultKey: Uint8Array,
  packageInput: string | EncryptedVaultPackage
): Promise<Uint8Array> {
  const envelope: EncryptedVaultPackage =
    typeof packageInput === 'string' ? JSON.parse(packageInput) : packageInput;

  if (envelope.magic !== CIP_VAULT_MAGIC) {
    throw new Error(`Invalid vault magic header: expected ${CIP_VAULT_MAGIC}`);
  }
  if (envelope.formatVersion !== CIP_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${envelope.formatVersion}`);
  }
  if (envelope.suiteId !== CIP_SUITE_ID) {
    throw new Error(`Unsupported cipher suite ID: 0x${Number(envelope.suiteId).toString(16)}`);
  }

  const nonce = new Uint8Array(Buffer.from(envelope.nonce, 'base64'));
  const ciphertext = new Uint8Array(Buffer.from(envelope.ciphertext, 'base64'));
  const ad = buildAssociatedData(
    envelope.vaultId,
    envelope.formatVersion,
    envelope.suiteId,
    envelope.metadataHash
  );

  return decryptAead(vaultKey, nonce, ciphertext, ad);
}
