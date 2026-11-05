import { BackgroundScheduler } from './scheduler.js';
import { ConsoleNotificationDispatcher } from './notifications.js';
import { PgBossScheduler } from './pgBossScheduler.js';
import { PostgresVaultProvider } from './postgresProvider.js';
import { PgEventChainStore } from '@cip/event-chain';
import { deriveSigningKeyPairFromPrivate } from '@cip/crypto-core';
import { assertStrongHexSecret } from '@cip/protocol';
import pg from 'pg';

function loadSigningKey() {
  const keyHex = process.env['CIP_SERVER_SIGNING_KEY_HEX'];
  assertStrongHexSecret(keyHex, 'CIP_SERVER_SIGNING_KEY_HEX', 32);
  return deriveSigningKeyPairFromPrivate(Buffer.from(keyHex!, 'hex'));
}

export async function startWorker() {
  console.log('[CIP Worker] Starting Background Scheduler daemon...');
  const dispatcher = new ConsoleNotificationDispatcher();
  const dbUrl = process.env['DATABASE_URL'];

  let provider: PostgresVaultProvider | null = null;
  if (dbUrl) {
    try {
      const signingKey = await loadSigningKey();
      const pool = new pg.Pool({ connectionString: dbUrl });
      const eventStore = new PgEventChainStore(pool);
      provider = new PostgresVaultProvider(dbUrl, eventStore, signingKey);
      console.log('[CIP Worker] Initializing Postgres-backed transactional scheduler (pg-boss)...');
      const pgBossScheduler = new PgBossScheduler({
        connectionString: dbUrl,
        vaultProvider: provider,
        dispatcher
      });

      await pgBossScheduler.start();
      await pgBossScheduler.scheduleRecurringHeartbeatSweep();
      console.log('[CIP Worker] pg-boss transactional scheduler active and listening.');
      return;
    } catch (err) {
      console.warn('[CIP Worker] Failed to start pg-boss, falling back to interval scheduler:', err);
    }
  }

  const scheduler = new BackgroundScheduler(dispatcher);
  const intervalMs = Number(process.env['CIP_WORKER_INTERVAL_MS']) || 60000;
  console.log(`[CIP Worker] Standalone polling cycle configured for every ${intervalMs}ms.`);

  const runTick = async () => {
    try {
      const now = new Date();
      const vaults = provider ? await provider.getActiveVaults() : [];
      const result = await scheduler.runCycle(vaults, now);
      if (provider && result.transitionedCount > 0) {
        for (const item of result.details) {
          if (item.previousState !== item.currentState) {
            await provider.updateVaultState(item.vaultId, item.currentState);
            await provider.logEvent(item.vaultId, item.currentState, {
              from: item.previousState,
              to: item.currentState,
              timestamp: now.toISOString()
            });
          }
        }
      }
      if (provider && result.notificationsSent > 0) {
        for (const item of result.details) {
          if (item.notificationDispatched) {
            await provider.updateNotificationState(item.vaultId, item.notificationDispatched, now);
          }
        }
      }
      if (result.transitionedCount > 0 || result.notificationsSent > 0) {
        console.log(`[CIP Worker] Cycle completed: ${result.transitionedCount} transitions, ${result.notificationsSent} notifications.`);
      }
    } catch (err) {
      console.error('[CIP Worker] Error during scheduler cycle:', err);
    }
  };

  await runTick();
  setInterval(runTick, intervalMs);
}

if (process.env['NODE_ENV'] !== 'test') {
  startWorker().catch((err) => {
    console.error('[CIP Worker] Fatal worker startup error:', err);
    process.exit(1);
  });
}
