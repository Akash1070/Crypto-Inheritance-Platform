import {
  computeEventHash,
  verifySignature
} from '@cip/crypto-core';

export interface AuditEventRecord {
  id: string;
  vaultId: string;
  sequence: number;
  type: string;
  payloadHash: string;
  prevHash: string;
  signature: string;
  createdAt: string; // ISO string
}

export const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface ChainValidationResult {
  valid: boolean;
  claimingHeirPubkey?: string;
  challengeExpiresAt?: Date;
  eventsEvaluated: number;
  error?: string;
}

/**
 * Validates the Merkle audit chain from genesis to head before escrow release is granted.
 * Strict Fail-Closed Execution.
 */
export async function validateChainForRelease(
  vaultId: string,
  events: AuditEventRecord[],
  serverSigningPublicKey: Uint8Array,
  verifiedTime: Date
): Promise<ChainValidationResult> {
  if (!events || events.length === 0) {
    return {
      valid: false,
      eventsEvaluated: 0,
      error: 'CHAIN_VALIDATION_FAILURE: Audit chain is empty'
    };
  }

  let claimInitiatedEvent: AuditEventRecord | null = null;
  let claimInitiatedIndex = -1;
  let pendingStateFound = false;

  // 1. Walk entire chain verifying sequence, hash linkage, and cryptographic signatures
  for (let i = 0; i < events.length; i++) {
    const event = events[i]!;

    if (event.vaultId !== vaultId) {
      return {
        valid: false,
        eventsEvaluated: i,
        error: `CHAIN_TENANT_VIOLATION: Event at sequence ${i} belongs to vault "${event.vaultId}", expected "${vaultId}"`
      };
    }

    if (event.sequence !== i) {
      return {
        valid: false,
        eventsEvaluated: i,
        error: `SEQUENCE_DISCONTINUITY: Expected sequence ${i}, found ${event.sequence}`
      };
    }

    const expectedPrev = i === 0 ? GENESIS_PREV_HASH : events[i - 1]!.payloadHash;
    if (event.prevHash !== expectedPrev) {
      return {
        valid: false,
        eventsEvaluated: i,
        error: `HASH_CHAIN_BROKEN: Sequence ${i} prevHash mismatch (expected ${expectedPrev}, got ${event.prevHash})`
      };
    }

    const expectedHashHex = computeEventHash(
      event.sequence,
      event.type,
      event.payloadHash,
      event.prevHash,
      event.createdAt
    );
    const hashBytes = Buffer.from(expectedHashHex, 'hex');
    const sigBytes = Buffer.from(event.signature, 'hex');

    const isSigValid = await verifySignature(sigBytes, hashBytes, serverSigningPublicKey);
    if (!isSigValid) {
      return {
        valid: false,
        eventsEvaluated: i,
        error: `SIGNATURE_FORGERY_DETECTED: Cryptographic signature failed at sequence ${i}`
      };
    }

    if (event.type === 'PENDING' || event.type === 'STATE_TRANSITION_PENDING') {
      pendingStateFound = true;
    }

    if (event.type === 'CLAIM_INITIATED' || event.type === 'CLAIM_STARTED') {
      if (!pendingStateFound) {
        return {
          valid: false,
          eventsEvaluated: i,
          error: `RELEASE_FORBIDDEN: Claim initiated at sequence ${i} before vault reached PENDING state`
        };
      }
      claimInitiatedEvent = event;
      claimInitiatedIndex = i;
    }
  }

  // 2. Enforce that a valid claim event was recorded following PENDING
  if (!claimInitiatedEvent || claimInitiatedIndex === -1) {
    return {
      valid: false,
      eventsEvaluated: events.length,
      error: 'RELEASE_FORBIDDEN: No CLAIM_INITIATED or CLAIM_STARTED event found in event chain'
    };
  }

  // 3. Scan all subsequent events after CLAIM_INITIATED:
  // Strictly FORBID release if owner performed check-in or cancelled claim
  for (let j = claimInitiatedIndex + 1; j < events.length; j++) {
    const event = events[j]!;

    if (event.type === 'CLAIM_CANCELLED') {
      return {
        valid: false,
        eventsEvaluated: events.length,
        error: `RELEASE_FORBIDDEN: Claim was actively cancelled by owner at sequence ${event.sequence}`
      };
    }

    if (event.type === 'CHECKIN') {
      return {
        valid: false,
        eventsEvaluated: events.length,
        error: `RELEASE_FORBIDDEN: Owner check-in recorded after claim initiation at sequence ${event.sequence}`
      };
    }

    if (event.type === 'VAULT_PAUSED') {
      return {
        valid: false,
        eventsEvaluated: events.length,
        error: `RELEASE_FORBIDDEN: Vault was paused at sequence ${event.sequence}`
      };
    }
  }

  // 4. Validate Elapsed Challenge Window against Multi-Clock verified time
  // Note: the payloadHash contains the hash of { heirPubkey, challengeExpiresAt }
  // We check the event creation timestamp and enforce the mandatory 30-day window
  const claimStartedAt = new Date(claimInitiatedEvent.createdAt);
  const THIRTY_DAYS_MS = 30 * 24 * 3600 * 1000;
  const challengeExpiresAt = new Date(claimStartedAt.getTime() + THIRTY_DAYS_MS);

  if (verifiedTime.getTime() < challengeExpiresAt.getTime()) {
    const remainingSeconds = Math.round((challengeExpiresAt.getTime() - verifiedTime.getTime()) / 1000);
    return {
      valid: false,
      eventsEvaluated: events.length,
      challengeExpiresAt,
      error: `RELEASE_FORBIDDEN: 30-day challenge window is still active (${remainingSeconds}s remaining)`
    };
  }

  return {
    valid: true,
    challengeExpiresAt,
    eventsEvaluated: events.length
  };
}

