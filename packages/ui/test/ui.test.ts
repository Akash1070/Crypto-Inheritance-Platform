import { describe, it, expect } from 'vitest';
import { UI_VERSION } from '../src/index.js';

describe('UI Primitives Baseline', () => {
  it('exports UI version string', () => {
    expect(UI_VERSION).toBe('0.1.0');
  });
});
