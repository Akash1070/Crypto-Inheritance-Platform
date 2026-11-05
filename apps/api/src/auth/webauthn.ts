import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture
} from '@simplewebauthn/server';
import { secureRandomHex } from '@cip/crypto-core';
import { authStore } from './store.js';
import { generateEmergencyKitMnemonic, computeMnemonicVerifier } from './mnemonic.js';

export function getWebAuthnConfig() {
  return {
    rpName: 'Crypto Inheritance Platform',
    rpID: process.env['CIP_RP_ID'] || 'localhost',
    origin: process.env['CIP_EXPECTED_ORIGIN'] || 'http://localhost:5173'
  };
}

export async function generateRegistrationCeremonyOptions(userId: string, username: string) {
  const { rpName, rpID } = getWebAuthnConfig();
  const existingCreds = await authStore.getCredentialsForUser(userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: username,
    attestationType: 'none',
    excludeCredentials: existingCreds.map((c) => ({
      id: c.id,
      ...(c.transports ? { transports: c.transports as AuthenticatorTransportFuture[] } : {})
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required'
    }
  });

  await authStore.saveChallenge(userId, options.challenge, 'REGISTRATION');
  return options;
}

export async function verifyRegistrationCeremonyResponse(
  userId: string,
  deviceName: string,
  response: RegistrationResponseJSON
) {
  const { rpID, origin } = getWebAuthnConfig();
  const challengeRecord = await authStore.getAndConsumeChallenge(response.response.clientDataJSON ? 
    JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf-8')).challenge : '');

  if (!challengeRecord || challengeRecord.userId !== userId) {
    throw new Error('Invalid or expired registration challenge');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WebAuthn registration verification failed');
  }

  const { credential, credentialDeviceType } = verification.registrationInfo;

  await authStore.addCredential(
    userId,
    credential.id,
    credential.publicKey,
    credential.counter,
    deviceName || credentialDeviceType,
    response.response.transports
  );

  const allCreds = await authStore.getCredentialsForUser(userId);
  const registeredCount = allCreds.length;
  const minimumMet = registeredCount >= 2;

  let emergencyKitMnemonic: string | undefined;

  // If this is the second registered passkey, generate the offline Emergency Kit
  if (registeredCount === 2) {
    const user = await authStore.getUserById(userId);
    if (user && !user.emergencyKitVerifier) {
      emergencyKitMnemonic = generateEmergencyKitMnemonic();
      const salt = await secureRandomHex(16);
      const verifier = computeMnemonicVerifier(emergencyKitMnemonic, salt);
      await authStore.setEmergencyKitVerifier(userId, verifier, salt);
    }
  }

  return {
    verified: true,
    credentialId: credential.id,
    registeredCount,
    minimumMet,
    emergencyKitMnemonic
  };
}

export async function generateAuthenticationCeremonyOptions(username?: string) {
  const { rpID } = getWebAuthnConfig();
  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;
  let targetUserId = 'anonymous';

  if (username) {
    const user = await authStore.getUserByName(username);
    if (user) {
      targetUserId = user.id;
      const creds = await authStore.getCredentialsForUser(user.id);
      allowCredentials = creds.map((c) => ({
        id: c.id,
        ...(c.transports ? { transports: c.transports as AuthenticatorTransportFuture[] } : {})
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    ...(allowCredentials ? { allowCredentials } : {})
  });

  await authStore.saveChallenge(targetUserId, options.challenge, 'AUTHENTICATION');
  return options;
}

export async function verifyAuthenticationCeremonyResponse(
  response: AuthenticationResponseJSON
) {
  const { rpID, origin } = getWebAuthnConfig();
  const clientData = JSON.parse(
    Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf-8')
  );
  const challengeRecord = await authStore.getAndConsumeChallenge(clientData.challenge);

  if (!challengeRecord) {
    throw new Error('Invalid or expired authentication challenge');
  }

  const credential = await authStore.getCredentialById(response.id);
  if (!credential) {
    throw new Error('Unknown credential ID');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.id,
      publicKey: credential.publicKey as unknown as Uint8Array<ArrayBuffer>,
      counter: credential.signCount
    },
    requireUserVerification: true
  });

  if (!verification.verified || !verification.authenticationInfo) {
    throw new Error('WebAuthn authentication verification failed');
  }

  // Update sign count (replay counter protection)
  await authStore.updateSignCount(credential.id, verification.authenticationInfo.newCounter);

  // Issue session
  const session = await authStore.createSession(credential.userId);

  return {
    verified: true,
    userId: credential.userId,
    sessionId: session.id
  };
}
