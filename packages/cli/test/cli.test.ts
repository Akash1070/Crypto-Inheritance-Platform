import { describe, it, expect } from 'vitest';
import { createCli } from '../src/index.js';

describe('CLI Baseline', () => {
  it('creates commander instance with name cip', () => {
    const cli = createCli();
    expect(cli.name()).toBe('cip');
  });
});
