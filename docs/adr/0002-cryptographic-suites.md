# ADR-0002: Cryptographic Suites & Secret Sharing Scheme

## Status
Accepted

## Context
A crypto inheritance system must protect confidentiality for decades while ensuring that corruption, partial disclosure, or malicious manipulation of shares cannot leak secrets or silently corrupt recovery.

We need standardized, audited, battle-tested cryptographic primitives for:
1. Symmetric Authenticated Encryption with Associated Data (AEAD)
2. Passphrase Key Derivation (KDF)
3. Key Sealing / Public-Key Encapsulation (PKE)
4. Secret Sharing / Threshold Splitting
5. Cryptographic Event Integrity & Digital Signatures

## Decision

### 1. Symmetric AEAD: XChaCha20-Poly1305
- **Primitive:** `crypto_aead_xchacha20poly1305_ietf` (libsodium standard).
- **Key Size:** 256-bit random key ($VK$) generated from OS CSPRNG.
- **Nonce:** 192-bit extended nonce generated fresh for every encryption. Extended nonce size renders nonce collision probability negligible ($< 2^{-96}$).
- **Associated Data ($AD$):** Mandatory binding of `vault_id (UUIDv4) || format_version (uint16) || suite_id (0x0001) || owner_pubkey_hash`. Prevents ciphertext context-substitution and downgrade attacks.

### 2. Password KDF: Argon2id
- **Primitive:** Argon2id (`crypto_pwhash_argon2id` from libsodium).
- **Parameters:**
  - Desktop / CLI: Memory $\ge 64$ MiB, Iterations $t \ge 3$, Parallelism $p = 1$.
  - Minimum hard floor: Memory $\ge 32$ MiB, Iterations $t \ge 3$. Server or client cannot negotiate below this floor.
- Salt is 128-bit random from OS CSPRNG.

### 3. Key Sealing: X25519 Sealed Box
- **Primitive:** X25519 ephemeral-static Diffie-Hellman + ChaCha20-Poly1305 (libsodium `crypto_box_seal`).
- Used to seal the Heir Share ($H$) to the Heir's public key and the Escrow Share ($S$) to the `release-signer` enclave's public key.
- Recipient can decrypt using their private key; sender anonymity is preserved.

### 4. Secret Sharing: Verifiable Shamir Secret Sharing over $\text{GF}(2^8)$ with Commitments
- **Threshold Scheme:** Shamir's Secret Sharing over the Galois Field $\text{GF}(2^8)$ with irreducible polynomial $x^8 + x^4 + x^3 + x + 1$.
- Standard SSS does not provide authenticity or integrity: an adversary or corrupted disk can substitute random bytes and yield an arbitrary incorrect key upon reconstruction.
- **Integrity Tag:** Each share is augmented with an HMAC / BLAKE2b commitment:
  $$\text{Commitment} = \text{BLAKE2b-256}(\text{vault\_id} \parallel \text{share\_index} \parallel \text{share\_value})$$
  Any swapped, modified, or out-of-order share is rejected before reconstruction begins.
- Default threshold: 2-of-2 ($VK = H \oplus S$) in Standard Mode; 3-of-3 ($H$, $S$, and $G$ where $G$ is $k$-of-$m$ among guardians) in Fortress Mode.

### 5. Signatures and Audit Chain: Ed25519 & BLAKE2b
- State machine transitions are hashed into a Merkle append-only hash chain:
  $$\text{Hash}_i = \text{BLAKE2b-256}(\text{seq}_i \parallel \text{type}_i \parallel \text{payload\_hash}_i \parallel \text{Hash}_{i-1} \parallel \text{timestamp}_i)$$
- Signed by the Enclave/KMS Ed25519 key.

## Consequences
- Every cryptographic operation uses audited, formal primitives from libsodium and noble libraries.
- Zero custom/homemade cryptographic algorithms.
- Full integrity and authenticity validation on every share and ciphertext before decryption.

