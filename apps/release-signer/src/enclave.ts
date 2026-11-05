import {
  openSealedBox,
  sealBox,
  zeroize,
  signHash,
  sha256Hex,
  BoxKeyPair,
  SigningKeyPair
} from '@cip/crypto-core';
import { RoughtimeBeacon, verifyMultiClock } from './multiclock.js';
import { AuditEventRecord, validateChainForRelease } from './chainValidator.js';

export interface ReleaseRequest {
  vaultId: string;
  sealedEscrowShareHex: string;
  heirPubkeyHex: string;
  eventChain: AuditEventRecord[];
  beacons: RoughtimeBeacon[];
  systemTime?: Date;
}

export interface ReleaseResponse {
  success: boolean;
  vaultId: string;
  sealedShareForHeirHex?: string | undefined;
  releaseSignatureHex?: string | undefined;
  verifiedTime?: string | undefined;
  error?: string | undefined;
}

export class EnclaveReleaseService {
  constructor(
    private enclaveBoxKey: BoxKeyPair,
    private enclaveSigningKey: SigningKeyPair,
    private serverSigningPublicKey: Uint8Array
  ) {}

  /**
   * The sole point of release for threshold Escrow Share S.
   * Multi-Clock and Cryptographic Event Chain verified before key operations occur.
   */
  async processRelease(request: ReleaseRequest): Promise<ReleaseResponse> {
    const {
      vaultId,
      sealedEscrowShareHex,
      heirPubkeyHex,
      eventChain,
      beacons,
      systemTime = new Date()
    } = request;

    // 1. Verify Multi-Clock Time Anchors (Anti-Clock Warp)
    const clockResult = await verifyMultiClock(systemTime, beacons);
    if (!clockResult.verified) {
      return {
        success: false,
        vaultId,
        error: clockResult.error
      };
    }

    // 2. Validate Merkle Audit Chain & 30-Day Elapsed Challenge Window
    const chainResult = await validateChainForRelease(
      vaultId,
      eventChain,
      this.serverSigningPublicKey,
      clockResult.verifiedTime
    );
    if (!chainResult.valid) {
      return {
        success: false,
        vaultId,
        error: chainResult.error
      };
    }

    // 3. Decrypt Escrow Share S from Enclave Sealed Box
    let plaintextShare: Uint8Array;
    try {
      const sealedBytes = Buffer.from(sealedEscrowShareHex, 'hex');
      plaintextShare = await openSealedBox(
        this.enclaveBoxKey.publicKey,
        this.enclaveBoxKey.privateKey,
        sealedBytes
      );
    } catch {
      return {
        success: false,
        vaultId,
        error: 'ESCROW_DECRYPTION_FAILED: Invalid ciphertext or enclave key mismatch'
      };
    }

    // 4. Immediately Re-encrypt to Heir Public Key and Zeroize Plaintext Share
    let sealedForHeir: Uint8Array;
    try {
      const heirPubkeyBytes = Buffer.from(heirPubkeyHex, 'hex');
      sealedForHeir = await sealBox(heirPubkeyBytes, plaintextShare);
    } finally {
      // NON-NEGOTIABLE SECURITY INVARIANT: Zeroize plaintext share from memory immediately
      zeroize(plaintextShare);
    }

    // 5. Sign Cryptographic Release Attestation
    const releaseProofString = `RELEASE:${vaultId}:${heirPubkeyHex}:${clockResult.verifiedTime.toISOString()}`;
    const proofHash = await sha256Hex(releaseProofString);
    const proofHashBytes = Buffer.from(proofHash, 'hex');
    const signatureBytes = await signHash(proofHashBytes, this.enclaveSigningKey.privateKey);

    return {
      success: true,
      vaultId,
      sealedShareForHeirHex: Buffer.from(sealedForHeir).toString('hex'),
      releaseSignatureHex: Buffer.from(signatureBytes).toString('hex'),
      verifiedTime: clockResult.verifiedTime.toISOString()
    };
  }
}
