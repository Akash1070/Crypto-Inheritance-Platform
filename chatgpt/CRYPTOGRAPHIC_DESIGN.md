# Cryptographic Design and Protocol Constraints

**Status: NOT APPROVED FOR IMPLEMENTATION.** This document defines constraints and candidate directions. The final protocol requires an ADR, test vectors, implementation review, and independent cryptographic sign-off.

## 1. Scope

This document covers a future offline recovery utility. It does not authorize adding secret-handling features to the hosted MVP.

## 2. Recommended model

1. Owner creates a recovery package locally/offline. It may include wallet recovery material only if the owner deliberately chooses to include it and understands the risk.
2. Offline tool generates an independent random 256-bit data-encryption key (DEK) using the operating system's cryptographically secure random generator.
3. The package is encrypted with an authenticated-encryption-with-associated-data (AEAD) algorithm from a maintained, reviewed library.
4. The DEK—not the raw wallet seed phrase—is divided into threshold shares using a standards-based scheme and a reviewed implementation.
5. Owner distributes shares to physically/operationally independent guardians and stores the encrypted package separately (e.g., multiple owner-controlled offline/cloud locations).
6. Heirs/guardians use a signed, offline recovery tool to reconstruct the DEK and decrypt the package.

The hosted coordination service does not participate in steps 2–6 and cannot recover the key.

## 3. Candidate primitives — decision required

### Encryption

Candidate: XChaCha20-Poly1305 AEAD via a maintained libsodium implementation, or AES-256-GCM via a platform implementation with a carefully reviewed nonce strategy. Select one suite and version it. Do not support a large algorithm menu in v1.

Requirements:
- 256-bit DEK generated from OS CSPRNG.
- Fresh unique nonce per encryption under a key, following the chosen library's rules.
- Authentication tag verification before plaintext is exposed.
- Associated data binds format version, suite identifier, package identifier, and relevant metadata to prevent context substitution.
- Fail closed on tag mismatch, truncated data, unsupported version, or unknown suite.

### Threshold sharing

Candidate: SLIP-0039 is a published, interoperable Shamir-based standard for mnemonic backup. Evaluate whether its supported secret sizes, thresholds, grouping, passphrase behavior, reference implementations, and UX are appropriate for sharing a random DEK. Do not assume that a SLIP-39 share is a BIP-39 seed phrase or that every wallet supports it.

Before selecting it:
- inspect the canonical specification and reference implementation;
- confirm exact secret-length and threshold semantics;
- use published test vectors;
- test split/reconstruct across at least two independent implementations if available;
- verify malformed, duplicate, out-of-order, and insufficient shares;
- obtain an independent review of the chosen library and integration.

If no maintained and reviewable implementation meets requirements, do not ship threshold recovery. Do not write your own Shamir implementation as a shortcut.

### Passwords

A user-chosen passphrase may optionally wrap a local key, but must not be the sole source of entropy for the DEK. Use a memory-hard password KDF such as Argon2id through a maintained implementation, with parameters benchmarked on supported devices and stored with the encrypted envelope. Never invent parameters without documenting the target hardware and offline attack model.

Do not reuse BIP-39's mnemonic-to-seed PBKDF2 parameters as a generic password KDF. BIP-39 is a wallet mnemonic specification, not a general-purpose vault-password design.

### Public-key share delivery (optional future)

If shares are ever encrypted to guardian public keys, evaluate a maintained HPKE implementation conforming to RFC 9180. HPKE is not a complete application protocol: add identity binding, recipient authentication where required, replay protection, version negotiation, and key-rotation rules. Note that RFC 9180 does not provide forward secrecy against recipient private-key compromise for stored ciphertexts. Do not treat it as “magic end-to-end security.”

## 4. Envelope format (proposal only)

Use a deterministic, canonical, versioned serialization. The exact encoding must be specified in an ADR and have test vectors.

Conceptual fields:

```json
{
  "format": "oci-recovery-package",
  "format_version": 1,
  "suite_id": "TBD_AFTER_REVIEW",
  "package_id": "random-non-secret-identifier",
  "created_at": "UTC timestamp",
  "kdf": null,
  "kdf_salt": null,
  "aead_nonce": "base64url",
  "threshold_scheme": "TBD_AFTER_REVIEW",
  "threshold": null,
  "share_count": null,
  "ciphertext": "base64url",
  "integrity_metadata": "authenticated-by-AEAD"
}
```

The sample is illustrative, not a final schema. Never put usernames, wallet addresses, guardian emails, or other unnecessary personal data in public envelope metadata. Bind security-relevant metadata as AEAD associated data. Do not allow the parser to choose arbitrary algorithms from untrusted input; use a fixed allow-list and reject downgrade attempts.

## 5. Separation of data and key

- Encrypted package and shares must be stored separately.
- The hosted application stores neither.
- A cloud backup of the encrypted package must not contain the threshold needed to decrypt it.
- Guardians must not all store their shares in one shared cloud account or one household.
- A checksum helps detect accidental corruption but is not a substitute for AEAD authentication or a signature.

## 6. Revocation and rotation

A share that was copied cannot be remotely revoked. To replace a guardian safely:

1. Treat old shares as potentially compromised.
2. Generate a new random DEK.
3. Re-encrypt the package with the new DEK.
4. Generate a completely new share set and distribute it.
5. Verify the new package with a recovery drill.
6. Retire old encrypted packages and shares where possible; assume copies may persist.

Do not claim that deleting a guardian from the web app revokes their ability to decrypt an old package.

## 7. Time-lock and death-trigger warning

A server-side timer, cron job, database flag, guardian quorum, email notification, or smart-contract admin toggle is not automatically a cryptographic time lock.

If guardians hold enough shares, they can reconstruct the DEK whenever they obtain the ciphertext. The inactivity process is social coordination, not enforced cryptographic secrecy. If this limitation is unacceptable, do not ship the guardian-share model as though it solves early access; research a separate cryptographic/chain-specific mechanism with an independent specialist.

## 8. BIP-39 and hardware wallets

- Do not ask users to paste a BIP-39 phrase into the hosted app.
- Do not transform, normalize, split, or “validate” a real seed phrase in the hosted MVP.
- The owner should prefer the hardware wallet vendor's documented recovery process and maintain a physically secure backup.
- A recovery package should include device and wallet instructions, derivation-path/account notes, and multisig policy information where safe.
- Never imply that SLIP-39 shares are interchangeable with BIP-39 mnemonic words.

## 9. Implementation prohibitions

- No homemade encryption, KDF, curve, signature, random generator, Shamir math, or custom serialization parser for secret material.
- No secret in URL/query/hash, logs, telemetry, clipboard APIs, browser storage, support tickets, or hosted APIs.
- No plaintext secret in automated screenshots, crash reports, or test snapshots.
- No fallback to insecure algorithms when a secure API is unavailable. Fail closed with a clear error.
- No automatic key export/import from a connected wallet.
- No “recovery by support” or hidden master key.

## 10. Mandatory evidence before Phase 2 ships

- Approved ADR naming exact standard, version, library, license, source commit, maintenance posture, and known limitations.
- Cryptographic protocol description reviewed by an independent cryptographer.
- Test vectors and independent interoperability test results.
- Fuzzing/property-based tests for parsing and reconstruction.
- Negative tests for wrong password, corrupt ciphertext, malformed shares, duplicate shares, threshold-minus-one shares, wrong version, and wrong associated data.
- Offline-only test demonstrating no outbound network calls during secret operations.
- Reproducible or independently verifiable signed release artifact.
- Successful witnessed recovery drill on clean devices.
