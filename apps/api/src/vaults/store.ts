import pg from 'pg';
import { sha256Hex } from '@cip/crypto-core';
import { hasDatabase, getPool } from '../db/index.js';

export interface VaultRecord {
  id: string;
  ownerId: string;
  label: string;
  state: 'ACTIVE' | 'REMINDER_WINDOW' | 'PENDING' | 'CHALLENGE' | 'RELEASED' | 'PAUSED' | 'CANCELLED';
  checkinIntervalDays: number;
  gracePeriodDays: number;
  challengeWindowDays: number;
  lastCheckinAt: Date;
  challengeStartedAt?: Date | undefined;
  challengeExpiresAt?: Date | undefined;
  claimingHeirPubkey?: string | undefined;
  version: number;
  createdAt: Date;
}

export interface VaultBlobRecord {
  id: string;
  vaultId: string;
  version: number;
  ciphertextEnvelope: string;
  ciphertextSha256: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface HeirRecord {
  id: string;
  vaultId: string;
  label: string;
  heirPubkey: string;
  wrappedHeirShare: string;
  status: 'ACTIVE' | 'INVITED' | 'REVOKED';
  createdAt: Date;
}

export interface EscrowShareRecord {
  id: string;
  vaultId: string;
  sealedEscrowShare: string;
  keyVersion: number;
  createdAt: Date;
}

export interface VaultStore {
  createVault(ownerId: string, label: string, config: { checkinIntervalDays: number; gracePeriodDays: number; challengeWindowDays: number }, ciphertextEnvelope: string, sealedEscrowShare: string): Promise<{ vault: VaultRecord; blob: VaultBlobRecord }>;
  getVaultById(vaultId: string): Promise<VaultRecord | undefined>;
  getVaultsByOwner(ownerId: string): Promise<VaultRecord[]>;
  updateLastCheckin(vaultId: string): Promise<VaultRecord | undefined>;
  updateCiphertext(vaultId: string, ciphertextEnvelope: string): Promise<VaultBlobRecord>;
  getLatestBlob(vaultId: string): Promise<VaultBlobRecord | undefined>;
  pauseVault(vaultId: string): Promise<VaultRecord | undefined>;
  resumeVault(vaultId: string): Promise<VaultRecord | undefined>;
  updateVaultState(vaultId: string, state: VaultRecord['state']): Promise<VaultRecord | undefined>;
  addHeir(vaultId: string, label: string, heirPubkey: string, wrappedHeirShare: string): Promise<HeirRecord>;
  getHeirs(vaultId: string): Promise<HeirRecord[]>;
  getEscrowShare(vaultId: string): Promise<EscrowShareRecord | undefined>;
  initiateClaim(vaultId: string, heirPubkey: string): Promise<VaultRecord>;
  cancelClaim(vaultId: string): Promise<VaultRecord>;
  clear(): Promise<void>;
}

interface VaultDbRow {
  id: string;
  owner_id: string;
  label: string;
  state: string;
  checkin_interval_days: number;
  grace_period_days: number;
  challenge_window_days: number;
  last_checkin_at: Date | string;
  challenge_started_at: Date | string | null;
  challenge_expires_at: Date | string | null;
  claiming_heir_pubkey: string | null;
  version: number;
  created_at: Date | string;
}

function mapVault(row: VaultDbRow): VaultRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    label: row.label,
    state: row.state as VaultRecord['state'],
    checkinIntervalDays: row.checkin_interval_days,
    gracePeriodDays: row.grace_period_days,
    challengeWindowDays: row.challenge_window_days,
    lastCheckinAt: new Date(row.last_checkin_at),
    challengeStartedAt: row.challenge_started_at ? new Date(row.challenge_started_at) : undefined,
    challengeExpiresAt: row.challenge_expires_at ? new Date(row.challenge_expires_at) : undefined,
    claimingHeirPubkey: row.claiming_heir_pubkey ?? undefined,
    version: row.version,
    createdAt: new Date(row.created_at)
  };
}

