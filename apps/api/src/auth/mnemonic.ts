import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { deriveKeyArgon2id } from '@cip/crypto-core';

export function generateEmergencyKitMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

export async function computeMnemonicVerifier(mnemonic: string, saltHex: string): Promise<string> {
  const normalized = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('INVALID_MNEMONIC');
  }
  const salt = Buffer.from(saltHex, 'hex');
  if (salt.length !== 16) {
    throw new Error('INVALID_VERIFIER_SALT');
  }
  const key = await deriveKeyArgon2id(normalized, salt);
  return Buffer.from(key).toString('hex');
}
