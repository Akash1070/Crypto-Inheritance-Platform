import { describe, it, expect } from 'vitest';
import { CIP_CRYPTO_VERSION, CIP_SUITE_ID } from '../src/index.js';

describe('Crypto Core Baseline', () => {
  it('exports expected suite ID and version', () => {
    expect(CIP_CRYPTO_VERSION).toBe('0.1.0');
    expect(CIP_SUITE_ID).toBe(0x0001);
  });
});

