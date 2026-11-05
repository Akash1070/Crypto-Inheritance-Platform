import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkerVault,
  evaluateVaultCountdown,
  MockNotificationDispatcher,
  buildNotificationMessage,
  shouldDispatchNotification,
  ClaimEngine,
  BackgroundScheduler
} from '../src/index.js';
import { generateSigningKeyPair } from '@cip/crypto-core';

describe('Worker State Machine & Background Scheduler (@cip/worker)', () => {
  const BASE_TIME = new Date('2026-01-01T00:00:00.000Z');
  const DAY_MS = 24 * 3600 * 1000;

  function createTestVault(overrides?: Partial<WorkerVault>): WorkerVault {
    return {
      id: 'vault-test-123',
      ownerId: 'user-alice-1',
      label: 'Main BTC Vault',
      state: 'ACTIVE',
      checkinIntervalDays: 90,
      gracePeriodDays: 30,
      challengeWindowDays: 30,
      lastCheckinAt: new Date(BASE_TIME.getTime()),
      ...overrides
    };
  }

  describe('Countdown & Heartbeat Evaluation', () => {
    it('keeps vault ACTIVE and suppresses alerts when >30 days remain', () => {
      const vault = createTestVault();
      // 40 days elapsed out of 90 (50 days remaining)
      const now = new Date(BASE_TIME.getTime() + 40 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.state).toBe('ACTIVE');
      expect(res.nextState).toBe('ACTIVE');
      expect(res.recommendedNotificationTier).toBe('NONE');
    });

    it('triggers REMINDER_30_DAYS when remaining days <= 30 and > 14', () => {
      const vault = createTestVault();
      // 65 days elapsed out of 90 (25 days remaining)
      const now = new Date(BASE_TIME.getTime() + 65 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.nextState).toBe('REMINDER_WINDOW');
      expect(res.recommendedNotificationTier).toBe('REMINDER_30_DAYS');
    });

    it('triggers REMINDER_14_DAYS when remaining days <= 14 and > 7', () => {
      const vault = createTestVault();
      // 80 days elapsed out of 90 (10 days remaining)
      const now = new Date(BASE_TIME.getTime() + 80 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.nextState).toBe('REMINDER_WINDOW');
      expect(res.recommendedNotificationTier).toBe('REMINDER_14_DAYS');
    });

    it('triggers REMINDER_7_DAYS when remaining days <= 7 and > 0', () => {
      const vault = createTestVault();
      // 85 days elapsed out of 90 (5 days remaining)
      const now = new Date(BASE_TIME.getTime() + 85 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.nextState).toBe('REMINDER_WINDOW');
      expect(res.recommendedNotificationTier).toBe('REMINDER_7_DAYS');
    });

    it('triggers GRACE_PERIOD_ACTIVE when check-in interval has expired but grace remains', () => {
      const vault = createTestVault();
      // 95 days elapsed out of 90 + 30 (5 days into 30-day grace)
      const now = new Date(BASE_TIME.getTime() + 95 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.nextState).toBe('REMINDER_WINDOW');
      expect(res.recommendedNotificationTier).toBe('GRACE_PERIOD_ACTIVE');
    });

    it('transitions to PENDING when both interval and grace period have expired', () => {
      const vault = createTestVault();
      // 121 days elapsed out of 90 + 30 = 120 (1 day past grace expiry)
      const now = new Date(BASE_TIME.getTime() + 121 * DAY_MS);
      const res = evaluateVaultCountdown(vault, now);

      expect(res.nextState).toBe('PENDING');
      expect(res.recommendedNotificationTier).toBe('NONE');
    });

    it('ignores countdown for PAUSED, CANCELLED, or RELEASED vaults', () => {
      const pausedVault = createTestVault({ state: 'PAUSED' });
      const now = new Date(BASE_TIME.getTime() + 500 * DAY_MS);
      const res = evaluateVaultCountdown(pausedVault, now);

      expect(res.isPaused).toBe(true);
      expect(res.nextState).toBe('PAUSED');
      expect(res.recommendedNotificationTier).toBe('NONE');
    });
  });

  describe('Escalating Alert Engine & Notification Throttling', () => {
    it('constructs multi-channel alerts with escalating severity', () => {
      const vault = createTestVault();
      const now = new Date(BASE_TIME.getTime() + 85 * DAY_MS);

      const msg30 = buildNotificationMessage(vault, 'REMINDER_30_DAYS', now);
      expect(msg30?.channels).toEqual(['EMAIL', 'WEBPUSH']);

      const msg14 = buildNotificationMessage(vault, 'REMINDER_14_DAYS', now);
      expect(msg14?.channels).toContain('SMS');

      const msg7 = buildNotificationMessage(vault, 'REMINDER_7_DAYS', now);
      expect(msg7?.channels).toContain('EMERGENCY_CONTACTS');

      const msgChallenge = buildNotificationMessage(vault, 'CHALLENGE_ACTIVE', now);
      expect(msgChallenge?.subject).toContain('RED ALERT');
      expect(msgChallenge?.channels).toContain('EMERGENCY_CONTACTS');
    });

    it('throttles duplicate notifications at the same tier but allows escalation', () => {
      const vault = createTestVault({
        lastNotificationTier: 'REMINDER_30_DAYS',
        lastNotificationSentAt: new Date(BASE_TIME.getTime() + 65 * DAY_MS)
      });

      // Same tier 1 day later -> do not duplicate
      const nextDay = new Date(BASE_TIME.getTime() + 66 * DAY_MS);
      expect(shouldDispatchNotification(vault, 'REMINDER_30_DAYS', nextDay)).toBe(false);

      // Escalation to 14 days -> dispatch immediately
      expect(shouldDispatchNotification(vault, 'REMINDER_14_DAYS', nextDay)).toBe(true);
    });

    it('re-alerts every 72 hours during active CHALLENGE window', () => {
      const vault = createTestVault({
        state: 'CHALLENGE',
        lastNotificationTier: 'CHALLENGE_ACTIVE',
        lastNotificationSentAt: new Date(BASE_TIME.getTime() + 100 * DAY_MS)
      });

      // 24 hours later -> suppressed
      const day1 = new Date(BASE_TIME.getTime() + 101 * DAY_MS);
      expect(shouldDispatchNotification(vault, 'CHALLENGE_ACTIVE', day1)).toBe(false);

      // 73 hours later -> allowed
      const day4 = new Date(BASE_TIME.getTime() + 100 * DAY_MS + 73 * 3600 * 1000);
      expect(shouldDispatchNotification(vault, 'CHALLENGE_ACTIVE', day4)).toBe(true);
    });
  });

  describe('Claim Engine & 30-Day Challenge Window', () => {
    it('strictly rejects claims if vault is not in PENDING state', () => {
      const activeVault = createTestVault({ state: 'ACTIVE' });
      expect(() => {
        ClaimEngine.initiateClaim(activeVault, '00'.repeat(32), BASE_TIME);
      }).toThrow(/CLAIM_REJECTED/);

      const reminderVault = createTestVault({ state: 'REMINDER_WINDOW' });
      expect(() => {
        ClaimEngine.initiateClaim(reminderVault, '00'.repeat(32), BASE_TIME);
      }).toThrow(/CLAIM_REJECTED/);
    });

    it('successfully initiates claim on PENDING vault, setting 30-day challenge window', () => {
      const pendingVault = createTestVault({ state: 'PENDING', challengeWindowDays: 30 });
      const heirPubkey = '11'.repeat(32);
      const claimTime = new Date('2026-06-01T12:00:00.000Z');

      const event = ClaimEngine.initiateClaim(pendingVault, heirPubkey, claimTime);

      expect(pendingVault.state).toBe('CHALLENGE');
      expect(pendingVault.claimingHeirPubkey).toBe(heirPubkey);
      expect(pendingVault.challengeStartedAt).toEqual(claimTime);
      expect(pendingVault.challengeExpiresAt).toEqual(new Date(claimTime.getTime() + 30 * DAY_MS));
      expect(event.type).toBe('CLAIM_INITIATED');
    });

    it('instantly cancels claim upon owner WebAuthn passkey assertion', () => {
      const challengeVault = createTestVault({
        state: 'CHALLENGE',
        claimingHeirPubkey: '11'.repeat(32),
        challengeStartedAt: BASE_TIME,
        challengeExpiresAt: new Date(BASE_TIME.getTime() + 30 * DAY_MS)
      });

      const cancelTime = new Date(BASE_TIME.getTime() + 5 * DAY_MS);
      const event = ClaimEngine.cancelClaim(challengeVault, 'Owner tapped hardware YubiKey', cancelTime);

      expect(challengeVault.state).toBe('ACTIVE');
      expect(challengeVault.claimingHeirPubkey).toBeUndefined();
      expect(challengeVault.challengeStartedAt).toBeUndefined();
      expect(challengeVault.challengeExpiresAt).toBeUndefined();
      expect(challengeVault.lastCheckinAt).toEqual(cancelTime);
      expect(event.type).toBe('CLAIM_CANCELLED');
    });

    it('transitions to RELEASED when 30-day challenge window expires without owner cancellation', () => {
      const challengeVault = createTestVault({
        state: 'CHALLENGE',
        claimingHeirPubkey: '11'.repeat(32),
        challengeStartedAt: BASE_TIME,
        challengeExpiresAt: new Date(BASE_TIME.getTime() + 30 * DAY_MS)
      });

      // Day 29: still in challenge
      const day29 = new Date(BASE_TIME.getTime() + 29 * DAY_MS);
      const event29 = ClaimEngine.evaluateChallengeExpiry(challengeVault, day29);
      expect(event29).toBeNull();
      expect(challengeVault.state).toBe('CHALLENGE');

      // Day 30 + 1 second: challenge expired!
      const day30 = new Date(BASE_TIME.getTime() + 30 * DAY_MS + 1000);
      const event30 = ClaimEngine.evaluateChallengeExpiry(challengeVault, day30);
      expect(event30?.type).toBe('CHALLENGE_EXPIRED_RELEASE_AUTHORIZED');
      expect(challengeVault.state).toBe('RELEASED');
    });
  });

  describe('Full Background Scheduler Cycle', () => {
    it('executes end-to-end multi-vault cycle with notifications and audit chain events', async () => {
      const dispatcher = new MockNotificationDispatcher();
      const mockChainLogs: { vaultId: string; type: string }[] = [];
      const mockEventLogger = {
        async appendEvent(vaultId: string, type: string) {
          mockChainLogs.push({ vaultId, type });
        }
      };
      const signingKey = await generateSigningKeyPair();

      const scheduler = new BackgroundScheduler(dispatcher, mockEventLogger, signingKey);

      const vaultHealthy = createTestVault({ id: 'v-healthy', lastCheckinAt: BASE_TIME });
      const vaultDue30 = createTestVault({
        id: 'v-due30',
        lastCheckinAt: new Date(BASE_TIME.getTime() - 65 * DAY_MS) // 25 days left
      });
      const vaultOverdue = createTestVault({
        id: 'v-overdue',
        lastCheckinAt: new Date(BASE_TIME.getTime() - 130 * DAY_MS) // Past 90 + 30 = 120
      });

      const result = await scheduler.runCycle([vaultHealthy, vaultDue30, vaultOverdue], BASE_TIME);

      expect(result.evaluatedCount).toBe(3);
      expect(result.transitionedCount).toBe(2); // v-due30 -> REMINDER_WINDOW, v-overdue -> PENDING
      expect(result.notificationsSent).toBe(1); // v-due30 got REMINDER_30_DAYS
      expect(dispatcher.history).toHaveLength(1);
      expect(dispatcher.history[0]?.vaultId).toBe('v-due30');
      expect(mockChainLogs).toHaveLength(2);
      expect(mockChainLogs[0]?.type).toBe('STATE_TRANSITION_REMINDER_WINDOW');
      expect(mockChainLogs[1]?.type).toBe('STATE_TRANSITION_PENDING');
    });
  });
});
