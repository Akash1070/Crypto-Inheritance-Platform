import { verifySignature } from '@cip/crypto-core';

export interface RoughtimeBeacon {
  serverName: string;
  publicKeyHex: string; // 32-byte Ed25519 public key in hex
  timestampMs: number;  // Epoch ms
  radiusMs: number;     // Clock uncertainty radius in ms
  signatureHex: string; // 64-byte Ed25519 signature in hex
}

export interface MultiClockVerificationResult {
  verified: boolean;
  verifiedTime: Date;
  clockSkewMs: number;
  trustedBeaconsCount: number;
  error?: string;
}

/**
 * Deterministically constructs the signed payload bytes for a Roughtime beacon.
 * Format: "ROUGHTIME" || timestampMs (8 bytes big-endian) || radiusMs (4 bytes big-endian)
 */
export function constructBeaconPayload(timestampMs: number, radiusMs: number): Uint8Array {
  const prefix = new TextEncoder().encode('ROUGHTIME_v1:');
  const buffer = new Uint8Array(prefix.length + 12);
  buffer.set(prefix, 0);

  const view = new DataView(buffer.buffer, prefix.length, 12);
  view.setBigUint64(0, BigInt(timestampMs), false);
  view.setUint32(8, radiusMs, false);

  return buffer;
}

/**
 * Multi-Clock Verification Engine.
 * Cross-references system hardware RTC against signed cryptographic Roughtime attestations.
 * Defeats VM hypervisor clock-warp attacks.
 */
export async function verifyMultiClock(
  systemTime: Date,
  beacons: RoughtimeBeacon[],
  maxAllowedSkewMs = 600_000 // 10 minutes maximum allowed skew
): Promise<MultiClockVerificationResult> {
  if (!beacons || beacons.length === 0) {
    return {
      verified: false,
      verifiedTime: systemTime,
      clockSkewMs: Infinity,
      trustedBeaconsCount: 0,
      error: 'MULTI_CLOCK_FAILURE: No trusted Roughtime beacons provided'
    };
  }

  const validTimestamps: number[] = [];

  for (const beacon of beacons) {
    try {
      const pubkeyBytes = Buffer.from(beacon.publicKeyHex, 'hex');
      const sigBytes = Buffer.from(beacon.signatureHex, 'hex');
      const payloadBytes = constructBeaconPayload(beacon.timestampMs, beacon.radiusMs);

      const isSigValid = await verifySignature(sigBytes, payloadBytes, pubkeyBytes);
      if (!isSigValid) {
        return {
          verified: false,
          verifiedTime: systemTime,
          clockSkewMs: Infinity,
          trustedBeaconsCount: validTimestamps.length,
          error: `MULTI_CLOCK_TAMPER: Cryptographic signature failed for beacon server "${beacon.serverName}"`
        };
      }

      validTimestamps.push(beacon.timestampMs);
    } catch {
      return {
        verified: false,
        verifiedTime: systemTime,
        clockSkewMs: Infinity,
        trustedBeaconsCount: validTimestamps.length,
        error: `MULTI_CLOCK_MALFORMED: Malformed beacon data from server "${beacon.serverName}"`
      };
    }
  }

  // Calculate median beacon time
  validTimestamps.sort((a, b) => a - b);
  const medianBeaconTimeMs = validTimestamps[Math.floor(validTimestamps.length / 2)]!;
  const systemTimeMs = systemTime.getTime();
  const skewMs = Math.abs(systemTimeMs - medianBeaconTimeMs);

  if (skewMs > maxAllowedSkewMs) {
    return {
      verified: false,
      verifiedTime: new Date(medianBeaconTimeMs),
      clockSkewMs: skewMs,
      trustedBeaconsCount: validTimestamps.length,
      error: `MULTI_CLOCK_WARP_DETECTED: System RTC (${systemTime.toISOString()}) deviates from trusted Roughtime beacons (${new Date(medianBeaconTimeMs).toISOString()}) by ${Math.round(skewMs / 1000)}s (limit: ${maxAllowedSkewMs / 1000}s)`
    };
  }

  // Use the conservative minimum of system time and beacon time to prevent premature release
  const conservativeTimeMs = Math.min(systemTimeMs, medianBeaconTimeMs);

  return {
    verified: true,
    verifiedTime: new Date(conservativeTimeMs),
    clockSkewMs: skewMs,
    trustedBeaconsCount: validTimestamps.length
  };
}
