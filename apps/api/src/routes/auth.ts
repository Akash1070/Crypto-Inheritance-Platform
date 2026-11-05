import { FastifyInstance } from 'fastify';
import {
  RegistrationOptionsRequestSchema,
  RegistrationVerificationRequestSchema,
  AuthenticationOptionsRequestSchema,
  AuthenticationVerificationRequestSchema,
  StepUpVerificationRequestSchema,
  EmergencyKitVerifyRequestSchema
} from '@cip/protocol';
import { SESSION_COOKIE_NAME, getSessionIdFromRequest } from '../auth/sessionHelper.js';
import {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/server';
import { authStore } from '../auth/store.js';
import {
  generateRegistrationCeremonyOptions,
  verifyRegistrationCeremonyResponse,
  generateAuthenticationCeremonyOptions,
  verifyAuthenticationCeremonyResponse
} from '../auth/webauthn.js';
import { computeMnemonicVerifier } from '../auth/mnemonic.js';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. Registration Options (no account created; no username enumeration)
  fastify.post('/register/options', async (request, reply) => {
    const parseResult = RegistrationOptionsRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { username, email } = parseResult.data;
    const pendingUserId = globalThis.crypto.randomUUID();
    await authStore.savePendingRegistration(pendingUserId, username, email);
    const options = await generateRegistrationCeremonyOptions(pendingUserId, username);
    return reply.send({ userId: pendingUserId, options });
  });

  // 2. Registration Verify
  fastify.post('/register/verify', async (request, reply) => {
    const parseResult = RegistrationVerificationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { userId, deviceName, response } = parseResult.data;
    const pending = await authStore.consumePendingRegistration(userId);
    if (!pending) {
      return reply.status(400).send({ error: 'NO_PENDING_REGISTRATION', message: 'Registration session not found or expired' });
    }

    let createdUserId: string | undefined;
    try {
      try {
        const user = await authStore.createUser(pending.username, pending.email);
        createdUserId = user.id;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : '';
        if (message === 'USER_ALREADY_EXISTS') {
          return reply.status(409).send({ error: 'USERNAME_TAKEN', message: 'This username is already registered.' });
        }
        throw err;
      }

      const result = await verifyRegistrationCeremonyResponse(
        userId,
        deviceName,
        response as unknown as RegistrationResponseJSON
      );
      return reply.send(result);
    } catch (err: unknown) {
      if (createdUserId) {
        await authStore.deleteUser(createdUserId);
      }
      const message = err instanceof Error ? err.message : 'Registration verification failed';
      fastify.log.warn({ err }, 'Registration verification failed');
      return reply.status(400).send({ error: 'REGISTRATION_FAILED', message });
    }
  });

  // 2b. Authenticated Add Passkey Options (for adding backup key)
  fastify.post('/passkeys/add/options', async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }
    const session = await authStore.getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'SESSION_EXPIRED' });
    }
    const user = await authStore.getUserById(session.userId);
    if (!user) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    }
    const options = await generateRegistrationCeremonyOptions(user.id, user.username);
    return reply.send({ userId: user.id, options });
  });

  // 2c. Authenticated Add Passkey Verify
  fastify.post('/passkeys/add/verify', async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }
    const session = await authStore.getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'SESSION_EXPIRED' });
    }
    const parseResult = RegistrationVerificationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }
    const { userId, deviceName, response } = parseResult.data;
    if (userId !== session.userId) {
      return reply.status(403).send({ error: 'FORBIDDEN', message: 'Cannot add credentials to another user' });
    }
    try {
      const result = await verifyRegistrationCeremonyResponse(
        userId,
        deviceName,
        response as unknown as RegistrationResponseJSON
      );
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration verification failed';
      return reply.status(400).send({ error: 'REGISTRATION_FAILED', message });
    }
  });

  // 3. Login Options
  fastify.post('/login/options', async (request, reply) => {
    const parseResult = AuthenticationOptionsRequestSchema.safeParse(request.body || {});
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const options = await generateAuthenticationCeremonyOptions(parseResult.data.username);
    return reply.send({ options });
  });

  // 4. Login Verify
  fastify.post('/login/verify', async (request, reply) => {
    const parseResult = AuthenticationVerificationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    try {
      const { userId, sessionId } = await verifyAuthenticationCeremonyResponse(
        parseResult.data.response as unknown as AuthenticationResponseJSON
      );

      // Set hardened session cookie
      reply.setCookie(SESSION_COOKIE_NAME, sessionId, {
        path: '/',
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 24 * 3600
      });

      const creds = await authStore.getCredentialsForUser(userId);
      return reply.send({
        verified: true,
        userId,
        credentialsCount: creds.length,
        hasBackupKey: creds.length >= 2
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication verification failed';
      fastify.log.warn({ err }, 'Authentication verification failed');
      return reply.status(401).send({ error: 'AUTHENTICATION_FAILED', message });
    }
  });

  // 5. Step-Up Verification for high-risk actions
  fastify.post('/stepup/verify', async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }

    const session = await authStore.getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'SESSION_EXPIRED' });
    }

    const parseResult = StepUpVerificationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    try {
      await verifyAuthenticationCeremonyResponse(
        parseResult.data.response as unknown as AuthenticationResponseJSON
      );
      const stepUpToken = await authStore.createStepUpToken(
        session.userId,
        parseResult.data.action,
        300,
        parseResult.data.vaultId
      );
      return reply.send({ verified: true, stepUpToken, expiresInSeconds: 300 });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Step-up verification failed';
      return reply.status(400).send({ error: 'STEP_UP_FAILED', message });
    }
  });

  // 6. Emergency Kit Verification
  fastify.post('/emergency-kit/verify', async (request, reply) => {
    const parseResult = EmergencyKitVerifyRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { username, mnemonic } = parseResult.data;
    const user = await authStore.getUserByName(username);
    if (!user || !user.emergencyKitVerifier || !user.emergencyKitSalt) {
      // Uniform generic error to prevent account enumeration
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Recovery verification failed' });
    }

    let computedVerifier: string;
    try {
      computedVerifier = await computeMnemonicVerifier(mnemonic, user.emergencyKitSalt);
    } catch {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Recovery verification failed' });
    }
    if (computedVerifier !== user.emergencyKitVerifier) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Recovery verification failed' });
    }

    // Set user to recovery pending status with 7-day cooling off period
    user.status = 'RECOVERY_PENDING';
    const recoverySession = await authStore.createSession(user.id, 2);
    const coolingOffExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    return reply.send({
      verified: true,
      status: 'RECOVERY_PENDING',
      coolingOffExpiresAt: coolingOffExpiresAt.toISOString(),
      message: 'Emergency recovery verified. 7-day security delay initiated. An enrollment session is granted.',
      recoverySessionId: recoverySession.id
    });
  });

  // 7. Get Current Session Info
  fastify.get('/me', async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);
    if (!sessionId) {
      return reply.status(401).send({ error: 'UNAUTHORIZED' });
    }

    const session = await authStore.getSession(sessionId);
    if (!session) {
      return reply.status(401).send({ error: 'SESSION_EXPIRED' });
    }

    const user = await authStore.getUserById(session.userId);
    if (!user) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    }

    const creds = await authStore.getCredentialsForUser(user.id);

    return reply.send({
      userId: user.id,
      username: user.username,
      status: user.status,
      credentialsCount: creds.length,
      hasBackupKey: creds.length >= 2
    });
  });

  // 8. Logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = getSessionIdFromRequest(request);
    if (sessionId) {
      await authStore.deleteSession(sessionId);
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return reply.send({ success: true });
  });
}
