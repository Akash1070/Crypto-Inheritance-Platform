import { createEnclaveServer } from './server.js';
import { generateBoxKeyPair, generateSigningKeyPair } from '@cip/crypto-core';

export async function main() {
  const enclaveKeyPair = await generateBoxKeyPair();
  const releaseSigningKey = await generateSigningKeyPair();
  const port = Number(process.env['PORT']) || 3001;

  const server = createEnclaveServer({
    enclaveKeyPair,
    releaseSigningKey,
    port
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[Release-Signer Enclave] Listening on 0.0.0.0:${port} (Isolated Enclave Mode)`);
  });
}

if (process.env['NODE_ENV'] !== 'test') {
  main().catch((err) => {
    console.error('[Release-Signer Enclave] Fatal error:', err);
    process.exit(1);
  });
}

