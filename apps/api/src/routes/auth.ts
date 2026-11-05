import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  RegistrationOptionsRequestSchema,
  RegistrationVerificationRequestSchema,
  AuthenticationOptionsRequestSchema,
  AuthenticationVerificationRequestSchema,
  StepUpVerificationRequestSchema,
  EmergencyKitVerifyRequestSchema
} from '@cip/protocol';
import {
  generateRegistrationCeremonyOptions,
  verifyRegistrationCeremonyResponse,
  generateAuthenticationCeremonyOptions,
  verifyAuthenticationCeremonyResponse
} from '../auth/webauthn.js';
import { authStore } from '../auth/store.js';
import { computeMnemonicVerifier } from '../auth/mnemonic.js';

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // 1. Registration Options
  fastify.post('/register/options', async (request, reply) => {
    const parseResult = RegistrationOptionsRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { username, email } = parseResult.data;
    const user = await authStore.createUser(username, email);
    const options = await generateRegistrationCeremonyOptions(user.id, user.username);

    return reply.send({ userId: user.id, options });
  });

  // 2. Registration Verify
  fastify.post('/register/verify', async (request, reply) => {
    const parseResult = RegistrationVerificationRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'INVALID_REQUEST', details: parseResult.error.format() });
    }

    const { userId, deviceName, response } = parseResult.data;
    try {
      const result = await verifyRegistrationCeremonyResponse(userId, deviceName, response as any);
      return reply.send(result);
    } catch (err: any) {
      fastify.log.warn({ err }, 'Registration verification failed');
      return reply.status(400).send({ error: 'REGISTRATION_FAILED', message: err.message });
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
      const { userId, sessionId } = await verifyAuthenticationCeremonyResponse(parseResult.data.response as any);

      // Set hardened session cookie
      reply.setCookie('cip-session', sessionId, {
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
    } catch (err: any) {
      fastify.log.warn({ err }, 'Authentication verification failed');
      return reply.status(401).send({ error: 'AUTHENTICATION_FAILED', message: err.message });
    }
  });

  // 5. Step-Up Verification for high-risk actions
  fastify.post('/stepup/verify', async (request, reply) => {
    const sessionId = request.cookies['cip-session'];
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
      await verifyAuthenticationCeremonyResponse(parseResult.data.response as any);
      const stepUpToken = await authStore.createStepUpToken(session.userId, parseResult.data.action);
      return reply.send({ verified: true, stepUpToken, expiresInSeconds: 300 });
    } catch (err: any) {
      return reply.status(400).send({ error: 'STEP_UP_FAILED', message: err.message });
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

    const computedVerifier = computeMnemonicVerifier(mnemonic, user.emergencyKitSalt);
    if (computedVerifier !== user.emergencyKitVerifier) {
      return reply.status(401).send({ error: 'INVALID_CREDENTIALS', message: 'Recovery verification failed' });
    }

    // Set user to recovery pending status with 7-day cooling off period
    user.status = 'RECOVERY_PENDING';
    const recoverySession = await authStore.createSession(user.id, 2);

    return reply.send({
      verified: true,
      status: 'RECOVERY_PENDING',
      message: 'Emergency recovery verified. 7-day security delay initiated. An enrollment session is granted.',
      recoverySessionId: recoverySession.id
    });
  });

  // 7. Get Current User Info & Devices
  fastify.get('/me', async (request, reply) => {
    const sessionId = request.cookies['cip-session'];
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
      id: user.id,
      username: user.username,
      status: user.status,
      credentials: creds.map((c) => ({
        id: c.id,
        deviceName: c.deviceName,
        createdAt: c.createdAt,
        lastUsedAt: c.lastUsedAt
      })),
      minimumMet: creds.length >= 2,
      hasEmergencyKit: Boolean(user.emergencyKitVerifier)
    });
  });

  // 8. Logout
  fastify.post('/logout', async (_request, reply) => {
    reply.clearCookie('cip-session', { path: '/' });
    return reply.send({ success: true });
  });
};
