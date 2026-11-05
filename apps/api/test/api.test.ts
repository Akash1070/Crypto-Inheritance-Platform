import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/index.js';

describe('API Baseline', () => {
  it('responds with healthy status on /health endpoint', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('healthy');
  });
});

