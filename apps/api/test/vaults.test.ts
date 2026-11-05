import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/index.js';
import { authStore } from '../src/auth/store.js';
import { vaultStore } from '../src/vaults/store.js';
import { eventChainManager } from '../src/events/hashChain.js';
import { getServerSigningKey } from '../src/routes/vaults.js';

describe('Vault Coordination API & Tamper-Proof Event Chaining', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let userA: any;
  let userB: any;
  let sessionCookieA: string;
  let sessionCookieB: string;

  const validEnvelopeJson = JSON.stringify({
    magic: 'CIP_VAULT',
    formatVersion: 1,
    suiteId: 1,
    vaultId: '11111111-2222-3333-4444-555555555555',
    createdAt: new Date().toISOString(),
    nonce: 'bm9uY2UtMjQtYnl0ZXM=',
    ciphertext: 'Y2lwaGVydGV4dC1kYXRh',
    metadataHash: '0000000000000000000000000000000000000000000000000000000000000000'
  });

  beforeEach(async () => {
    app = await buildApp();

    userA = await authStore.createUser('alice_vault_owner', 'alice@vault.org');
    userB = await authStore.createUser('bob_intruder', 'bob@vault.org');

    const sessionA = await authStore.createSession(userA.id);
    const sessionB = await authStore.createSession(userB.id);

    sessionCookieA = `cip-session=${sessionA.id}`;
    sessionCookieB = `cip-session=${sessionB.id}`;
  });

  describe('Strict Secret Rejection & Schema Validation', () => {
    it('rejects unauthenticated vault creation attempts', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/vaults',
        payload: {
          label: 'Cold Hardware Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      expect(res.statusCode).toBe(401);
    });

    it('strictly rejects request bodies containing forbidden secret keys (e.g. seed, mnemonic)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Hardware Safe',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow',
          seed: 'abandon abandon abandon' // FORBIDDEN!
        }
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('FORBIDDEN_SECRET_FIELD');
    });

    it('strictly rejects accidental seed phrase pasting in text fields (e.g. label)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'abandon ability able about above absent absorb abstract absurd abuse access accident', // 12 BIP-39 words!
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.payload);
      expect(body.error).toBe('INVALID_REQUEST');
      expect(JSON.stringify(body.details).includes('Potential seed phrase')).toBe(true);
    });
  });

  describe('Vault Lifecycle & Tenant Isolation', () => {
    it('creates vault, stores ciphertext, and initializes Merkle hash chain', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Ledger Cold Recovery Vault',
          config: {
            checkinIntervalDays: 90,
            gracePeriodDays: 60,
            challengeWindowDays: 30
          },
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow-data'
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.vaultId).toBeDefined();
      expect(body.state).toBe('ACTIVE');
      expect(body.version).toBe(1);
      expect(body.eventChainHead).toBeDefined();

      // Verify blob is stored
      const blobRes = await app.inject({
        method: 'GET',
        url: `/vaults/${body.vaultId}/blob`,
        headers: { cookie: sessionCookieA }
      });
      expect(blobRes.statusCode).toBe(200);
      const blobBody = JSON.parse(blobRes.payload);
      expect(blobBody.ciphertextEnvelope).toBe(validEnvelopeJson);
    });

    it('enforces strict tenant isolation (User B cannot access User A vault)', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Alice Private Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);

      // User B attempts to access User A's vault
      const intruderRes = await app.inject({
        method: 'GET',
        url: `/vaults/${vaultId}`,
        headers: { cookie: sessionCookieB }
      });

      expect(intruderRes.statusCode).toBe(404);
    });

    it('performs liveness check-in and records CHECKIN event in Merkle chain', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Heartbeat Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);

      const checkinRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/checkin`,
        headers: { cookie: sessionCookieA }
      });

      expect(checkinRes.statusCode).toBe(200);
      const body = JSON.parse(checkinRes.payload);
      expect(body.success).toBe(true);
      expect(body.eventSequence).toBe(1); // sequence 0 was VAULT_CREATED
    });

    it('pauses and resumes vault countdown and chains events', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Travel Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);

      // Pause
      const pauseRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/pause`,
        headers: { cookie: sessionCookieA }
      });
      expect(pauseRes.statusCode).toBe(200);
      expect(JSON.parse(pauseRes.payload).state).toBe('PAUSED');

      // Resume
      const resumeRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/resume`,
        headers: { cookie: sessionCookieA }
      });
      expect(resumeRes.statusCode).toBe(200);
      expect(JSON.parse(resumeRes.payload).state).toBe('ACTIVE');
    });

    it('requires fresh step-up token to add an heir', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Heir Protected Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);
      const heirPayload = {
        label: 'My Son David',
        heirPubkey: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff',
        wrappedHeirShare: 'hex-sealed-heir-share-data'
      };

      // 1. Attempt without step-up token -> 403
      const forbiddenRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/heirs`,
        headers: { cookie: sessionCookieA },
        payload: heirPayload
      });
      expect(forbiddenRes.statusCode).toBe(403);
      expect(JSON.parse(forbiddenRes.payload).error).toBe('STEP_UP_REQUIRED');

      // 2. Issue step-up token
      const stepUpToken = await authStore.createStepUpToken(userA.id, 'ADD_HEIR');

      // 3. Succeeds with valid step-up token
      const successRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/heirs`,
        headers: {
          cookie: sessionCookieA,
          'x-cip-stepup': stepUpToken
        },
        payload: heirPayload
      });
      expect(successRes.statusCode).toBe(201);
      const heirBody = JSON.parse(successRes.payload);
      expect(heirBody.label).toBe('My Son David');
    });
  });

  describe('Merkle Event Chain Cryptographic Verification', () => {
    it('verifies untampered event chain integrity', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Audit Chain Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);

      // Perform checkin
      await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/checkin`,
        headers: { cookie: sessionCookieA }
      });

      // Verify chain via API
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/vaults/${vaultId}/events/verify`,
        headers: { cookie: sessionCookieA }
      });

      expect(verifyRes.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyRes.payload);
      expect(verifyBody.valid).toBe(true);
      expect(verifyBody.headSequence).toBe(1);
    });

    it('detects and fails closed when an event in the chain is tampered with', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Tamper Test Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });

      const { vaultId } = JSON.parse(createRes.payload);

      // Tamper with the stored event's payloadHash
      const events = await eventChainManager.getEvents(vaultId);
      events[0]!.payloadHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      const verifyRes = await app.inject({
        method: 'GET',
        url: `/vaults/${vaultId}/events/verify`,
        headers: { cookie: sessionCookieA }
      });

      expect(verifyRes.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyRes.payload);
      expect(verifyBody.valid).toBe(false);
      expect(verifyBody.error?.includes('signature forgery or tamper')).toBe(true);
    });
  });

  describe('Heir Claim Initiation & Owner Cancellation API', () => {
    it('handles the complete claim and owner cancellation lifecycle with step-up verification', async () => {
      // Create user B as heir
      const userHeir = await authStore.createUser('heir_bob', 'bob@example.com');
      const heirSession = await authStore.createSession(userHeir.id);
      const heirCookie = `cip-session=${heirSession.id}`;

      // Create vault under user A
      const createRes = await app.inject({
        method: 'POST',
        url: '/vaults',
        headers: { cookie: sessionCookieA },
        payload: {
          label: 'Estate Trust Vault',
          ciphertextEnvelope: validEnvelopeJson,
          sealedEscrowShare: 'hex-sealed-escrow'
        }
      });
      const { vaultId } = JSON.parse(createRes.payload);

      // Register heir on vault
      const heirPubkey = '33'.repeat(32);
      const addHeirStepUp = await authStore.createStepUpToken(userA.id, 'ADD_HEIR');
      const addHeirRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/heirs`,
        headers: {
          cookie: sessionCookieA,
          'x-cip-stepup': addHeirStepUp
        },
        payload: {
          label: 'Son Bob',
          heirPubkey,
          wrappedHeirShare: 'sealed-heir-share-data'
        }
      });
      expect(addHeirRes.statusCode).toBe(201);

      // 1. Heir attempt to claim while ACTIVE fails
      const claimStepUp1 = await authStore.createStepUpToken(userHeir.id, 'INITIATE_CLAIM');
      const prematureClaimRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/claim`,
        headers: { cookie: heirCookie },
        payload: {
          heirPubkey,
          stepUpToken: claimStepUp1
        }
      });
      expect(prematureClaimRes.statusCode).toBe(400);
      expect(JSON.parse(prematureClaimRes.payload).error).toBe('CLAIM_FAILED');

      // 2. Transition vault to PENDING (e.g. interval + grace elapsed)
      await vaultStore.updateVaultState(vaultId, 'PENDING');

      // 3. Heir claims with step-up token
      const claimStepUp2 = await authStore.createStepUpToken(userHeir.id, 'INITIATE_CLAIM');
      const validClaimRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/claim`,
        headers: { cookie: heirCookie },
        payload: {
          heirPubkey,
          stepUpToken: claimStepUp2
        }
      });
      expect(validClaimRes.statusCode).toBe(200);
      const claimBody = JSON.parse(validClaimRes.payload);
      expect(claimBody.state).toBe('CHALLENGE');
      expect(claimBody.challengeExpiresAt).toBeDefined();

      // 4. Owner receives challenge notification and immediately cancels via passkey assertion
      const cancelStepUp = await authStore.createStepUpToken(userA.id, 'CANCEL_CLAIM');
      const cancelRes = await app.inject({
        method: 'POST',
        url: `/vaults/${vaultId}/claim/cancel`,
        headers: { cookie: sessionCookieA },
        payload: {
          stepUpToken: cancelStepUp,
          reason: 'I am alive and healthy'
        }
      });
      expect(cancelRes.statusCode).toBe(200);
      const cancelBody = JSON.parse(cancelRes.payload);
      expect(cancelBody.state).toBe('ACTIVE');

      // 5. Verify the full cryptographic Merkle hash chain contains the events
      const chainRes = await app.inject({
        method: 'GET',
        url: `/vaults/${vaultId}/events`,
        headers: { cookie: sessionCookieA }
      });
      const chainBody = JSON.parse(chainRes.payload);
      const eventTypes = chainBody.events.map((e: { type: string }) => e.type);
      expect(eventTypes).toContain('VAULT_CREATED');
      expect(eventTypes).toContain('HEIR_ADDED');
      expect(eventTypes).toContain('CLAIM_INITIATED');
      expect(eventTypes).toContain('CLAIM_CANCELLED');

      // Verify chain integrity
      const verifyRes = await app.inject({
        method: 'GET',
        url: `/vaults/${vaultId}/events/verify`,
        headers: { cookie: sessionCookieA }
      });
      expect(JSON.parse(verifyRes.payload).valid).toBe(true);
    });
  });
});

