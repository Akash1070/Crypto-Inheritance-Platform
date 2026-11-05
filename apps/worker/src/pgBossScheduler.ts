import { PgBoss } from 'pg-boss';
import { WorkerVault, evaluateVaultCountdown } from './heartbeat.js';
import {
  NotificationDispatcher,
  buildNotificationMessage,
  shouldDispatchNotification,
  NotificationMessage
} from './notifications.js';
import { ClaimEngine } from './claimEngine.js';

export const QUEUE_HEARTBEAT_SWEEP = 'cip-heartbeat-sweep';
export const QUEUE_DISPATCH_NOTIFICATION = 'cip-dispatch-notification';
export const QUEUE_CHALLENGE_EXPIRY = 'cip-challenge-expiry';

export interface VaultProvider {
  getActiveVaults(): Promise<WorkerVault[]>;
  updateVaultState(vaultId: string, newState: string): Promise<void>;
  updateNotificationState(vaultId: string, tier: string, sentAt: Date): Promise<void>;
  logEvent(vaultId: string, type: string, payload: Record<string, unknown>): Promise<void>;
}

export interface PgBossSchedulerOptions {
  connectionString: string;
  vaultProvider: VaultProvider;
  dispatcher: NotificationDispatcher;
}

export class PgBossScheduler {
  private boss: PgBoss;
  private vaultProvider: VaultProvider;
  private dispatcher: NotificationDispatcher;
  private isRunning = false;

  constructor(options: PgBossSchedulerOptions) {
    this.boss = new PgBoss(options.connectionString);
    this.vaultProvider = options.vaultProvider;
    this.dispatcher = options.dispatcher;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    await this.boss.start();
    this.isRunning = true;

    // 1. Worker for periodic heartbeat evaluations
    await this.boss.work(QUEUE_HEARTBEAT_SWEEP, async () => {
      await this.runHeartbeatSweep();
    });

    // 2. Worker for dispatched notifications
    await this.boss.work<NotificationMessage>(QUEUE_DISPATCH_NOTIFICATION, async (jobs) => {
      for (const job of jobs) {
        await this.dispatcher.dispatch(job.data);
      }
    });

    // 3. Worker for challenge expiry verification
    await this.boss.work<{ vaultId: string }>(QUEUE_CHALLENGE_EXPIRY, async (jobs) => {
      for (const job of jobs) {
        await this.evaluateChallengeExpiry(job.data.vaultId);
      }
    });

    console.log('[PgBossScheduler] Workers registered and running.');
  }

  async scheduleRecurringHeartbeatSweep(cron = '*/10 * * * *'): Promise<void> {
    // Schedules recurring cron job
    await this.boss.schedule(QUEUE_HEARTBEAT_SWEEP, cron, {});
  }

  async runHeartbeatSweep(injectedNow?: Date): Promise<number> {
    const now = injectedNow ?? new Date();
    const vaults = await this.vaultProvider.getActiveVaults();
    let processed = 0;

    for (const vault of vaults) {
      const countdown = evaluateVaultCountdown(vault, now);

      // Handle state changes
      if (countdown.nextState !== vault.state) {
        const previousState = vault.state;
        await this.vaultProvider.updateVaultState(vault.id, countdown.nextState);
        await this.vaultProvider.logEvent(vault.id, `STATE_TRANSITION_${countdown.nextState}`, {
          from: previousState,
          to: countdown.nextState,
          timestamp: now.toISOString()
        });
        vault.state = countdown.nextState;
      }

      // Handle escalating notifications
      const tier = countdown.recommendedNotificationTier;
      if (shouldDispatchNotification(vault, tier, now)) {
        const msg = buildNotificationMessage(vault, tier, now);
        if (msg) {
          await this.boss.send(QUEUE_DISPATCH_NOTIFICATION, msg);
          await this.vaultProvider.updateNotificationState(vault.id, tier, now);
          vault.lastNotificationTier = tier;
          vault.lastNotificationSentAt = now;
        }
      }

      processed++;
    }

    return processed;
  }

  async scheduleChallengeExpiryCheck(vaultId: string, challengeExpiresAt: Date): Promise<void> {
    await this.boss.sendAfter(QUEUE_CHALLENGE_EXPIRY, { vaultId }, null, challengeExpiresAt);
  }

  async evaluateChallengeExpiry(vaultId: string, injectedNow?: Date): Promise<void> {
    const now = injectedNow ?? new Date();
    const vaults = await this.vaultProvider.getActiveVaults();
    const vault = vaults.find((v) => v.id === vaultId);

    if (vault && vault.state === 'CHALLENGE') {
      const expiry = ClaimEngine.evaluateChallengeExpiry(vault, now);
      if (expiry) {
        await this.vaultProvider.updateVaultState(vault.id, 'RELEASED');
        await this.vaultProvider.logEvent(vault.id, expiry.type, expiry.payload);
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;
    await this.boss.stop();
    this.isRunning = false;
  }
}

