import { describe, it, expect } from 'vitest';
import { zeroize } from '../src/index.js';

describe('zeroize utility', () => {
  it('overwrites all bytes with zeros', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5, 255]);
    zeroize(buffer);
    expect(buffer).toEqual(new Uint8Array([0, 0, 0, 0, 0, 0]));
  });
});

