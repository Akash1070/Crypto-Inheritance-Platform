import pg from 'pg';
import { PgEventChainStore } from '@cip/event-chain';
import type { SigningKeyPair } from '@cip/crypto-core';
import { VaultProvider } from './pgBossScheduler.js';
import { WorkerVault } from './heartbeat.js';
import { VaultState } from '@cip/protocol';

interface VaultDbRow {
  id: string;
  ownerId: string;
  label: string;
  state: string;
  checkinIntervalDays: number | string;
  gracePeriodDays: number | string;
  challengeWindowDays: number | string;
  lastCheckinAt: string | Date;
  challengeStartedAt: string | Date | null;
  challengeExpiresAt: string | Date | null;
  claimingHeirPubkey: string | null;
  lastNotificationTier: string | null;
  lastNotificationSentAt: string | Date | null;
}

export class PostgresVaultProvider implements VaultProvider {
  private pool: pg.Pool;

  constructor(
    connectionString: string,
    private eventStore: PgEventChainStore,
    private signingKey: SigningKeyPair
  ) {
    this.pool = new pg.Pool({ connectionString });
  }

  async getActiveVaults(): Promise<WorkerVault[]> {
    const query = `
      SELECT
        id,
        owner_id as "ownerId",
        label,
        state,
        checkin_interval_days as "checkinIntervalDays",
        grace_period_days as "gracePeriodDays",
        challenge_window_days as "challengeWindowDays",
        last_checkin_at as "lastCheckinAt",
        challenge_started_at as "challengeStartedAt",
        challenge_expires_at as "challengeExpiresAt",
        claiming_heir_pubkey as "claimingHeirPubkey",
        last_notification_tier as "lastNotificationTier",
        last_notification_sent_at as "lastNotificationSentAt"
      FROM vaults
      WHERE state NOT IN ('RELEASED', 'CANCELLED')
    `;
    const res = await this.pool.query<VaultDbRow>(query);
    return res.rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      label: row.label,
      state: row.state as VaultState,
      checkinIntervalDays: Number(row.checkinIntervalDays),
      gracePeriodDays: Number(row.gracePeriodDays),
      challengeWindowDays: Number(row.challengeWindowDays),
      lastCheckinAt: new Date(row.lastCheckinAt),
      challengeStartedAt: row.challengeStartedAt ? new Date(row.challengeStartedAt) : undefined,
      challengeExpiresAt: row.challengeExpiresAt ? new Date(row.challengeExpiresAt) : undefined,
      claimingHeirPubkey: row.claimingHeirPubkey ?? undefined,
      lastNotificationTier: (row.lastNotificationTier ?? undefined) as WorkerVault['lastNotificationTier'],
      lastNotificationSentAt: row.lastNotificationSentAt ? new Date(row.lastNotificationSentAt) : undefined
    }));
  }

  async updateVaultState(vaultId: string, newState: string): Promise<void> {
    await this.pool.query('UPDATE vaults SET state = $1 WHERE id = $2', [newState, vaultId]);
  }

  async updateNotificationState(
    vaultId: string,
    tier: string,
    sentAt: Date
  ): Promise<void> {
    await this.pool.query(
      'UPDATE vaults SET last_notification_tier = $1, last_notification_sent_at = $2 WHERE id = $3',
      [tier, sentAt, vaultId]
    );
  }

  async logEvent(vaultId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    await this.eventStore.appendEvent(vaultId, type, payload, this.signingKey);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
