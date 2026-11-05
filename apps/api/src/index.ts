import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import { assertStrongSecret } from '@cip/protocol';
import { authRoutes } from './routes/auth.js';
import { vaultRoutes } from './routes/vaults.js';
import { hasDatabase, ensureDatabase, getPool } from './db/index.js';
import { PgRateLimiter } from './security/rateLimit.js';

function assertBootSecrets() {
  if (process.env['NODE_ENV'] === 'production') {
    assertStrongSecret(process.env['CIP_COOKIE_SECRET'], 'CIP_COOKIE_SECRET');
    if (!hasDatabase()) {
      throw new Error('DATABASE_URL is required in production');
    }
  }
}

export async function buildApp() {
  assertBootSecrets();

  if (hasDatabase()) {
    await ensureDatabase();
  }

  const app = Fastify({
    trustProxy: process.env['CIP_TRUSTED_PROXY'] === 'true',
    bodyLimit: 1_048_576,
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie']
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        requireTrustedTypesFor: ["'script'"]
      }
    },
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: { policy: 'require-corp' },
    crossOriginResourcePolicy: { policy: 'same-origin' }
  });

  await app.register(cors, {
    origin: process.env['CIP_WEB_ORIGIN'] || 'http://localhost:5173',
    credentials: true
  });

  const cookieSecret = process.env['CIP_COOKIE_SECRET'] || 'cip-local-dev-cookie-secret';
  if (process.env['NODE_ENV'] === 'production' && !process.env['CIP_COOKIE_SECRET']) {
    throw new Error('CIP_COOKIE_SECRET is required in production');
  }

  await app.register(cookie, {
    secret: cookieSecret,
    parseOptions: {}
  });

  if (hasDatabase()) {
    const limiter = new PgRateLimiter(getPool());
    app.addHook('preHandler', async (request, reply) => {
      if (request.url === '/health' || request.url.startsWith('/health')) {
        return;
      }
      const ip = request.ip || 'unknown';
      const path = request.url.split('?')[0] || '/';
      let limit = 100;
      let windowSeconds = 60;
      if (path.startsWith('/auth/')) {
        limit = 20;
        windowSeconds = 60;
      } else if (path.startsWith('/vaults') && request.method !== 'GET') {
        limit = 60;
        windowSeconds = 60;
      }
      const allowed = await limiter.consume(`${ip}:${request.method}:${path}`, limit, windowSeconds);
      if (!allowed) {
        return reply.status(429).send({ error: 'RATE_LIMITED', message: 'Too many requests. Please retry shortly.' });
      }
    });
  } else {
    await app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });
  }

  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register Auth Routes
  await app.register(authRoutes, { prefix: '/auth' });

  // Register Vault Coordination Routes
  await app.register(vaultRoutes, { prefix: '/vaults' });

  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  const app = await buildApp();
  const port = Number(process.env['PORT']) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
}