function mapBlob(row: { id: string; vault_id: string; version: number; ciphertext_envelope: string; ciphertext_sha256: string; size_bytes: number; created_at: Date | string }): VaultBlobRecord {
  return {
    id: row.id,
    vaultId: row.vault_id,
    version: row.version,
    ciphertextEnvelope: row.ciphertext_envelope,
    ciphertextSha256: row.ciphertext_sha256,
    sizeBytes: row.size_bytes,
    createdAt: new Date(row.created_at)
  };
}

function mapHeir(row: { id: string; vault_id: string; label: string; heir_pubkey: string; wrapped_heir_share: string; status: string; created_at: Date | string }): HeirRecord {
  return {
    id: row.id,
    vaultId: row.vault_id,
    label: row.label,
    heirPubkey: row.heir_pubkey,
    wrappedHeirShare: row.wrapped_heir_share,
    status: row.status as HeirRecord['status'],
    createdAt: new Date(row.created_at)
  };
}

export class MemoryVaultStore implements VaultStore {
  private vaultsById = new Map<string, VaultRecord>();
  private blobsByVaultId = new Map<string, VaultBlobRecord[]>();
  private heirsByVaultId = new Map<string, HeirRecord[]>();
  private escrowSharesByVaultId = new Map<string, EscrowShareRecord>();

  async clear(): Promise<void> {
    this.vaultsById.clear();
    this.blobsByVaultId.clear();
    this.heirsByVaultId.clear();
    this.escrowSharesByVaultId.clear();
  }

