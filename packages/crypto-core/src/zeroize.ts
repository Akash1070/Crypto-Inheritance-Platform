/**
 * Secure buffer zeroization utility.
 * Overwrites sensitive Uint8Array memory with zeros.
 */
export function zeroize(buffer: Uint8Array): void {
  buffer.fill(0);
}

