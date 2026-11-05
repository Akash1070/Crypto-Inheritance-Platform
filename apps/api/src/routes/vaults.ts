import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  CreateVaultRequestSchema,
  AddHeirRequestSchema,
  UpdateBlobRequestSchema,
  BANNED_SECRET_KEYS
} from '@cip/protocol';
import { generateSigningKeyPair, SigningKeyPair } from '@cip/crypto-core';
import { vaultStore } from '../vaults/store.js';
import { authStore } from '../auth/store.js';
import { eventChainManager } from '../events/hashChain.js';

// Server enclave signing key for Merkle audit chain
let serverSigningKey: SigningKeyPair | null = null;

export async function getServerSigningKey(): Promise<SigningKeyPair> {
  if (!serverSigningKey) {
    serverSigningKey = await generateSigningKeyPair();
  }
  return serverSigningKey;
}

export const vaultRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Pre-handler hook to authenticate session on all vault routes
  fastify.addHook('preHandler', async (request, reply) => {
    const sessionId = request.cookies['cip-session'];
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

    const updated = await vaultStore.updateVaultState(vault.id, 'PAUSED');
    if (!updated) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
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

    const updated = await vaultStore.updateVaultState(vault.id, 'ACTIVE');
    if (!updated) {
      return reply.status(404).send({ error: 'VAULT_NOT_FOUND' });
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
};

