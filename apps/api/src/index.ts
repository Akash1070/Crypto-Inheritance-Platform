import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import { authRoutes } from './routes/auth.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie']
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: true
  });

  await app.register(cors, {
    origin: process.env['CIP_WEB_ORIGIN'] || 'http://localhost:5173',
    credentials: true
  });

  await app.register(cookie, {
    secret: process.env['CIP_COOKIE_SECRET'] || 'cip-super-secret-local-dev-key-must-be-changed-in-prod-32bytes',
    parseOptions: {}
  });

  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Register Auth Routes
  await app.register(authRoutes, { prefix: '/auth' });

  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  const app = await buildApp();
  const port = Number(process.env['PORT']) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
}
