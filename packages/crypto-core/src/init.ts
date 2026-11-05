import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sodium = require('libsodium-wrappers-sumo');

let initialized = false;

/**
 * Initializes the libsodium WebAssembly / native cryptographic runtime.
 * Must be called before performing any cryptographic operation.
 */
export async function ensureSodium(): Promise<typeof sodium> {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
  return sodium;
}

export { sodium };
