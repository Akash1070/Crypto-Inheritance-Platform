import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEventChainManager, GENESIS_PREV_HASH } from '../src/index.js';
import { generateSigningKeyPair } from '@cip/crypto-core';
import type { SigningKeyPair } from '@cip/crypto-core';

describe('MemoryEventChainManager', () => {
  let manager: MemoryEventChainManager;
  let key: SigningKeyPair;

  beforeEach(async () => {
    manager = new MemoryEventChainManager();
    key = await generateSigningKeyPair();
  });

  it('appends genesis event with zero prev hash', async () => {
    const evt = await manager.appendEvent('vault-1', 'VAULT_CREATED', { label: 'x' }, key);
    expect(evt.sequence).toBe(0);
    expect(evt.prevHash).toBe(GENESIS_PREV_HASH);
    expect(evt.signature).toHaveLength(128);
  });

  it('chains sequences and verifies a valid chain', async () => {
    await manager.appendEvent('vault-1', 'VAULT_CREATED', { label: 'x' }, key);
    await manager.appendEvent('vault-1', 'CHECKIN', { ts: '2026-01-01' }, key);
    const result = await manager.verifyEventChain('vault-1', key.publicKey);
    expect(result.valid).toBe(true);
    expect(result.headSequence).toBe(1);
  });

  it('detects tampering of a signature', async () => {
    await manager.appendEvent('vault-1', 'VAULT_CREATED', { label: 'x' }, key);
    const events = await manager.getEvents('vault-1');
    events[0]!.signature = 'ff'.repeat(64);
    const result = await manager.verifyEventChain('vault-1', key.publicKey);
    expect(result.valid).toBe(false);
  });

  it('detects tail tampering', async () => {
    await manager.appendEvent('vault-1', 'VAULT_CREATED', { label: 'x' }, key);
    await manager.appendEvent('vault-1', 'CHECKIN', { ts: '2026-01-01' }, key);
    const events = await manager.getEvents('vault-1');
    events[1]!.prevHash = '00'.repeat(64);
    const result = await manager.verifyEventChain('vault-1', key.publicKey);
    expect(result.valid).toBe(false);
  });
});
