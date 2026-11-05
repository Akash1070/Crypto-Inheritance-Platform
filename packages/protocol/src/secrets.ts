export function isHexOfLength(value: string, lengthBytes: number): boolean {
  return new RegExp(`^[0-9a-f]{${lengthBytes * 2}}$`, 'i').test(value);
}

export function isTriviallyGuessable(value: string): boolean {
  if (!value) return true;
  const hex = value.toLowerCase();
  if (/^(.)\1{7,}$/.test(hex)) return true;
  if (/^0+$/.test(hex)) return true;
  if (/^(1111|2222|3333|4444|5555|6666|7777|8888|9999|aaaa|bbbb|cccc|dddd|eeee|ffff)/.test(hex)) return true;
  return false;
}

export function assertStrongHexSecret(value: string | undefined, name: string, lengthBytes: number): void {
  if (!value) {
    throw new Error(`${name} is required (${lengthBytes * 2} hex chars) and must not be left unset`);
  }
  if (!isHexOfLength(value, lengthBytes) || isTriviallyGuessable(value)) {
    throw new Error(`${name} must be a unique, non-guessable ${lengthBytes * 2}-char hex secret`);
  }
}

export function assertStrongSecret(value: string | undefined, name: string, minLength = 32): void {
  if (!value) {
    throw new Error(`${name} is required and must not be left unset`);
  }
  if (value.length < minLength || /^(.)\1{7,}$/.test(value) || value.includes('cip-dev')) {
    throw new Error(`${name} must be a unique secret of at least ${minLength} characters`);
  }
}