  async createVault(ownerId: string, label: string, config: { checkinIntervalDays: number; gracePeriodDays: number; challengeWindowDays: number }, ciphertextEnvelope: string, sealedEscrowShare: string): Promise<{ vault: VaultRecord; blob: VaultBlobRecord }> {
    const id = globalThis.crypto.randomUUID();
    const now = new Date();
    const vault: VaultRecord = {
      id,
      ownerId,
      label,
      state: 'ACTIVE',
      checkinIntervalDays: config.checkinIntervalDays,
      gracePeriodDays: config.gracePeriodDays,
      challengeWindowDays: config.challengeWindowDays,
      lastCheckinAt: now,
      version: 1,
      createdAt: now
    };
    this.vaultsById.set(id, vault);

    const sha256 = await sha256Hex(ciphertextEnvelope);
    const blob: VaultBlobRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId: id,
      version: 1,
      ciphertextEnvelope,
      ciphertextSha256: sha256,
      sizeBytes: Buffer.byteLength(ciphertextEnvelope, 'utf-8'),
      createdAt: now
    };
    this.blobsByVaultId.set(id, [blob]);
    this.escrowSharesByVaultId.set(id, {
      id: globalThis.crypto.randomUUID(),
      vaultId: id,
      sealedEscrowShare,
      keyVersion: 1,
      createdAt: now
    });
    return { vault, blob };
  }

  async getVaultById(vaultId: string): Promise<VaultRecord | undefined> {
    return this.vaultsById.get(vaultId);
  }

  async getVaultsByOwner(ownerId: string): Promise<VaultRecord[]> {
    return Array.from(this.vaultsById.values()).filter((v) => v.ownerId === ownerId);
  }

  async updateLastCheckin(vaultId: string): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) return undefined;
    vault.lastCheckinAt = new Date();
    if (vault.state !== 'CHALLENGE') {
      vault.state = 'ACTIVE';
    }
    return vault;
  }

  async updateCiphertext(vaultId: string, ciphertextEnvelope: string): Promise<VaultBlobRecord> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) throw new Error('Vault not found');
    vault.version += 1;
    const now = new Date();
    const sha256 = await sha256Hex(ciphertextEnvelope);
    const blob: VaultBlobRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId,
      version: vault.version,
      ciphertextEnvelope,
      ciphertextSha256: sha256,
      sizeBytes: Buffer.byteLength(ciphertextEnvelope, 'utf-8'),
      createdAt: now
    };
    const blobs = this.blobsByVaultId.get(vaultId) || [];
    blobs.push(blob);
    this.blobsByVaultId.set(vaultId, blobs);
    return blob;
  }

  async getLatestBlob(vaultId: string): Promise<VaultBlobRecord | undefined> {
    const blobs = this.blobsByVaultId.get(vaultId) || [];
    if (blobs.length === 0) return undefined;
    return blobs[blobs.length - 1];
  }

  async pauseVault(vaultId: string): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault || vault.state === 'CHALLENGE' || vault.state === 'PAUSED' || vault.state === 'RELEASED' || vault.state === 'CANCELLED') return undefined;
    vault.state = 'PAUSED';
    return vault;
  }

  async resumeVault(vaultId: string): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault || vault.state !== 'PAUSED') return undefined;
    vault.state = 'ACTIVE';
    return vault;
  }

  async updateVaultState(vaultId: string, state: VaultRecord['state']): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) return undefined;
    if (state === 'ACTIVE' && vault.state === 'CHALLENGE') {
      throw new Error('VAULT_STATE_TRANSITION_FORBIDDEN');
    }
    vault.state = state;
    return vault;
  }

  async addHeir(vaultId: string, label: string, heirPubkey: string, wrappedHeirShare: string): Promise<HeirRecord> {
    const record: HeirRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId,
      label,
      heirPubkey,
      wrappedHeirShare,
      status: 'ACTIVE',
      createdAt: new Date()
    };
    const heirs = this.heirsByVaultId.get(vaultId) || [];
    heirs.push(record);
    this.heirsByVaultId.set(vaultId, heirs);
    return record;
  }

  async getHeirs(vaultId: string): Promise<HeirRecord[]> {
    return this.heirsByVaultId.get(vaultId) || [];
  }

  async getEscrowShare(vaultId: string): Promise<EscrowShareRecord | undefined> {
    return this.escrowSharesByVaultId.get(vaultId);
  }

  async initiateClaim(vaultId: string, heirPubkey: string): Promise<VaultRecord> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) throw new Error('VAULT_NOT_FOUND');
    if (vault.state !== 'PENDING') {
      throw new Error(`CLAIM_REJECTED: Vault is in ${vault.state} state, not PENDING.`);
    }
    const now = new Date();
    vault.state = 'CHALLENGE';
    vault.challengeStartedAt = now;
    vault.challengeExpiresAt = new Date(now.getTime() + vault.challengeWindowDays * 24 * 3600 * 1000);
    vault.claimingHeirPubkey = heirPubkey;
    return vault;
  }

  async cancelClaim(vaultId: string): Promise<VaultRecord> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) throw new Error('VAULT_NOT_FOUND');
    if (vault.state !== 'CHALLENGE') {
      throw new Error(`CANCEL_REJECTED: Vault is not in CHALLENGE state (current: ${vault.state})`);
    }
    const now = new Date();
    vault.state = 'ACTIVE';
    vault.lastCheckinAt = now;
    vault.challengeStartedAt = undefined;
    vault.challengeExpiresAt = undefined;
    vault.claimingHeirPubkey = undefined;
    return vault;
  }
}

export class PgVaultStore implements VaultStore {
  constructor(private pool: pg.Pool) {}

  async clear(): Promise<void> {
    await this.pool.query('TRUNCATE vaults, vault_blobs, heirs, escrow_shares, events CASCADE');
  }

