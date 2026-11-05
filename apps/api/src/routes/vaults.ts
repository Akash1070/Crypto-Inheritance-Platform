import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  CreateVaultRequestSchema,
  AddHeirRequestSchema,
  UpdateBlobRequestSchema,
  InitiateClaimRequestSchema,
  CancelClaimRequestSchema,
  BANNED_SECRET_KEYS,
  assertStrongHexSecret
} from '@cip/protocol';
import {
  generateSigningKeyPair,
  deriveSigningKeyPairFromPrivate,
  verifySignature,
  SigningKeyPair
} from '@cip/crypto-core';
import { vaultStore } from '../vaults/store.js';
import { authStore } from '../auth/store.js';
import { eventChainManager } from '../events/hashChain.js';
import { getSessionIdFromRequest } from '../auth/sessionHelper.js';

// Server enclave signing key for Merkle audit chain
let serverSigningKey: SigningKeyPair | null = null;

export async function getServerSigningKey(): Promise<SigningKeyPair> {
  if (!serverSigningKey) {
    const keyHex = process.env['CIP_SERVER_SIGNING_KEY_HEX'];
    if (process.env['NODE_ENV'] === 'production') {
      assertStrongHexSecret(keyHex, 'CIP_SERVER_SIGNING_KEY_HEX', 32);
    }
    if (keyHex) {
      assertStrongHexSecret(keyHex, 'CIP_SERVER_SIGNING_KEY_HEX', 32);
      serverSigningKey = await deriveSigningKeyPairFromPrivate(Buffer.from(keyHex, 'hex'));
    } else {
      serverSigningKey = await generateSigningKeyPair();
    }
  }
  return serverSigningKey;
}

