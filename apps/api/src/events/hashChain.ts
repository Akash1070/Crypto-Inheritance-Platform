import {
  computeEventHash,
  signHash,
  verifySignature,
  sha256Hex,
  SigningKeyPair
} from '@cip/crypto-core';

export interface AuditEventRecord {
  id: string;
  vaultId: string;
  sequence: number;
  type: string;
  payloadHash: string;
  prevHash: string;
  signature: string;
  createdAt: Date;
}

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class VaultEventChainManager {
  private eventsByVault = new Map<string, AuditEventRecord[]>();

  clear(): void {
    this.eventsByVault.clear();
  }

  async getEvents(vaultId: string): Promise<AuditEventRecord[]> {
    const list = this.eventsByVault.get(vaultId) || [];
    return [...list].sort((a, b) => a.sequence - b.sequence);
  }

  async appendEvent(
    vaultId: string,
    type: string,
    payload: Record<string, unknown>,
    signingKey: SigningKeyPair
  ): Promise<AuditEventRecord> {
    const existing = await this.getEvents(vaultId);
    const sequence = existing.length;

    const prevHash = sequence === 0 ? GENESIS_PREV_HASH : existing[sequence - 1]!.payloadHash;
    const createdAt = new Date();
    const timestampStr = createdAt.toISOString();

    // Payload hash
    const payloadStr = JSON.stringify(payload);
    const payloadHash = await sha256Hex(payloadStr);

    // Compute deterministic Merkle event hash
    const eventHashHex = computeEventHash(sequence, type, payloadHash, prevHash, timestampStr);
    const eventHashBytes = Buffer.from(eventHashHex, 'hex');

    // Cryptographically sign with enclave/server private key
    const signatureBytes = await signHash(eventHashBytes, signingKey.privateKey);
    const signature = Buffer.from(signatureBytes).toString('hex');

    const record: AuditEventRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId,
      sequence,
      type,
      payloadHash,
      prevHash,
      signature,
      createdAt
    };

    existing.push(record);
    this.eventsByVault.set(vaultId, existing);
    return record;
  }

  async verifyEventChain(
    vaultId: string,
    serverPublicKey: Uint8Array
  ): Promise<{ valid: boolean; error?: string; headSequence?: number }> {
    const chain = await this.getEvents(vaultId);
    if (chain.length === 0) {
      return { valid: true, headSequence: -1 };
    }

    for (let i = 0; i < chain.length; i++) {
      const event = chain[i]!;

      // 1. Monotonic sequence check
      if (event.sequence !== i) {
        return {
          valid: false,
          error: `Sequence discontinuity at index ${i}: expected sequence ${i}, got ${event.sequence}`
        };
      }

      // 2. Hash chaining linkage check
      const expectedPrev = i === 0 ? GENESIS_PREV_HASH : chain[i - 1]!.payloadHash;
      if (event.prevHash !== expectedPrev) {
        return {
          valid: false,
          error: `Hash chain broken at sequence ${i}: expected prevHash ${expectedPrev}, got ${event.prevHash}`
        };
      }

      // 3. Cryptographic signature check
      const expectedEventHash = computeEventHash(
        event.sequence,
        event.type,
        event.payloadHash,
        event.prevHash,
        event.createdAt.toISOString()
      );
      const hashBytes = Buffer.from(expectedEventHash, 'hex');
      const sigBytes = Buffer.from(event.signature, 'hex');

      const isSigValid = await verifySignature(sigBytes, hashBytes, serverPublicKey);
      if (!isSigValid) {
        return {
          valid: false,
          error: `Cryptographic signature forgery or tamper detected at sequence ${i}`
        };
      }
    }

    return { valid: true, headSequence: chain.length - 1 };
  }
}

export const eventChainManager = new VaultEventChainManager();
