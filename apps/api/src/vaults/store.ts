import { sha256Hex } from '@cip/crypto-core';

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

export class MemoryVaultStore {
  private vaultsById = new Map<string, VaultRecord>();
  private blobsByVaultId = new Map<string, VaultBlobRecord[]>();
  private heirsByVaultId = new Map<string, HeirRecord[]>();
  private escrowSharesByVaultId = new Map<string, EscrowShareRecord>();

  clear(): void {
    this.vaultsById.clear();
    this.blobsByVaultId.clear();
    this.heirsByVaultId.clear();
    this.escrowSharesByVaultId.clear();
  }

  async createVault(
    ownerId: string,
    label: string,
    config: {
      checkinIntervalDays: number;
      gracePeriodDays: number;
      challengeWindowDays: number;
    },
    ciphertextEnvelope: string,
    sealedEscrowShare: string
  ): Promise<{ vault: VaultRecord; blob: VaultBlobRecord }> {
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

    const escrowRecord: EscrowShareRecord = {
      id: globalThis.crypto.randomUUID(),
      vaultId: id,
      sealedEscrowShare,
      keyVersion: 1,
      createdAt: now
    };
    this.escrowSharesByVaultId.set(id, escrowRecord);

    return { vault, blob };
  }

  async getVaultById(vaultId: string): Promise<VaultRecord | undefined> {
    return this.vaultsById.get(vaultId);
  }

  async getVaultsByOwner(ownerId: string): Promise<VaultRecord[]> {
    return Array.from(this.vaultsById.values()).filter((v) => v.ownerId === ownerId);
  }

  async updateCheckin(vaultId: string): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) return undefined;
    vault.lastCheckinAt = new Date();
    vault.state = 'ACTIVE';
    return vault;
  }

  async updateLastCheckin(vaultId: string): Promise<VaultRecord | undefined> {
    return this.updateCheckin(vaultId);
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

  async addHeir(
    vaultId: string,
    label: string,
    heirPubkey: string,
    wrappedHeirShare: string
  ): Promise<HeirRecord> {
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

  async updateVaultState(
    vaultId: string,
    state: VaultRecord['state']
  ): Promise<VaultRecord | undefined> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) return undefined;
    vault.state = state;
    return vault;
  }

  async initiateClaim(vaultId: string, heirPubkey: string, now: Date = new Date()): Promise<VaultRecord> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) throw new Error('VAULT_NOT_FOUND');
    if (vault.state !== 'PENDING') {
      throw new Error(`CLAIM_REJECTED: Vault is in ${vault.state} state, not PENDING.`);
    }

    const DAY_MS = 24 * 3600 * 1000;
    vault.state = 'CHALLENGE';
    vault.challengeStartedAt = now;
    vault.challengeExpiresAt = new Date(now.getTime() + vault.challengeWindowDays * DAY_MS);
    vault.claimingHeirPubkey = heirPubkey;
    return vault;
  }

  async cancelClaim(vaultId: string, now: Date = new Date()): Promise<VaultRecord> {
    const vault = this.vaultsById.get(vaultId);
    if (!vault) throw new Error('VAULT_NOT_FOUND');
    if (vault.state !== 'CHALLENGE') {
      throw new Error(`CANCEL_REJECTED: Vault is not in CHALLENGE state (current: ${vault.state})`);
    }

    vault.state = 'ACTIVE';
    vault.lastCheckinAt = now;
    vault.challengeStartedAt = undefined;
    vault.challengeExpiresAt = undefined;
    vault.claimingHeirPubkey = undefined;
    return vault;
  }
}

export const vaultStore = new MemoryVaultStore();
