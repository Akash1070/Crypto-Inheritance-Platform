import { WorkerVault } from './heartbeat.js';

export interface ClaimEventPayload {
  type: 'CLAIM_INITIATED' | 'CLAIM_CANCELLED' | 'CHALLENGE_EXPIRED_RELEASE_AUTHORIZED';
  payload: Record<string, unknown>;
}

export class ClaimEngine {
  /**
   * Initiates an inheritance claim on a vault by an authorized heir.
   * STRICT SECURITY INVARIANT: Vault must be in PENDING state (checkin + grace period fully elapsed).
   */
  static initiateClaim(vault: WorkerVault, claimingHeirPubkey: string, now: Date): ClaimEventPayload {
    if (vault.state !== 'PENDING') {
      throw new Error(`CLAIM_REJECTED: Vault is in ${vault.state} state. Claims can only be initiated when state is PENDING.`);
    }

    const DAY_MS = 24 * 3600 * 1000;
    const challengeExpiresAt = new Date(now.getTime() + vault.challengeWindowDays * DAY_MS);

    vault.state = 'CHALLENGE';
    vault.challengeStartedAt = now;
    vault.challengeExpiresAt = challengeExpiresAt;
    vault.claimingHeirPubkey = claimingHeirPubkey;
    vault.lastNotificationTier = 'CHALLENGE_ACTIVE';
    vault.lastNotificationSentAt = now;

    return {
      type: 'CLAIM_INITIATED',
      payload: {
        heirPubkey: claimingHeirPubkey,
        startedAt: now.toISOString(),
        challengeWindowDays: vault.challengeWindowDays,
        challengeExpiresAt: challengeExpiresAt.toISOString()
      }
    };
  }

  /**
   * Instantly cancels an active claim via owner WebAuthn passkey assertion.
   * Reverts vault back to ACTIVE and resets countdown timer to now.
   */
  static cancelClaim(vault: WorkerVault, reason: string, now: Date): ClaimEventPayload {
    if (vault.state !== 'CHALLENGE') {
      throw new Error(`CANCEL_REJECTED: Vault is not in CHALLENGE state (current: ${vault.state})`);
    }

    const previousHeir = vault.claimingHeirPubkey;

    vault.state = 'ACTIVE';
    vault.lastCheckinAt = now;
    vault.challengeStartedAt = undefined;
    vault.challengeExpiresAt = undefined;
    vault.claimingHeirPubkey = undefined;
    vault.lastNotificationTier = 'NONE';
    vault.lastNotificationSentAt = undefined;

    return {
      type: 'CLAIM_CANCELLED',
      payload: {
        heirPubkey: previousHeir,
        cancelledAt: now.toISOString(),
        reason: reason || 'Owner WebAuthn passkey assertion'
      }
    };
  }

  /**
   * Evaluates whether the mandatory 30-day challenge window has expired without owner cancellation.
   * If expired, transitions state to RELEASED so the release-signer enclave can issue the escrow share.
   */
  static evaluateChallengeExpiry(vault: WorkerVault, now: Date): ClaimEventPayload | null {
    if (vault.state !== 'CHALLENGE' || !vault.challengeExpiresAt) {
      return null;
    }

    if (now.getTime() >= vault.challengeExpiresAt.getTime()) {
      vault.state = 'RELEASED';
      return {
        type: 'CHALLENGE_EXPIRED_RELEASE_AUTHORIZED',
        payload: {
          heirPubkey: vault.claimingHeirPubkey,
          challengeStartedAt: vault.challengeStartedAt?.toISOString(),
          challengeExpiresAt: vault.challengeExpiresAt.toISOString(),
          authorizedAt: now.toISOString()
        }
      };
    }

    return null;
  }
}
