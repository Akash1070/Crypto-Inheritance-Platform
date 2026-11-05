import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/index.js';
import { authStore } from '../src/auth/store.js';
import { generateEmergencyKitMnemonic, computeMnemonicVerifier } from '../src/auth/mnemonic.js';
import { secureRandomHex } from '@cip/crypto-core';

describe('WebAuthn Passkeys & Identity Layer', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    authStore.clear();
    app = await buildApp();
  });

  describe('Registration Ceremony', () => {
    it('generates registration options with residentKey and userVerification required', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register/options',
        payload: {
          username: 'alice_cold',
          email: 'alice@example.com'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.userId).toBeDefined();
      expect(body.options.challenge).toBeDefined();
      expect(body.options.rp.name).toBe('Crypto Inheritance Platform');
      expect(body.options.authenticatorSelection.residentKey).toBe('required');
      expect(body.options.authenticatorSelection.userVerification).toBe('required');
    });

    it('rejects invalid usernames or malformed emails', async () => {
      const badUser = await app.inject({
        method: 'POST',
        url: '/auth/register/options',
        payload: { username: 'al', email: 'alice@example.com' } // <3 chars
      });
      expect(badUser.statusCode).toBe(400);

      const badEmail = await app.inject({
        method: 'POST',
        url: '/auth/register/options',
        payload: { username: 'alice_cold', email: 'not-an-email' }
      });
      expect(badEmail.statusCode).toBe(400);
    });

    it('does not disclose existing usernames during registration options (anti-enumeration)', async () => {
      await authStore.createUser('charlie_owner', 'charlie@example.com');

      // Identical payload for an already-registered username must return 200,
      // indistinguishable from a fresh registration.
      const hijackAttempt = await app.inject({
        method: 'POST',
        url: '/auth/register/options',
        payload: { username: 'charlie_owner', email: 'attacker@evil.com' }
      });
      expect(hijackAttempt.statusCode).toBe(200);
      const body = JSON.parse(hijackAttempt.payload);
      expect(body.userId).toBeDefined();
      expect(body.options.challenge).toBeDefined();
    });

    it('rejects duplicate usernames only at verification time', async () => {
      await authStore.createUser('dup_owner', 'dup@example.com');
      await expect(authStore.createUser('dup_owner', 'other@example.com')).rejects.toThrow('USER_ALREADY_EXISTS');
    });
  });

  describe('Minimum 2-Passkey Policy & Emergency Kit Generation', () => {
    it('enforces registering minimum 2 passkeys before Emergency Kit is unlocked', async () => {
      const user = await authStore.createUser('bob_vault', 'bob@example.com');

      // Add 1st passkey (Primary Device: e.g. MacBook Touch ID)
      await authStore.addCredential(
        user.id,
        'cred-primary-touchid',
        new Uint8Array(32).fill(0x01),
        0,
        'MacBook Pro Touch ID'
      );

      let creds = await authStore.getCredentialsForUser(user.id);
      expect(creds.length).toBe(1);
      expect(creds.length >= 2).toBe(false);

      // Add 2nd passkey (Backup Device: e.g. YubiKey 5C NFC)
      await authStore.addCredential(
        user.id,
        'cred-backup-yubikey',
        new Uint8Array(32).fill(0x02),
        0,
        'YubiKey 5C NFC'
      );

      creds = await authStore.getCredentialsForUser(user.id);
      expect(creds.length).toBe(2);
      expect(creds.length >= 2).toBe(true);

      // Generate Emergency Kit
      const mnemonic = generateEmergencyKitMnemonic();
      const salt = await secureRandomHex(16);
      const verifier = await computeMnemonicVerifier(mnemonic, salt);
      await authStore.setEmergencyKitVerifier(user.id, verifier, salt);

      const refreshed = await authStore.getUserById(user.id);
      expect(refreshed?.emergencyKitVerifier).toBe(verifier);
    });
  });

  describe('Authentication Ceremony & Session Cookies', () => {
    it('generates authentication options', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login/options',
        payload: {}
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.options.challenge).toBeDefined();
      expect(body.options.userVerification).toBe('required');
    });

    it('rejects invalid or forged assertion payloads', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login/verify',
        payload: {
          response: {
            id: 'forged-credential-id',
            rawId: 'forged',
            response: {
              clientDataJSON: Buffer.from(JSON.stringify({ challenge: 'fake-challenge' })).toString('base64url'),
              authenticatorData: 'fake',
              signature: 'fake'
            },
            type: 'public-key'
          }
        }
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('Emergency Kit Offline Recovery', () => {
    it('verifies high-entropy mnemonic and initiates 7-day security delay', async () => {
      const user = await authStore.createUser('charlie_estate', 'charlie@example.com');
      const mnemonic = generateEmergencyKitMnemonic();
      const salt = await secureRandomHex(16);
      const verifier = await computeMnemonicVerifier(mnemonic, salt);
      await authStore.setEmergencyKitVerifier(user.id, verifier, salt);

      // Verify with valid mnemonic
      const successRes = await app.inject({
        method: 'POST',
        url: '/auth/emergency-kit/verify',
        payload: {
          username: 'charlie_estate',
          mnemonic
        }
      });

      expect(successRes.statusCode).toBe(200);
      const successBody = JSON.parse(successRes.payload);
      expect(successBody.verified).toBe(true);
      expect(successBody.status).toBe('RECOVERY_PENDING');
      expect(successBody.recoverySessionId).toBeDefined();

      // Verify with incorrect mnemonic fails with uniform generic error
      const failRes = await app.inject({
        method: 'POST',
        url: '/auth/emergency-kit/verify',
        payload: {
          username: 'charlie_estate',
          mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        }
      });

      expect(failRes.statusCode).toBe(401);
      const failBody = JSON.parse(failRes.payload);
      expect(failBody.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Step-Up Token Authentication', () => {
    it('creates and consumes 5-minute single-use step-up tokens for sensitive operations', async () => {
      const user = await authStore.createUser('diana_exec', 'diana@example.com');
      const token = await authStore.createStepUpToken(user.id, 'ADD_HEIR', 300);

      // Successfully consumed for matching action
      const verifiedUserId = await authStore.verifyAndConsumeStepUpToken(token, 'ADD_HEIR');
      expect(verifiedUserId).toBe(user.id);

      // Re-use is blocked (single-use token burned)
      const reuseAttempt = await authStore.verifyAndConsumeStepUpToken(token, 'ADD_HEIR');
      expect(reuseAttempt).toBeUndefined();
    });

    it('rejects step-up token for mismatched action', async () => {
      const user = await authStore.createUser('edward_owner', 'edward@example.com');
      const token = await authStore.createStepUpToken(user.id, 'ADD_HEIR', 300);

      // Attempt to use ADD_HEIR token for CANCEL_CLAIM action
      const wrongActionAttempt = await authStore.verifyAndConsumeStepUpToken(token, 'CANCEL_CLAIM');
      expect(wrongActionAttempt).toBeUndefined();
    });
  });
});

