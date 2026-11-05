import fs from 'node:fs/promises';
import { createEnclaveServer } from './server.js';
import {
  deriveBoxKeyPairFromPrivate,
  deriveSigningKeyPairFromPrivate
} from '@cip/crypto-core';
import { assertStrongHexSecret, assertStrongSecret } from '@cip/protocol';

export async function main() {
  const enclavePrivKeyHex = process.env['CIP_ENCLAVE_PRIVATE_KEY_HEX'];
  assertStrongHexSecret(enclavePrivKeyHex, 'CIP_ENCLAVE_PRIVATE_KEY_HEX', 32);
  const enclaveKeyPair = await deriveBoxKeyPairFromPrivate(Buffer.from(enclavePrivKeyHex!, 'hex'));

  const releaseSigningKeyHex = process.env['CIP_RELEASE_SIGNING_KEY_HEX'];
  assertStrongHexSecret(releaseSigningKeyHex, 'CIP_RELEASE_SIGNING_KEY_HEX', 32);
  const releaseSigningKey = await deriveSigningKeyPairFromPrivate(Buffer.from(releaseSigningKeyHex!, 'hex'));

  const serverPubkeyHex = process.env['CIP_SERVER_SIGNING_PUBLIC_KEY_HEX'];
  assertStrongHexSecret(serverPubkeyHex, 'CIP_SERVER_SIGNING_PUBLIC_KEY_HEX', 32);
  const serverSigningPublicKey = new Uint8Array(Buffer.from(serverPubkeyHex!, 'hex'));

  const sharedSecret = process.env['CIP_RELEASE_SHARED_SECRET'];
  assertStrongSecret(sharedSecret, 'CIP_RELEASE_SHARED_SECRET');

  const tlsCert = process.env['CIP_TLS_CERT_FILE'];
  const tlsKey = process.env['CIP_TLS_KEY_FILE'];
  const tlsCa = process.env['CIP_TLS_CA_FILE'];
  if (!tlsCert || !tlsKey) {
    throw new Error('CIP_TLS_CERT_FILE and CIP_TLS_KEY_FILE are required (mTLS)');
  }
  const tls = {
    cert: await fs.readFile(tlsCert),
    key: await fs.readFile(tlsKey),
    ...(tlsCa ? { ca: await fs.readFile(tlsCa) } : {})
  };

  const port = Number(process.env['PORT']) || 3001;

  const server = createEnclaveServer({
    enclaveKeyPair,
    releaseSigningKey,
    serverSigningPublicKey,
    tls,
    sharedSecret: sharedSecret!,
    port
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Release-Signer Enclave] Listening on 0.0.0.0:${port} (mTLS, isolated enclave mode)`);
    console.log(`[Release-Signer Enclave] Enclave Public Key: ${Buffer.from(enclaveKeyPair.publicKey).toString('hex')}`);
    console.log(`[Release-Signer Enclave] Release Signing Public Key: ${Buffer.from(releaseSigningKey.publicKey).toString('hex')}`);
  });
}

if (process.env['NODE_ENV'] !== 'test') {
  main().catch((err) => {
    console.error('[Release-Signer Enclave] Fatal error:', err);
    process.exit(1);
  });
}
