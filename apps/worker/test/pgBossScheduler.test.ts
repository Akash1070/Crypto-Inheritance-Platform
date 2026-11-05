import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PgBossScheduler, VaultProvider, QUEUE_DISPATCH_NOTIFICATION } from '../src/pgBossScheduler.js';
import { WorkerVault } from '../src/heartbeat.js';
import { MockNotificationDispatcher } from '../src/notifications.js';

// Mock pg-boss
vi.mock('pg-boss', () => {
  return {
    PgBoss: class MockPgBoss {
      public start = vi.fn().mockResolvedValue(this);
      public stop = vi.fn().mockResolvedValue(undefined);
      public schedule = vi.fn().mockResolvedValue(undefined);
      public send = vi.fn().mockResolvedValue('job-id-123');
      public sendAfter = vi.fn().mockResolvedValue('job-id-456');
      public work = vi.fn().mockResolvedValue('worker-id-789');
    }
  };
});

describe('PgBossScheduler Transactional Job Scheduler', () => {
  let mockVaults: WorkerVault[];
  let vaultProvider: VaultProvider;
  let dispatcher: MockNotificationDispatcher;
  let scheduler: PgBossScheduler;

  beforeEach(() => {
    mockVaults = [
      {
        id: 'vault-1',
        ownerId: 'owner-1',
        label: 'Bitcoin Treasury',
        state: 'ACTIVE',
        checkinIntervalDays: 90,
        gracePeriodDays: 30,
        challengeWindowDays: 30,
        lastCheckinAt: new Date(Date.now() - 70 * 24 * 3600 * 1000)
      }
    ];

    vaultProvider = {
      getActiveVaults: vi.fn().mockImplementation(async () => mockVaults),
      updateVaultState: vi.fn().mockImplementation(async (id, state) => {
        const v = mockVaults.find((item) => item.id === id);
        if (v) v.state = state;
      }),
      logEvent: vi.fn().mockResolvedValue(undefined)
    };

    dispatcher = new MockNotificationDispatcher();

    scheduler = new PgBossScheduler({
      connectionString: 'postgres://user:pass@localhost:5432/testdb',
      vaultProvider,
      dispatcher
    });
  });

  it('initializes workers and schedules recurring heartbeat sweeps', async () => {
    await scheduler.start();
    await scheduler.scheduleRecurringHeartbeatSweep('*/15 * * * *');

    expect(scheduler).toBeDefined();
  });

  it('runs heartbeat sweep, transitions state and enqueues escalating notifications via pg-boss', async () => {
    await scheduler.start();
    const now = new Date();

    const count = await scheduler.runHeartbeatSweep(now);
    expect(count).toBe(1);

    expect(vaultProvider.updateVaultState).toHaveBeenCalledWith('vault-1', 'REMINDER_WINDOW');
    expect(vaultProvider.logEvent).toHaveBeenCalledWith(
      'vault-1',
      'STATE_TRANSITION_REMINDER_WINDOW',
      expect.objectContaining({ from: 'ACTIVE', to: 'REMINDER_WINDOW' })
    );

    const boss = (scheduler as unknown as { boss: { send: ReturnType<typeof vi.fn> } }).boss;
    expect(boss.send).toHaveBeenCalledWith(
      QUEUE_DISPATCH_NOTIFICATION,
      expect.objectContaining({
        vaultId: 'vault-1',
        tier: 'REMINDER_30_DAYS'
      })
    );
  });

  it('evaluates challenge window expiry and transitions vault to RELEASED', async () => {
    const challengeVault: WorkerVault = {
      id: 'vault-challenge',
      ownerId: 'owner-2',
      label: 'Cold Storage Escrow',
      state: 'CHALLENGE',
      checkinIntervalDays: 90,
      gracePeriodDays: 30,
      challengeWindowDays: 30,
      lastCheckinAt: new Date('2026-01-01T00:00:00Z'),
      challengeStartedAt: new Date('2026-04-01T00:00:00Z'),
      challengeExpiresAt: new Date('2026-05-01T00:00:00Z'),
      claimingHeirPubkey: 'deadbeefcafe'
    };

    mockVaults = [challengeVault];

    await scheduler.start();

    await scheduler.evaluateChallengeExpiry('vault-challenge', new Date('2026-04-20T00:00:00Z'));
    expect(vaultProvider.updateVaultState).not.toHaveBeenCalled();

    await scheduler.evaluateChallengeExpiry('vault-challenge', new Date('2026-05-01T00:00:01Z'));
    expect(vaultProvider.updateVaultState).toHaveBeenCalledWith('vault-challenge', 'RELEASED');
    expect(vaultProvider.logEvent).toHaveBeenCalledWith(
      'vault-challenge',
      'CHALLENGE_EXPIRED_RELEASE_AUTHORIZED',
      expect.objectContaining({
        heirPubkey: 'deadbeefcafe'
      })
    );

    await scheduler.stop();
  });
});

