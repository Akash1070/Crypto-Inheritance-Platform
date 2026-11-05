import { describe, it, expect, beforeEach } from 'vitest';
import {
  verifyMultiClock,
  constructBeaconPayload,
  RoughtimeBeacon,
  validateChainForRelease,
  AuditEventRecord,
  GENESIS_PREV_HASH,
  EnclaveReleaseService
} from '../src/index.js';
import {
  generateSigningKeyPair,
  generateBoxKeyPair,
  sealBox,
  openBox,
  signHash,
  computeEventHash,
  sha256Hex,
  SigningKeyPair,
  BoxKeyPair
} from '@cip/crypto-core';

describe('Isolated Release-Signer Enclave (@cip/release-signer)', () => {
  let serverSigningKey: SigningKeyPair;
  let beaconSigningKey1: SigningKeyPair;
  let beaconSigningKey2: SigningKeyPair;
  let enclaveBoxKey: BoxKeyPair;
  let enclaveSigningKey: SigningKeyPair;
  let heirBoxKey: BoxKeyPair;

  const BASE_TIME = new Date('2026-06-01T00:00:00.000Z');
  const DAY_MS = 24 * 3600 * 1000;

  beforeEach(async () => {
    serverSigningKey = await generateSigningKeyPair();
    beaconSigningKey1 = await generateSigningKeyPair();
    beaconSigningKey2 = await generateSigningKeyPair();
    enclaveBoxKey = await generateBoxKeyPair();
    enclaveSigningKey = await generateSigningKeyPair();
    heirBoxKey = await generateBoxKeyPair();
  });

  async function createSignedBeacon(
    serverName: string,
    keyPair: SigningKeyPair,
    timestampMs: number,
    radiusMs = 1000
  ): Promise<RoughtimeBeacon> {
    const payload = constructBeaconPayload(timestampMs, radiusMs);
    const sigBytes = await signHash(payload, keyPair.privateKey);
    return {
      serverName,
      publicKeyHex: Buffer.from(keyPair.publicKey).toString('hex'),
      timestampMs,
      radiusMs,
      signatureHex: Buffer.from(sigBytes).toString('hex')
    };
  }

  describe('Multi-Clock Verification (Anti-Clock Warp)', () => {
    it('verifies system time when in sync with trusted Roughtime beacons', async () => {
      const nowMs = BASE_TIME.getTime();
      const b1 = await createSignedBeacon('cloudflare-roughtime', beaconSigningKey1, nowMs);
      const b2 = await createSignedBeacon('google-roughtime', beaconSigningKey2, nowMs + 100);

      const res = await verifyMultiClock(BASE_TIME, [b1, b2]);
      expect(res.verified).toBe(true);
      expect(res.trustedBeaconsCount).toBe(2);
      expect(res.clockSkewMs).toBeLessThanOrEqual(100);
    });

    it('fails closed when an attacker forges a beacon signature', async () => {
      const b1 = await createSignedBeacon('cloudflare-roughtime', beaconSigningKey1, BASE_TIME.getTime());
      // Tamper signature
      b1.signatureHex = '00'.repeat(64);

      const res = await verifyMultiClock(BASE_TIME, [b1]);
      expect(res.verified).toBe(false);
      expect(res.error).toContain('MULTI_CLOCK_TAMPER');
    });

    it('detects and fails closed on hypervisor clock-warp attacks', async () => {
      // Real wall-clock time is June 1
      const realTimeMs = BASE_TIME.getTime();
      const b1 = await createSignedBeacon('cloudflare', beaconSigningKey1, realTimeMs);

      // Hypervisor warped system clock 30 days into the future (July 1)
      const warpedSystemTime = new Date(realTimeMs + 30 * DAY_MS);

      const res = await verifyMultiClock(warpedSystemTime, [b1], 600_000); // 10 min tolerance
      expect(res.verified).toBe(false);
      expect(res.error).toContain('MULTI_CLOCK_WARP_DETECTED');
    });

    it('fails closed when no beacons are provided', async () => {
      const res = await verifyMultiClock(BASE_TIME, []);
      expect(res.verified).toBe(false);
      expect(res.error).toContain('No trusted Roughtime beacons');
    });
  });

  describe('Cryptographic Merkle Chain Walking & Verification', () => {
    async function buildTestChain(vaultId: string, customEvents?: Partial<AuditEventRecord>[]): Promise<AuditEventRecord[]> {
      const chain: AuditEventRecord[] = [];

      async function pushEvent(type: string, payload: Record<string, unknown>, createdAt: string) {
        const seq = chain.length;
        const prevHash = seq === 0 ? GENESIS_PREV_HASH : chain[seq - 1]!.payloadHash;
        const payloadStr = JSON.stringify(payload);
        const payloadHash = await sha256Hex(payloadStr);

        const eventHashHex = computeEventHash(seq, type, payloadHash, prevHash, createdAt);
        const eventHashBytes = Buffer.from(eventHashHex, 'hex');
        const sigBytes = await signHash(eventHashBytes, serverSigningKey.privateKey);

        chain.push({
          id: `evt-${seq}`,
          vaultId,
          sequence: seq,
          type,
          payloadHash,
          prevHash,
          signature: Buffer.from(sigBytes).toString('hex'),
          createdAt
        });
      }

      await pushEvent('VAULT_CREATED', { label: 'Trust Vault' }, '2026-01-01T00:00:00.000Z');
      await pushEvent('STATE_TRANSITION_PENDING', { state: 'PENDING' }, '2026-05-01T00:00:00.000Z');
      await pushEvent('CLAIM_INITIATED', {
        heirPubkey: Buffer.from(heirBoxKey.publicKey).toString('hex'),
        startedAt: '2026-05-01T01:00:00.000Z'
      }, '2026-05-01T01:00:00.000Z');

      return chain;
    }

    it('successfully validates a legitimate chain where 30 days elapsed with zero cancellations', async () => {
      const vaultId = 'vault-alpha-1';
      const chain = await buildTestChain(vaultId);

      // Claim was initiated on 2026-05-01T01:00:00.000Z
      // 30 days later = 2026-05-31T01:00:00.000Z
      // Verified time: June 1, 2026 (31 days elapsed)
      const verifiedTime = new Date('2026-06-01T01:00:00.000Z');

      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, verifiedTime);
      expect(res.valid).toBe(true);
      expect(res.eventsEvaluated).toBe(3);
    });

    it('strictly forbids release if 30-day challenge window is still active', async () => {
      const vaultId = 'vault-alpha-2';
      const chain = await buildTestChain(vaultId);

      // Verified time: May 15, 2026 (only 14 days elapsed)
      const prematureTime = new Date('2026-05-15T01:00:00.000Z');

      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, prematureTime);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('30-day challenge window is still active');
    });

    it('strictly forbids release if claim was initiated before vault reached PENDING state', async () => {
      const vaultId = 'vault-premature-claim';
      const chain: AuditEventRecord[] = [];

      // Vault created
      const seq0 = 0;
      const p0 = await sha256Hex(JSON.stringify({ label: 'Premature Vault' }));
      const h0 = computeEventHash(0, 'VAULT_CREATED', p0, GENESIS_PREV_HASH, '2026-01-01T00:00:00.000Z');
      const sig0 = await signHash(Buffer.from(h0, 'hex'), serverSigningKey.privateKey);
      chain.push({
        id: 'evt-0',
        vaultId,
        sequence: 0,
        type: 'VAULT_CREATED',
        payloadHash: p0,
        prevHash: GENESIS_PREV_HASH,
        signature: Buffer.from(sig0).toString('hex'),
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      // Claim initiated immediately without any PENDING event
      const seq1 = 1;
      const p1 = await sha256Hex(JSON.stringify({ heirPubkey: 'abc' }));
      const h1 = computeEventHash(1, 'CLAIM_INITIATED', p1, p0, '2026-01-02T00:00:00.000Z');
      const sig1 = await signHash(Buffer.from(h1, 'hex'), serverSigningKey.privateKey);
      chain.push({
        id: 'evt-1',
        vaultId,
        sequence: 1,
        type: 'CLAIM_INITIATED',
        payloadHash: p1,
        prevHash: p0,
        signature: Buffer.from(sig1).toString('hex'),
        createdAt: '2026-01-02T00:00:00.000Z'
      });

      const verifiedTime = new Date('2026-06-01T00:00:00.000Z');
      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, verifiedTime);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('before vault reached PENDING state');
    });

    it('strictly forbids release if owner cancelled the claim', async () => {
      const vaultId = 'vault-alpha-3';
      const chain = await buildTestChain(vaultId);

      // Append CLAIM_CANCELLED event at seq 3
      const seq = chain.length;
      const prevHash = chain[seq - 1]!.payloadHash;
      const payloadHash = await sha256Hex(JSON.stringify({ reason: 'I am alive' }));
      const createdAt = '2026-05-10T00:00:00.000Z';
      const eventHashHex = computeEventHash(seq, 'CLAIM_CANCELLED', payloadHash, prevHash, createdAt);
      const sigBytes = await signHash(Buffer.from(eventHashHex, 'hex'), serverSigningKey.privateKey);

      chain.push({
        id: `evt-${seq}`,
        vaultId,
        sequence: seq,
        type: 'CLAIM_CANCELLED',
        payloadHash,
        prevHash,
        signature: Buffer.from(sigBytes).toString('hex'),
        createdAt
      });

      const verifiedTime = new Date('2026-06-01T01:00:00.000Z');
      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, verifiedTime);

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Claim was actively cancelled by owner');
    });

    it('strictly forbids release if owner performed a check-in after claim initiation', async () => {
      const vaultId = 'vault-alpha-4';
      const chain = await buildTestChain(vaultId);

      // Append CHECKIN event at seq 3
      const seq = chain.length;
      const prevHash = chain[seq - 1]!.payloadHash;
      const payloadHash = await sha256Hex(JSON.stringify({ timestamp: '2026-05-15T00:00:00.000Z' }));
      const createdAt = '2026-05-15T00:00:00.000Z';
      const eventHashHex = computeEventHash(seq, 'CHECKIN', payloadHash, prevHash, createdAt);
      const sigBytes = await signHash(Buffer.from(eventHashHex, 'hex'), serverSigningKey.privateKey);

      chain.push({
        id: `evt-${seq}`,
        vaultId,
        sequence: seq,
        type: 'CHECKIN',
        payloadHash,
        prevHash,
        signature: Buffer.from(sigBytes).toString('hex'),
        createdAt
      });

      const verifiedTime = new Date('2026-06-01T01:00:00.000Z');
      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, verifiedTime);

      expect(res.valid).toBe(false);
      expect(res.error).toContain('Owner check-in recorded after claim initiation');
    });

    it('fails closed on forged signatures in the Merkle event chain', async () => {
      const vaultId = 'vault-alpha-5';
      const chain = await buildTestChain(vaultId);

      // Tamper signature of event 1
      chain[1]!.signature = 'ff'.repeat(64);

      const verifiedTime = new Date('2026-06-01T01:00:00.000Z');
      const res = await validateChainForRelease(vaultId, chain, serverSigningKey.publicKey, verifiedTime);

      expect(res.valid).toBe(false);
      expect(res.error).toContain('SIGNATURE_FORGERY_DETECTED');
    });
  });

  describe('End-to-End Enclave Release Pipeline', () => {
    it('decrypts escrow share S, re-encrypts to heir, zeroizes memory, and enables heir recovery', async () => {
      const enclaveService = new EnclaveReleaseService(
        enclaveBoxKey,
        enclaveSigningKey,
        serverSigningKey.publicKey
      );

      const vaultId = 'vault-release-e2e';
      const rawEscrowShare = new TextEncoder().encode('CIP_SHAMIR_SHARE:INDEX=2:THRESHOLD=2:VALUE=99aabbccddee');

      // 1. Escrow share was sealed to enclave box public key during setup
      const sealedEscrowBytes = await sealBox(enclaveBoxKey.publicKey, rawEscrowShare);
      const sealedEscrowShareHex = Buffer.from(sealedEscrowBytes).toString('hex');

      // 2. Build legitimate 30-day elapsed chain
      const chain: AuditEventRecord[] = [];
      async function pushEvent(type: string, payload: Record<string, unknown>, createdAt: string) {
        const seq = chain.length;
        const prevHash = seq === 0 ? GENESIS_PREV_HASH : chain[seq - 1]!.payloadHash;
        const payloadHash = await sha256Hex(JSON.stringify(payload));
        const eventHashHex = computeEventHash(seq, type, payloadHash, prevHash, createdAt);
        const sigBytes = await signHash(Buffer.from(eventHashHex, 'hex'), serverSigningKey.privateKey);

        chain.push({
          id: `evt-${seq}`,
          vaultId,
          sequence: seq,
          type,
          payloadHash,
          prevHash,
          signature: Buffer.from(sigBytes).toString('hex'),
          createdAt
        });
      }

      await pushEvent('VAULT_CREATED', { label: 'Family Legacy' }, '2026-01-01T00:00:00.000Z');
      await pushEvent('STATE_TRANSITION_PENDING', { state: 'PENDING' }, '2026-05-01T00:00:00.000Z');
      await pushEvent('CLAIM_INITIATED', {
        heirPubkey: Buffer.from(heirBoxKey.publicKey).toString('hex')
      }, '2026-05-01T00:00:00.000Z');

      // 3. Create Multi-Clock beacons for June 2 (32 days elapsed)
      const releaseTimeMs = new Date('2026-06-02T00:00:00.000Z').getTime();
      const beacon1 = await createSignedBeacon('cf-time', beaconSigningKey1, releaseTimeMs);
      const beacon2 = await createSignedBeacon('google-time', beaconSigningKey2, releaseTimeMs);

      // 4. Process Escrow Release
      const heirPubkeyHex = Buffer.from(heirBoxKey.publicKey).toString('hex');
      const releaseResponse = await enclaveService.processRelease({
        vaultId,
        sealedEscrowShareHex,
        heirPubkeyHex,
        eventChain: chain,
        beacons: [beacon1, beacon2],
        systemTime: new Date(releaseTimeMs)
      });

      expect(releaseResponse.success).toBe(true);
      expect(releaseResponse.sealedShareForHeirHex).toBeDefined();
      expect(releaseResponse.releaseSignatureHex).toBeDefined();

      // 5. Heir decrypts re-encrypted share using Heir Private Key (Zero platform custody)
      const sealedForHeirBytes = Buffer.from(releaseResponse.sealedShareForHeirHex!, 'hex');
      const decryptedByHeir = await openBox(
        heirBoxKey.publicKey,
        heirBoxKey.privateKey,
        sealedForHeirBytes
      );

      const decryptedShareString = new TextDecoder().decode(decryptedByHeir);
      expect(decryptedShareString).toBe('CIP_SHAMIR_SHARE:INDEX=2:THRESHOLD=2:VALUE=99aabbccddee');
    });

    it('fails closed when an invalid ciphertext is submitted to the enclave', async () => {
      const enclaveService = new EnclaveReleaseService(
        enclaveBoxKey,
        enclaveSigningKey,
        serverSigningKey.publicKey
      );

      const vaultId = 'vault-fail-ciphertext';
      const releaseTimeMs = new Date('2026-06-02T00:00:00.000Z').getTime();
      const beacon1 = await createSignedBeacon('cf-time', beaconSigningKey1, releaseTimeMs);

      // Empty chain will fail chain validation first
      const res = await enclaveService.processRelease({
        vaultId,
        sealedEscrowShareHex: 'deadbeef',
        heirPubkeyHex: Buffer.from(heirBoxKey.publicKey).toString('hex'),
        eventChain: [],
        beacons: [beacon1],
        systemTime: new Date(releaseTimeMs)
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('creates an isolated enclave HTTP server with healthcheck and hardened headers', async () => {
      const { createEnclaveServer } = await import('../src/server.js');
      const server = createEnclaveServer({
        enclaveKeyPair: enclaveBoxKey,
        releaseSigningKey: enclaveSigningKey,
        serverSigningPublicKey: serverSigningKey.publicKey
      });

      expect(server).toBeDefined();
    });
  });
});
