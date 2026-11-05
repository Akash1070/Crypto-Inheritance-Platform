import pg from 'pg';
import {
  computeEventHash,
  signHash,
  verifySignature,
  sha256Hex
} from '@cip/crypto-core';
import type { SigningKeyPair } from '@cip/crypto-core';

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

function mapRow(row: {
  id: string;
  vault_id: string;
  sequence: number;
  type: string;
  payload_hash: string;
  prev_hash: string;
  signature: string;
  created_at: Date | string;
}): AuditEventRecord {
  return {
    id: row.id,
    vaultId: row.vault_id,
    sequence: row.sequence,
    type: row.type,
    payloadHash: row.payload_hash,
    prevHash: row.prev_hash,
    signature: row.signature,
    createdAt: new Date(row.created_at)
  };
}

export class MemoryEventChainManager {
  private eventsByVault = new Map<string, AuditEventRecord[]>();

  clear(): void {
    this.eventsByVault.clear();
  }

  async getEvents(
    vaultId: string,
    options?: { limit?: number; beforeSequence?: number }
  ): Promise<AuditEventRecord[]> {
    let list = this.eventsByVault.get(vaultId) || [];
    list = [...list].sort((a, b) => a.sequence - b.sequence);
    if (options?.beforeSequence !== undefined) {
      list = list.filter((e) => e.sequence < options.beforeSequence!);
    }
    if (options?.limit !== undefined) {
      list = list.slice(-options.limit);
    }
    return list;
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

    const payloadStr = JSON.stringify(payload);
    const payloadHash = await sha256Hex(payloadStr);

    const eventHashHex = computeEventHash(sequence, type, payloadHash, prevHash, timestampStr);
    const eventHashBytes = Buffer.from(eventHashHex, 'hex');
    const signatureBytes = await signHash(eventHashBytes, signingKey.privateKey);

    const record: AuditEventRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId,
      sequence,
      type,
      payloadHash,
      prevHash,
      signature: Buffer.from(signatureBytes).toString('hex'),
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

    return verifyChain(chain, serverPublicKey);
  }
}

export class PgEventChainStore {
  constructor(private pool: pg.Pool) {}

  async getEvents(
    vaultId: string,
    options?: { limit?: number; beforeSequence?: number }
  ): Promise<AuditEventRecord[]> {
    const params: unknown[] = [vaultId];
    let sql = `
      SELECT id, vault_id, sequence, type, payload_hash, prev_hash, signature, created_at
      FROM events
      WHERE vault_id = $1
    `;
    if (options?.beforeSequence !== undefined) {
      params.push(options.beforeSequence);
      sql += ` AND sequence < $${params.length}`;
    }
    sql += ' ORDER BY sequence ASC';
    if (options?.limit !== undefined) {
      params.push(options.limit);
      sql += ` LIMIT $${params.length}`;
    }
    const res = await this.pool.query(sql, params);
    return res.rows.map(mapRow);
  }

  async appendEvent(
    vaultId: string,
    type: string,
    payload: Record<string, unknown>,
    signingKey: SigningKeyPair
  ): Promise<AuditEventRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['cip-evt:' + vaultId]);

      const payloadHash = await sha256Hex(JSON.stringify(payload));
      const headRes = await client.query(
        'SELECT payload_hash AS h FROM events WHERE vault_id = $1 ORDER BY sequence DESC LIMIT 1',
        [vaultId]
      );
      const prevHash =
        headRes.rowCount && headRes.rowCount > 0
          ? (headRes.rows[0] as { h: string }).h
          : GENESIS_PREV_HASH;

      const seqRes = await client.query(
        'SELECT COALESCE(MAX(sequence), -1) + 1 AS s FROM events WHERE vault_id = $1',
        [vaultId]
      );
      const sequence = Number((seqRes.rows[0] as { s: string }).s);
      const timestampStr = new Date().toISOString();

      const eventHashHex = computeEventHash(sequence, type, payloadHash, prevHash, timestampStr);
      const signatureBytes = await signHash(Buffer.from(eventHashHex, 'hex'), signingKey.privateKey);

      const id = globalThis.crypto.randomUUID();
      await client.query(
        `INSERT INTO events (id, vault_id, sequence, type, payload_hash, prev_hash, signature, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [id, vaultId, sequence, type, payloadHash, prevHash, Buffer.from(signatureBytes).toString('hex')]
      );

      await client.query('COMMIT');
      return { id, vaultId, sequence, type, payloadHash, prevHash, signature: Buffer.from(signatureBytes).toString('hex'), createdAt: new Date() };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async verifyEventChain(
    vaultId: string,
    serverPublicKey: Uint8Array
  ): Promise<{ valid: boolean; error?: string; headSequence?: number }> {
    const chain = await this.getEvents(vaultId);
    if (chain.length === 0) {
      return { valid: true, headSequence: -1 };
    }
    return verifyChain(chain, serverPublicKey);
  }
}

async function verifyChain(
  chain: AuditEventRecord[],
  serverPublicKey: Uint8Array
): Promise<{ valid: boolean; error?: string; headSequence?: number }> {
  for (let i = 0; i < chain.length; i++) {
    const event = chain[i]!;

    if (event.sequence !== i) {
      return { valid: false, error: `Sequence discontinuity at index ${i}`, headSequence: i - 1 };
    }

    const expectedPrev = i === 0 ? GENESIS_PREV_HASH : chain[i - 1]!.payloadHash;
    if (event.prevHash !== expectedPrev) {
      return { valid: false, error: `Hash chain broken at sequence ${i}`, headSequence: i - 1 };
    }

    const expectedEventHash = computeEventHash(
      event.sequence,
      event.type,
      event.payloadHash,
      event.prevHash,
      event.createdAt.toISOString()
    );
    const isSigValid = await verifySignature(
      Buffer.from(event.signature, 'hex'),
      Buffer.from(expectedEventHash, 'hex'),
      serverPublicKey
    );
    if (!isSigValid) {
      return { valid: false, error: `signature forgery or tamper detected at sequence ${i}`, headSequence: i - 1 };
    }
  }
  return { valid: true, headSequence: chain.length - 1 };
}
