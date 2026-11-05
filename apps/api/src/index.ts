import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

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

  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  const app = await buildApp();
  const port = Number(process.env['PORT']) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
}

