import { describe, it, expect } from 'vitest';
import { VaultStateSchema, VaultConfigSchema, EventTypeSchema } from '../src/index.js';

describe('Protocol Validation Schemas', () => {
  it('validates legitimate vault states', () => {
    expect(VaultStateSchema.parse('ACTIVE')).toBe('ACTIVE');
    expect(VaultStateSchema.parse('CHALLENGE')).toBe('CHALLENGE');
    expect(() => VaultStateSchema.parse('INVALID_STATE')).toThrow();
  });

  it('enforces vault configuration constraints', () => {
    const config = VaultConfigSchema.parse({
      checkinIntervalDays: 90,
      gracePeriodDays: 60,
      challengeWindowDays: 30
    });
    expect(config.checkinIntervalDays).toBe(90);

    // Below minimum 14 days challenge window should throw
    expect(() => VaultConfigSchema.parse({
      checkinIntervalDays: 90,
      gracePeriodDays: 60,
      challengeWindowDays: 5
    })).toThrow();
  });

  it('validates lifecycle event types', () => {
    expect(EventTypeSchema.parse('VAULT_CREATED')).toBe('VAULT_CREATED');
    expect(EventTypeSchema.parse('CLAIM_STARTED')).toBe('CLAIM_STARTED');
  });
});

