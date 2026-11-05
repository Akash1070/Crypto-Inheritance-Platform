import { WorkerVault, evaluateVaultCountdown } from './heartbeat.js';
import {
  NotificationDispatcher,
  buildNotificationMessage,
  shouldDispatchNotification
} from './notifications.js';
import { ClaimEngine } from './claimEngine.js';
import { SigningKeyPair } from '@cip/crypto-core';

export interface EventLogger {
  appendEvent(
    vaultId: string,
    type: string,
    payload: Record<string, unknown>,
    signingKey: SigningKeyPair
  ): Promise<unknown>;
}

export interface SchedulerCycleResult {
  evaluatedCount: number;
  transitionedCount: number;
  notificationsSent: number;
  details: {
    vaultId: string;
    previousState: string;
    currentState: string;
    notificationDispatched?: string;
  }[];
}

export class BackgroundScheduler {
  constructor(
    private dispatcher: NotificationDispatcher,
    private eventLogger?: EventLogger,
    private signingKey?: SigningKeyPair
  ) {}

  /**
   * Executes a single idempotent evaluation pass over all provided vaults.
   * Fully deterministic and time-injected.
   */
  async runCycle(vaults: WorkerVault[], now: Date): Promise<SchedulerCycleResult> {
    let transitionedCount = 0;
    let notificationsSent = 0;
    const details: SchedulerCycleResult['details'] = [];

    for (const vault of vaults) {
      const previousState = vault.state;
      const countdown = evaluateVaultCountdown(vault, now);

      // 1. Process State Transitions
      if (countdown.nextState !== vault.state) {
        vault.state = countdown.nextState;
        transitionedCount++;

        if (this.eventLogger && this.signingKey) {
          await this.eventLogger.appendEvent(
            vault.id,
            `STATE_TRANSITION_${countdown.nextState}`,
            {
              from: previousState,
              to: countdown.nextState,
              timestamp: now.toISOString()
            },
            this.signingKey
          );
        }
      }

      // 2. Process Challenge Expiration if in CHALLENGE state
      if (vault.state === 'CHALLENGE') {
        const challengeExpiryEvent = ClaimEngine.evaluateChallengeExpiry(vault, now);
        if (challengeExpiryEvent) {
          transitionedCount++;

          if (this.eventLogger && this.signingKey) {
            await this.eventLogger.appendEvent(
              vault.id,
              challengeExpiryEvent.type,
              challengeExpiryEvent.payload,
              this.signingKey
            );
          }
        }
      }

      // 3. Process Escalating Notifications
      let notificationDispatched: string | undefined;
      const targetTier = countdown.recommendedNotificationTier;

      if (shouldDispatchNotification(vault, targetTier, now)) {
        const msg = buildNotificationMessage(vault, targetTier, now);
        if (msg) {
          const success = await this.dispatcher.dispatch(msg);
          if (success) {
            vault.lastNotificationTier = targetTier;
            vault.lastNotificationSentAt = now;
            notificationsSent++;
            notificationDispatched = targetTier;
          }
        }
      }

      details.push({
        vaultId: vault.id,
        previousState,
        currentState: vault.state,
        ...(notificationDispatched ? { notificationDispatched } : {})
      });
    }

    return {
      evaluatedCount: vaults.length,
      transitionedCount,
      notificationsSent,
      details
    };
  }
}