export const vaultRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Pre-handler hook to authenticate session on all vault routes.
  // POST /vaults/:id/claim is heir-authenticated (Ed25519 signature) and must NOT require an owner session.
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method === 'POST' && /\/claim$/.test(request.url)) {
      return;
    }

    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'Missing session cookie' });
    }

    const session = await authStore.getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'SESSION_EXPIRED', message: 'Session expired or invalid' });
    }

    request.userId = session.userId;
  });

  // Global payload guard against accidental secret pasting in request bodies
  fastify.addHook('preValidation', async (request, reply) => {
    if (request.body && typeof request.body === 'object') {
      const keys = Object.keys(request.body as object).map((k) => k.toLowerCase());
      for (const banned of BANNED_SECRET_KEYS) {
        if (keys.includes(banned)) {
          return reply.status(400).send({
            error: 'FORBIDDEN_SECRET_FIELD',
            message: `CRITICAL SECURITY VIOLATION: Request body contains forbidden secret key '${banned}'. The web platform never accepts plaintext keys or seed phrases.`
          });
        }
      }
    }
  });

  // 1. Create Vault
  fastify.post('/', async (request, reply) => {
    const userId = request.userId!;
    const parseResult = CreateVaultRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        details: parseResult.error.format()
      });
    }

    const { label, config, ciphertextEnvelope, sealedEscrowShare } = parseResult.data;

    // Verify envelope format
    try {
      const parsedEnvelope = JSON.parse(ciphertextEnvelope);
      if (parsedEnvelope.magic !== 'CIP_VAULT') {
        return reply.status(400).send({ error: 'INVALID_ENVELOPE', message: 'Invalid vault package magic' });
      }
    } catch {
      return reply.status(400).send({ error: 'INVALID_ENVELOPE', message: 'Malformed JSON ciphertext envelope' });
    }

    const vaultConfig = config || {
      checkinIntervalDays: 90,
      gracePeriodDays: 30,
      challengeWindowDays: 30
    };

    const { vault } = await vaultStore.createVault(
      userId,
      label,
      vaultConfig,
      ciphertextEnvelope,
      sealedEscrowShare
    );

    const signingKey = await getServerSigningKey();
    const event = await eventChainManager.appendEvent(
      vault.id,
      'VAULT_CREATED',
      { ownerId: userId, label, version: 1 },
      signingKey
    );

    return reply.status(201).send({
      vaultId: vault.id,
      label: vault.label,
      state: vault.state,
      version: vault.version,
      eventChainHead: event.payloadHash,
      createdAt: vault.createdAt
    });
  });

  // 2. List Vaults for Owner (Tenant Isolation)
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const list = await vaultStore.getVaultsByOwner(userId);

    return reply.send({
      vaults: list.map((v) => ({
        id: v.id,
        label: v.label,
        state: v.state,
        checkinIntervalDays: v.checkinIntervalDays,
        gracePeriodDays: v.gracePeriodDays,
        challengeWindowDays: v.challengeWindowDays,
        lastCheckinAt: v.lastCheckinAt,
        version: v.version,
        createdAt: v.createdAt
      }))
    });
  });

  // 3. Get Vault by ID
  fastify.get('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const heirs = await vaultStore.getHeirs(vault.id);
    const events = await eventChainManager.getEvents(vault.id);
    const headEvent = events[events.length - 1];

    return reply.send({
      id: vault.id,
      label: vault.label,
      state: vault.state,
      checkinIntervalDays: vault.checkinIntervalDays,
      gracePeriodDays: vault.gracePeriodDays,
      challengeWindowDays: vault.challengeWindowDays,
      lastCheckinAt: vault.lastCheckinAt,
      version: vault.version,
      heirsCount: heirs.length,
      eventSequenceHead: headEvent ? headEvent.sequence : -1,
      createdAt: vault.createdAt
    });
  });

  // 4. Get Latest Blob Ciphertext
  fastify.get('/:id/blob', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const blob = await vaultStore.getLatestBlob(vault.id);
    if (!blob) {
      return reply.status(404).send({ error: 'BLOB_NOT_FOUND' });
    }

    return reply.send({
      version: blob.version,
      ciphertextEnvelope: blob.ciphertextEnvelope,
      ciphertextSha256: blob.ciphertextSha256,
      sizeBytes: blob.sizeBytes,
      createdAt: blob.createdAt
    });
  });

  // 5. Update Ciphertext Blob
  fastify.put('/:id/blob', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const parseResult = UpdateBlobRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const blob = await vaultStore.updateCiphertext(vault.id, parseResult.data.ciphertextEnvelope);
    const signingKey = await getServerSigningKey();
    await eventChainManager.appendEvent(
      vault.id,
      'VAULT_BLOB_UPDATED',
      { version: blob.version, hash: blob.ciphertextSha256 },
      signingKey
    );

    return reply.send({
      version: blob.version,
      ciphertextSha256: blob.ciphertextSha256,
      sizeBytes: blob.sizeBytes
    });
  });

  // 6. Check-in (Liveness Assertion)
  fastify.post('/:id/checkin', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const updated = await vaultStore.updateLastCheckin(vault.id);
    if (!updated) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }
    const signingKey = await getServerSigningKey();
    const event = await eventChainManager.appendEvent(
      vault.id,
      'CHECKIN',
      { timestamp: updated.lastCheckinAt.toISOString() },
      signingKey
    );

    return reply.send({
      success: true,
      state: updated.state,
      lastCheckinAt: updated.lastCheckinAt,
      eventSequence: event.sequence
    });
  });

  // 7. Pause and Resume Vault Countdown
  fastify.post('/:id/pause', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }
    if (vault.state === 'CHALLENGE' || vault.state === 'PAUSED') {
      return reply.status(409).send({ error: 'VAULT_STATE_TRANSITION_FORBIDDEN', message: `Vault cannot be paused from state ${vault.state}` });
    }

    const updated = await vaultStore.pauseVault(vault.id);
    if (!updated) {
      return reply.status(409).send({ error: 'VAULT_STATE_TRANSITION_FORBIDDEN' });
    }
    const signingKey = await getServerSigningKey();
    await eventChainManager.appendEvent(vault.id, 'VAULT_PAUSED', { pausedAt: new Date().toISOString() }, signingKey);

    return reply.send({ success: true, state: updated.state });
  });

  fastify.post('/:id/resume', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }
    if (vault.state !== 'PAUSED') {
      return reply.status(409).send({ error: 'VAULT_STATE_TRANSITION_FORBIDDEN', message: `Only paused vaults can be resumed (current: ${vault.state})` });
    }

    const updated = await vaultStore.resumeVault(vault.id);
    if (!updated) {
      return reply.status(409).send({ error: 'VAULT_STATE_TRANSITION_FORBIDDEN' });
    }
    const signingKey = await getServerSigningKey();
    await eventChainManager.appendEvent(vault.id, 'VAULT_RESUMED', { resumedAt: new Date().toISOString() }, signingKey);

    return reply.send({ success: true, state: updated.state });
  });

  // 8. Add Heir with Step-Up Token requirement
  fastify.post('/:id/heirs', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    // Step-up token validation for high-risk action
    const stepUpToken = request.headers['x-cip-stepup'] as string | undefined;
    if (!stepUpToken) {
      return reply.status(403).send({
        error: 'STEP_UP_REQUIRED',
        message: 'High-risk action: Fresh passkey biometric step-up authentication required.'
      });
    }

    const verifiedStepUpUser = await authStore.verifyAndConsumeStepUpToken(stepUpToken, 'ADD_HEIR');
    if (!verifiedStepUpUser || verifiedStepUpUser !== userId) {
      return reply.status(403).send({ error: 'INVALID_STEP_UP_TOKEN', message: 'Step-up token expired or invalid' });
    }

    const parseResult = AddHeirRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { label, heirPubkey, wrappedHeirShare } = parseResult.data;
    const heir = await vaultStore.addHeir(vault.id, label, heirPubkey, wrappedHeirShare);

    const signingKey = await getServerSigningKey();
    await eventChainManager.appendEvent(
      vault.id,
      'HEIR_ADDED',
      { heirId: heir.id, label, heirPubkey },
      signingKey
    );

    return reply.status(201).send({
      heirId: heir.id,
      label: heir.label,
      heirPubkey: heir.heirPubkey,
      status: heir.status
    });
  });

  // 9. Get Merkle Event Chain Audit Log
  fastify.get('/:id/events', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const chain = await eventChainManager.getEvents(vault.id);
    const signingKey = await getServerSigningKey();

    return reply.send({
      vaultId: vault.id,
      serverPublicKey: Buffer.from(signingKey.publicKey).toString('hex'),
      eventsCount: chain.length,
      events: chain
    });
  });

  // 10. Verify Merkle Event Chain Integrity
  fastify.get('/:id/events/verify', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const signingKey = await getServerSigningKey();
    const verification = await eventChainManager.verifyEventChain(vault.id, signingKey.publicKey);

    return reply.send(verification);
  });

  // 11. Initiate Heir Claim (Authenticated by heir Ed25519 signature over canonical claim message)
  const claimNonces = new Map<string, number>();

  function pruneClaimNonces(nowMs: number) {
    for (const [nonce, expiresAt] of claimNonces.entries()) {
      if (expiresAt < nowMs) claimNonces.delete(nonce);
    }
  }

  fastify.post('/:id/claim', async (request, reply) => {
    const { id } = request.params as { id: string };

    const parseResult = InitiateClaimRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { heirPubkey, timestamp, nonce, claimSignature } = parseResult.data;

    const nowMs = Date.now();
    const claimTs = new Date(timestamp).getTime();
    if (Number.isNaN(claimTs) || Math.abs(nowMs - claimTs) > 5 * 60 * 1000) {
      return reply.status(403).send({ error: 'STALE_CLAIM_SIGNATURE', message: 'Claim signature timestamp is outside the freshness window' });
    }

    pruneClaimNonces(nowMs);
    const nonceKey = `${id}:${nonce}`;
    if (claimNonces.has(nonceKey)) {
      return reply.status(403).send({ error: 'REPLAYED_CLAIM', message: 'Claim nonce has already been used' });
    }

    const vault = await vaultStore.getVaultById(id);
    if (!vault) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    const heirs = await vaultStore.getHeirs(vault.id);
    const heir = heirs.find((h) => h.heirPubkey.toLowerCase() === heirPubkey.toLowerCase() && h.status === 'ACTIVE');
    if (!heir) {
      return reply.status(403).send({ error: 'HEIR_NOT_AUTHORIZED', message: 'Heir public key not registered on this vault' });
    }

    const canonicalMessage = `CIP_CLAIM:v1:${vault.id}:${heirPubkey}:${timestamp}:${nonce}`;
    const signatureValid = await verifySignature(
      Buffer.from(claimSignature, 'hex'),
      new TextEncoder().encode(canonicalMessage),
      Buffer.from(heirPubkey, 'hex')
    );
    if (!signatureValid) {
      return reply.status(403).send({ error: 'INVALID_CLAIM_SIGNATURE', message: 'Heir claim signature verification failed' });
    }

    claimNonces.set(nonceKey, nowMs + 10 * 60 * 1000);

    try {
      const updated = await vaultStore.initiateClaim(vault.id, heirPubkey);
      const signingKey = await getServerSigningKey();
      const event = await eventChainManager.appendEvent(
        vault.id,
        'CLAIM_INITIATED',
        {
          heirPubkey,
          heirId: heir.id,
          challengeExpiresAt: updated.challengeExpiresAt?.toISOString()
        },
        signingKey
      );

      return reply.send({
        success: true,
        state: updated.state,
        challengeExpiresAt: updated.challengeExpiresAt,
        eventSequence: event.sequence
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claim initiation failed';
      return reply.status(400).send({ error: 'CLAIM_FAILED', message });
    }
  });

  // 12. Cancel Active Claim by Owner (Instant Passkey Assertion)
  fastify.post('/:id/claim/cancel', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const parseResult = CancelClaimRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { stepUpToken, reason } = parseResult.data;
    const consumedUserId = await authStore.verifyAndConsumeStepUpToken(stepUpToken, 'CANCEL_CLAIM');
    if (!consumedUserId || consumedUserId !== userId) {
      return reply.status(403).send({ error: 'STEP_UP_REQUIRED', message: 'Valid step-up token required to cancel claim' });
    }

    const vault = await vaultStore.getVaultById(id);
    if (!vault || vault.ownerId !== userId) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
    }

    try {
      const updated = await vaultStore.cancelClaim(vault.id);
      const signingKey = await getServerSigningKey();
      const event = await eventChainManager.appendEvent(
        vault.id,
        'CLAIM_CANCELLED',
        {
          cancelledBy: userId,
          reason: reason || 'Owner passkey assertion',
          timestamp: new Date().toISOString()
        },
        signingKey
      );

      return reply.send({
        success: true,
        state: updated.state,
        lastCheckinAt: updated.lastCheckinAt,
        eventSequence: event.sequence
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claim cancellation failed';
      return reply.status(400).send({ error: 'CANCEL_FAILED', message });
    }
  });
};

