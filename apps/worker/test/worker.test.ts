import { describe, it, expect } from 'vitest';
import { runHeartbeatCheck } from '../src/index.js';

describe('Worker Baseline', () => {
  it('returns idle status on clean execution', async () => {
    const result = await runHeartbeatCheck();
    expect(result.status).toBe('idle');
  });
});