  async createVault(ownerId: string, label: string, config: { checkinIntervalDays: number; gracePeriodDays: number; challengeWindowDays: number }, ciphertextEnvelope: string, sealedEscrowShare: string): Promise<{ vault: VaultRecord; blob: VaultBlobRecord }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const vaultRes = await client.query(
        `INSERT INTO vaults (owner_id, label, checkin_interval_days, grace_period_days, challenge_window_days)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [ownerId, label, config.checkinIntervalDays, config.gracePeriodDays, config.challengeWindowDays]
      );
      const vaultRow = vaultRes.rows[0] as VaultDbRow;
      const vault = mapVault(vaultRow);

      const sha256 = await sha256Hex(ciphertextEnvelope);
      const blobRes = await client.query(
        `INSERT INTO vault_blobs (vault_id, version, ciphertext_envelope, ciphertext_sha256, size_bytes)
         VALUES ($1, 1, $2, $3, $4) RETURNING *`,
        [vault.id, ciphertextEnvelope, sha256, Buffer.byteLength(ciphertextEnvelope, 'utf-8')]
      );
      await client.query(
        `INSERT INTO escrow_shares (vault_id, sealed_escrow_share, key_version)
         VALUES ($1, $2, 1)`,
        [vault.id, sealedEscrowShare]
      );
      await client.query('COMMIT');
      return { vault, blob: mapBlob(blobRes.rows[0] as never) };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getVaultById(vaultId: string): Promise<VaultRecord | undefined> {
    const res = await this.pool.query('SELECT * FROM vaults WHERE id = $1', [vaultId]);
    return res.rowCount ? mapVault(res.rows[0] as VaultDbRow) : undefined;
  }

  async getVaultsByOwner(ownerId: string): Promise<VaultRecord[]> {
    const res = await this.pool.query('SELECT * FROM vaults WHERE owner_id = $1 ORDER BY created_at', [ownerId]);
    return res.rows.map((r) => mapVault(r as VaultDbRow));
  }

  async updateLastCheckin(vaultId: string): Promise<VaultRecord | undefined> {
    const res = await this.pool.query(
      `UPDATE vaults
       SET last_checkin_at = now(),
           state = CASE WHEN state = 'CHALLENGE' THEN state ELSE 'ACTIVE' END
       WHERE id = $1
       RETURNING *`,
      [vaultId]
    );
    return res.rowCount ? mapVault(res.rows[0] as VaultDbRow) : undefined;
  }

  async updateCiphertext(vaultId: string, ciphertextEnvelope: string): Promise<VaultBlobRecord> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['cip-blob:' + vaultId]);
      const vaultRes = await client.query('SELECT version FROM vaults WHERE id = $1 FOR UPDATE', [vaultId]);
      if (!vaultRes.rowCount) throw new Error('Vault not found');
      const version = Number((vaultRes.rows[0] as { version: number }).version) + 1;
      const sha256 = await sha256Hex(ciphertextEnvelope);
      const blobRes = await client.query(
        `INSERT INTO vault_blobs (vault_id, version, ciphertext_envelope, ciphertext_sha256, size_bytes)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [vaultId, version, ciphertextEnvelope, sha256, Buffer.byteLength(ciphertextEnvelope, 'utf-8')]
      );
      await client.query('UPDATE vaults SET version = $2 WHERE id = $1', [vaultId, version]);
      await client.query('COMMIT');
      return mapBlob(blobRes.rows[0] as never);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getLatestBlob(vaultId: string): Promise<VaultBlobRecord | undefined> {
    const res = await this.pool.query(
      'SELECT * FROM vault_blobs WHERE vault_id = $1 ORDER BY version DESC LIMIT 1',
      [vaultId]
    );
    return res.rowCount ? mapBlob(res.rows[0] as never) : undefined;
  }

  async pauseVault(vaultId: string): Promise<VaultRecord | undefined> {
    const res = await this.pool.query(
      `UPDATE vaults SET state = 'PAUSED'
       WHERE id = $1 AND state IN ('ACTIVE', 'REMINDER_WINDOW')
       RETURNING *`,
      [vaultId]
    );
    return res.rowCount ? mapVault(res.rows[0] as VaultDbRow) : undefined;
  }

