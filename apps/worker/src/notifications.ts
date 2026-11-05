import { NotificationTier, WorkerVault } from './heartbeat.js';

export interface NotificationMessage {
  id: string;
  vaultId: string;
  ownerId: string;
  tier: NotificationTier;
  subject: string;
  body: string;
  channels: ('EMAIL' | 'WEBPUSH' | 'SMS' | 'EMERGENCY_CONTACTS')[];
  sentAt: Date;
}

export interface NotificationDispatcher {
  dispatch(notification: NotificationMessage): Promise<boolean>;
}

export class MockNotificationDispatcher implements NotificationDispatcher {
  public history: NotificationMessage[] = [];

  async dispatch(notification: NotificationMessage): Promise<boolean> {
    this.history.push(notification);
    return true;
  }

  clear(): void {
    this.history = [];
  }
}

export class ConsoleNotificationDispatcher implements NotificationDispatcher {
  async dispatch(notification: NotificationMessage): Promise<boolean> {
    console.log(`[Notification Dispatcher] [${notification.tier}] to ${notification.ownerId} (vault ${notification.vaultId}): ${notification.subject}`);
    return true;
  }
}

/**
 * Constructs an escalating security notification message based on the alert tier.
 */
export function buildNotificationMessage(vault: WorkerVault, tier: NotificationTier, now: Date): NotificationMessage | null {
  const baseId = `notif-${vault.id}-${tier}-${now.getTime()}`;

  switch (tier) {
    case 'REMINDER_30_DAYS':
      return {
        id: baseId,
        vaultId: vault.id,
        ownerId: vault.ownerId,
        tier,
        subject: `[CIP] Friendly Check-In Reminder: Vault "${vault.label}"`,
        body: `Your scheduled liveness check-in for vault "${vault.label}" is due in approximately 30 days. Log in with your passkey anytime to reset the timer.`,
        channels: ['EMAIL', 'WEBPUSH'],
        sentAt: now
      };

    case 'REMINDER_14_DAYS':
      return {
        id: baseId,
        vaultId: vault.id,
        ownerId: vault.ownerId,
        tier,
        subject: `[CIP URGENT] 14 Days Remaining: Check-In Due for "${vault.label}"`,
        body: `Only 14 days remain before your vault enters its grace period. Please perform a passkey liveness check-in to confirm your safety.`,
        channels: ['EMAIL', 'WEBPUSH', 'SMS'],
        sentAt: now
      };

    case 'REMINDER_7_DAYS':
      return {
        id: baseId,
        vaultId: vault.id,
        ownerId: vault.ownerId,
        tier,
        subject: `[CIP CRITICAL] 7 Days to Grace Period: Action Required for "${vault.label}"`,
        body: `7 days remain before your inactivity triggers emergency escalation. We are also notifying your designated trusted emergency contacts.`,
        channels: ['EMAIL', 'WEBPUSH', 'SMS', 'EMERGENCY_CONTACTS'],
        sentAt: now
      };

    case 'GRACE_PERIOD_ACTIVE':
      return {
        id: baseId,
        vaultId: vault.id,
        ownerId: vault.ownerId,
        tier,
        subject: `[CIP EMERGENCY] Vault "${vault.label}" Has Entered Grace Period`,
        body: `Your primary check-in interval has expired. Vault "${vault.label}" is in active grace period countdown. Inactivity will result in heir inheritance claim eligibility.`,
        channels: ['EMAIL', 'WEBPUSH', 'SMS', 'EMERGENCY_CONTACTS'],
        sentAt: now
      };

    case 'CHALLENGE_ACTIVE':
      return {
        id: baseId,
        vaultId: vault.id,
        ownerId: vault.ownerId,
        tier,
        subject: `[CIP RED ALERT] INHERITANCE CLAIM INITIATED on "${vault.label}"`,
        body: `An authorized heir has initiated an inheritance claim on vault "${vault.label}". If you are safe, tap your WebAuthn passkey immediately to cancel the claim and lock the vault.`,
        channels: ['EMAIL', 'WEBPUSH', 'SMS', 'EMERGENCY_CONTACTS'],
        sentAt: now
      };

    default:
      return null;
  }
}

/**
 * Determines whether a notification should be throttled or dispatched.
 * Prevents redundant spam while guaranteeing 72-hour challenge pings.
 */
export function shouldDispatchNotification(vault: WorkerVault, tier: NotificationTier, now: Date): boolean {
  if (tier === 'NONE') return false;

  // If never notified, dispatch immediately
  if (!vault.lastNotificationTier || !vault.lastNotificationSentAt) {
    return true;
  }

  // If escalating to a higher severity tier, dispatch immediately
  if (vault.lastNotificationTier !== tier) {
    return true;
  }

  // If already at CHALLENGE_ACTIVE tier, re-alert every 72 hours
  if (tier === 'CHALLENGE_ACTIVE') {
    const SEVENTY_TWO_HOURS_MS = 72 * 3600 * 1000;
    const timeSinceLastPing = now.getTime() - vault.lastNotificationSentAt.getTime();
    return timeSinceLastPing >= SEVENTY_TWO_HOURS_MS;
  }

  // In all other cases, do not duplicate notifications within the same tier
  return false;
}

