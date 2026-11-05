import pg from 'pg';
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
}

export class PostgresVaultProvider implements VaultProvider {
  private pool: pg.Pool;

  constructor(connectionString: string) {
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
        last_checkin_at as "lastCheckinAt"
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
      lastCheckinAt: new Date(row.lastCheckinAt)
    }));
  }

  async updateVaultState(vaultId: string, newState: string): Promise<void> {
    await this.pool.query('UPDATE vaults SET state = $1 WHERE id = $2', [newState, vaultId]);
  }

  async logEvent(vaultId: string, type: string, payload: Record<string, unknown>): Promise<void> {
    const countRes = await this.pool.query(
      'SELECT count(*)::int as count FROM events WHERE vault_id = $1',
      [vaultId]
    );
    const sequence = countRes.rows[0]?.count ?? 0;
    const payloadStr = JSON.stringify(payload);
    await this.pool.query(
      `INSERT INTO events (id, vault_id, sequence, type, payload_hash, prev_hash, signature, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, md5($4), 'prev-hash', 'worker-signature', NOW())`,
      [vaultId, sequence, type, payloadStr]
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
