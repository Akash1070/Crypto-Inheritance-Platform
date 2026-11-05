import { createEnclaveServer } from './server.js';
import {
  generateBoxKeyPair,
  generateSigningKeyPair,
  deriveBoxKeyPairFromPrivate,
  deriveSigningKeyPairFromPrivate
} from '@cip/crypto-core';

export async function main() {
  const enclavePrivKeyHex = process.env['CIP_ENCLAVE_PRIVATE_KEY_HEX'];
  const enclaveKeyPair = enclavePrivKeyHex
    ? await deriveBoxKeyPairFromPrivate(Buffer.from(enclavePrivKeyHex, 'hex'))
    : await generateBoxKeyPair();

  const releaseSigningKeyHex = process.env['CIP_RELEASE_SIGNING_KEY_HEX'];
  const releaseSigningKey = releaseSigningKeyHex
    ? await deriveSigningKeyPairFromPrivate(Buffer.from(releaseSigningKeyHex, 'hex'))
    : await generateSigningKeyPair();

  const serverPubkeyHex = process.env['CIP_SERVER_SIGNING_PUBLIC_KEY_HEX'];
  const serverSigningPublicKey = serverPubkeyHex
    ? new Uint8Array(Buffer.from(serverPubkeyHex, 'hex'))
    : undefined;

  const port = Number(process.env['PORT']) || 3001;

  const server = createEnclaveServer({
    enclaveKeyPair,
    releaseSigningKey,
    serverSigningPublicKey,
    port
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Release-Signer Enclave] Listening on 0.0.0.0:${port} (Isolated Enclave Mode)`);
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