  async resumeVault(vaultId: string): Promise<VaultRecord | undefined> {
    const res = await this.pool.query(
      `UPDATE vaults SET state = 'ACTIVE'
       WHERE id = $1 AND state = 'PAUSED'
       RETURNING *`,
      [vaultId]
    );
    return res.rowCount ? mapVault(res.rows[0] as VaultDbRow) : undefined;
  }

  async updateVaultState(vaultId: string, state: VaultRecord['state']): Promise<VaultRecord | undefined> {
    const res = await this.pool.query(
      `UPDATE vaults SET state = $2
       WHERE id = $1 AND NOT (state = 'CHALLENGE' AND $2 = 'ACTIVE')
       RETURNING *`,
      [vaultId, state]
    );
    if (!res.rowCount) {
      const current = await this.getVaultById(vaultId);
      if (current && current.state === 'CHALLENGE' && state === 'ACTIVE') {
        throw new Error('VAULT_STATE_TRANSITION_FORBIDDEN');
      }
      return undefined;
    }
    return mapVault(res.rows[0] as VaultDbRow);
  }

  async addHeir(vaultId: string, label: string, heirPubkey: string, wrappedHeirShare: string): Promise<HeirRecord> {
    const res = await this.pool.query(
      `INSERT INTO heirs (vault_id, label, heir_pubkey, wrapped_heir_share)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [vaultId, label, heirPubkey, wrappedHeirShare]
    );
    return mapHeir(res.rows[0] as never);
  }

  async getHeirs(vaultId: string): Promise<HeirRecord[]> {
    const res = await this.pool.query('SELECT * FROM heirs WHERE vault_id = $1 ORDER BY created_at', [vaultId]);
    return res.rows.map((r) => mapHeir(r as never));
  }

  async getEscrowShare(vaultId: string): Promise<EscrowShareRecord | undefined> {
    const res = await this.pool.query('SELECT * FROM escrow_shares WHERE vault_id = $1 LIMIT 1', [vaultId]);
    if (!res.rowCount) return undefined;
    const row = res.rows[0] as { id: string; vault_id: string; sealed_escrow_share: string; key_version: number; created_at: Date | string };
    return { id: row.id, vaultId: row.vault_id, sealedEscrowShare: row.sealed_escrow_share, keyVersion: row.key_version, createdAt: new Date(row.created_at) };
  }

  async initiateClaim(vaultId: string, heirPubkey: string): Promise<VaultRecord> {
    const res = await this.pool.query(
      `UPDATE vaults
       SET state = 'CHALLENGE',
           challenge_started_at = now(),
           challenge_expires_at = now() + make_interval(days => challenge_window_days),
           claiming_heir_pubkey = $2
       WHERE id = $1 AND state = 'PENDING'
       RETURNING *`,
      [vaultId, heirPubkey]
    );
    if (!res.rowCount) {
      const current = await this.getVaultById(vaultId);
      if (!current) throw new Error('VAULT_NOT_FOUND');
      throw new Error(`CLAIM_REJECTED: Vault is in ${current.state} state, not PENDING.`);
    }
    return mapVault(res.rows[0] as VaultDbRow);
  }

  async cancelClaim(vaultId: string): Promise<VaultRecord> {
    const res = await this.pool.query(
      `UPDATE vaults
       SET state = 'ACTIVE',
           last_checkin_at = now(),
           challenge_started_at = NULL,
           challenge_expires_at = NULL,
           claiming_heir_pubkey = NULL
       WHERE id = $1 AND state = 'CHALLENGE'
       RETURNING *`,
      [vaultId]
    );
    if (!res.rowCount) {
      const current = await this.getVaultById(vaultId);
      if (!current) throw new Error('VAULT_NOT_FOUND');
      throw new Error(`CANCEL_REJECTED: Vault is not in CHALLENGE state (current: ${current.state})`);
    }
    return mapVault(res.rows[0] as VaultDbRow);
  }
}

export const vaultStore: VaultStore = hasDatabase() ? new PgVaultStore(getPool()) : new MemoryVaultStore();
