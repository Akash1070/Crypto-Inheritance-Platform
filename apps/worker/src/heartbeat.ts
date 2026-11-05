import { VaultState } from '@cip/protocol';

export interface WorkerVault {
  id: string;
  ownerId: string;
  label: string;
  state: VaultState;
  checkinIntervalDays: number;
  gracePeriodDays: number;
  challengeWindowDays: number;
  lastCheckinAt: Date;
  challengeStartedAt?: Date | undefined;
  challengeExpiresAt?: Date | undefined;
  claimingHeirPubkey?: string | undefined;
  lastNotificationTier?: NotificationTier | undefined;
  lastNotificationSentAt?: Date | undefined;
}

export type NotificationTier =
  | 'NONE'
  | 'REMINDER_30_DAYS'
  | 'REMINDER_14_DAYS'
  | 'REMINDER_7_DAYS'
  | 'GRACE_PERIOD_ACTIVE'
  | 'CHALLENGE_ACTIVE';

export interface CountdownStatus {
  vaultId: string;
  state: VaultState;
  isPaused: boolean;
  msUntilIntervalExpiry: number;
  msUntilGraceExpiry: number;
  msUntilChallengeExpiry?: number | undefined;
  nextState: VaultState;
  recommendedNotificationTier: NotificationTier;
}

/**
 * Pure, deterministic evaluation of a vault's countdown timers and state transitions.
 * Zero network or external side-effects.
 */
export function evaluateVaultCountdown(vault: WorkerVault, now: Date): CountdownStatus {
  if (vault.state === 'PAUSED' || vault.state === 'CANCELLED' || vault.state === 'RELEASED') {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: vault.state === 'PAUSED',
      msUntilIntervalExpiry: Infinity,
      msUntilGraceExpiry: Infinity,
      nextState: vault.state,
      recommendedNotificationTier: 'NONE'
    };
  }

  const DAY_MS = 24 * 3600 * 1000;
  const intervalMs = vault.checkinIntervalDays * DAY_MS;
  const graceMs = vault.gracePeriodDays * DAY_MS;
  const elapsedMs = now.getTime() - vault.lastCheckinAt.getTime();

  const msUntilIntervalExpiry = intervalMs - elapsedMs;
  const msUntilGraceExpiry = (intervalMs + graceMs) - elapsedMs;

  // 1. Evaluate Active Challenge Window (Heir claim pending verification)
  if (vault.state === 'CHALLENGE') {
    const challengeExpiresAt = vault.challengeExpiresAt ? vault.challengeExpiresAt.getTime() : now.getTime();
    const msUntilChallengeExpiry = challengeExpiresAt - now.getTime();

    if (msUntilChallengeExpiry <= 0) {
      // 30-day challenge window elapsed with ZERO owner cancellation
      return {
        vaultId: vault.id,
        state: 'CHALLENGE',
        isPaused: false,
        msUntilIntervalExpiry,
        msUntilGraceExpiry,
        msUntilChallengeExpiry,
        nextState: 'RELEASED',
        recommendedNotificationTier: 'NONE'
      };
    }

    return {
      vaultId: vault.id,
      state: 'CHALLENGE',
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      msUntilChallengeExpiry,
      nextState: 'CHALLENGE',
      recommendedNotificationTier: 'CHALLENGE_ACTIVE'
    };
  }

  // 2. Evaluate Grace Period Expiry -> Transitions to PENDING (eligible for heir claim)
  if (msUntilGraceExpiry <= 0) {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      nextState: 'PENDING',
      recommendedNotificationTier: 'NONE'
    };
  }

  // 3. Evaluate Check-in Expiry -> In Grace Period (Final urgent warnings)
  if (msUntilIntervalExpiry <= 0) {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      nextState: 'REMINDER_WINDOW',
      recommendedNotificationTier: 'GRACE_PERIOD_ACTIVE'
    };
  }

  // 4. Within Reminder Window (< 30 days)
  if (msUntilIntervalExpiry <= 7 * DAY_MS) {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      nextState: 'REMINDER_WINDOW',
      recommendedNotificationTier: 'REMINDER_7_DAYS'
    };
  }

  if (msUntilIntervalExpiry <= 14 * DAY_MS) {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      nextState: 'REMINDER_WINDOW',
      recommendedNotificationTier: 'REMINDER_14_DAYS'
    };
  }

  if (msUntilIntervalExpiry <= 30 * DAY_MS) {
    return {
      vaultId: vault.id,
      state: vault.state,
      isPaused: false,
      msUntilIntervalExpiry,
      msUntilGraceExpiry,
      nextState: 'REMINDER_WINDOW',
      recommendedNotificationTier: 'REMINDER_30_DAYS'
    };
  }

  // 5. Healthy Active State (> 30 days remaining)
  return {
    vaultId: vault.id,
    state: 'ACTIVE',
    isPaused: false,
    msUntilIntervalExpiry,
    msUntilGraceExpiry,
    nextState: 'ACTIVE',
    recommendedNotificationTier: 'NONE'
  };
}
