# Independent Security Audit Sign-Off Checklist

This checklist provides third-party auditors and security engineers with a structured verification matrix for evaluating the **Crypto Inheritance Platform (CIP)** against its design requirements and security invariants.

---

## 1. Cryptographic Engine (`packages/crypto-core`)

- [ ] **Primitive Purity:** Zero homemade cryptographic algorithms. All primitives sourced from vetted libraries (`libsodium-wrappers-sumo`, `@noble/hashes`, `@noble/curves`).
- [ ] **Authenticated Encryption:** All vault payload encryption uses `XChaCha20-Poly1305` (IETF standard, 24-byte nonce) with authenticated associated data ($AD$) cryptographically bound to the Vault UUID and version envelope.
- [ ] **Argon2id Memory Hardness:** Passphrase derivation enforces minimum parameters ($m \ge 32\text{ MiB}, t \ge 3, p = 1$) to defend against GPU/ASIC brute-force attacks.
- [ ] **Verifiable Shamir Secret Sharing:**
  - Polynomial evaluation over the Galois Field $\text{GF}(256)$ with Rijndael irreducible polynomial $x^8 + x^4 + x^3 + x + 1$ ($0\text{x}11\text{B}$).
  - Every threshold share includes an index ($1 \dots n$) and a 32-byte BLAKE2b cryptographic commitment.
  - Reconstruction verifies all commitments in constant-time prior to Lagrange interpolation.
- [ ] **Memory Zeroization:** Sensitive buffers (raw Vault Key, plaintext shares, decrypted payloads) are wiped using `sodium.memzero` (`zeroize`) in mandatory `try ... finally` blocks.
- [ ] **Side-Channel Timing Resistance:** All hash and commitment comparisons use constant-time byte equality (`sodium.memcmp` / `constantTimeEqual`).
- [ ] **Test Coverage:** `packages/crypto-core` maintains **100% line coverage** with Known Answer Tests (KAT) and negative fuzzing.

---

## 2. Authentication & Identity Layer (`apps/api`, `packages/protocol`)

- [ ] **FIDO2 Passkeys Exclusive:** Passwords, SMS, and email OTPs are completely excluded from authentication ceremonies.
- [ ] **Resident Keys Enforced:** Registration options require `residentKey: 'required'` and `userVerification: 'required'`.
- [ ] **Minimum 2-Key Policy:** Users must register at least two distinct hardware passkeys (primary + backup hardware key) before vault creation is permitted.
- [ ] **Replay Counter Defense:** Sign counters are validated and updated on each successful authentication ceremony to detect cloned authenticators.
- [ ] **Session Hardening:**
  - Production cookies use the `__Host-` prefix (`__Host-cip-session`).
  - Strict attributes enforced: `HttpOnly; SameSite=Strict; Secure; Path=/`.
- [ ] **Emergency Kit Token Security:** Offline mnemonic backup tokens are never stored in plaintext; stored strictly as a one-way `HMAC-SHA256` verifier with a 16-byte random salt and enforced 7-day security delay upon activation.

---

## 3. Coordination API & Merkle Event Chain (`apps/api`)

- [ ] **Two-Tier Secret Separation:**
  - `apps/api` contains zero imports of `libsodium-wrappers-sumo`, `@noble/*`, or `crypto` (enforced by ESLint and Semgrep rules).
  - API receives and stores ciphertext blobs only.
- [ ] **Strict Schema Sanitization:**
  - All input endpoints use strict Zod schemas (`.strict()`) that reject any unrecognized JSON keys.
  - Automatic pattern detection rejects common BIP-39 mnemonic phrase sequences to prevent accidental seed phrase uploads.
- [ ] **Append-Only Merkle Hash Chain:**
  - Sequence numbers are strictly monotonic ($0, 1, 2, \dots$).
  - Every event links `prevHash` to the previous event's payload hash.
  - Every event is digitally signed with the server's Ed25519 signing key.
  - Full chain verification endpoint (`GET /vaults/:id/events/verify`) enables independent client-side audit.

---

## 4. State Machine & Background Scheduler (`apps/worker`)

- [ ] **Deterministic Timers:** Time calculations in `evaluateVaultCountdown` are pure functions without non-deterministic side-effects.
- [ ] **Escalating Alerts:** Notifications follow a strict 4-tier escalation model (30d, 14d, 7d, Grace Period) with 72-hour re-alert pings during an active `CHALLENGE`.
- [ ] **Claim Gating:** Heir inheritance claims are strictly rejected unless the vault is in the `PENDING` state (primary interval + grace period fully elapsed).
- [ ] **Owner Revocation Authority:** Owner passkey assertion immediately cancels any active claim, reverts vault state to `ACTIVE`, resets countdown timers, and records a `CLAIM_CANCELLED` event on the Merkle chain.

---

## 5. Isolated Release-Signer Enclave (`apps/release-signer`)

- [ ] **Minimalist Codebase:** Total LOC remains strictly under the 1,000 LOC target (~515 LOC current), minimizing the attack surface.
- [ ] **Network Isolation:** Service runs with zero public internet ingress/egress; accessible strictly over internal mTLS with client certificate verification.
- [ ] **Multi-Clock Anti-Warp Engine:** Evaluates hardware RTC against external signed Roughtime attestations (Cloudflare, Google) with a maximum allowable skew of $\pm 10$ minutes.
- [ ] **Cryptographic Event Chain Walk:** Validates monotonic sequences, hash linkage, and server signatures before evaluating release conditions.
- [ ] **Fail-Closed Release Invariant:** If any `CLAIM_CANCELLED`, `CHECKIN`, or `VAULT_PAUSED` event appears after `CLAIM_INITIATED`, release is immediately refused.
- [ ] **Zero Platform Custody:** Escrow share $S$ is decrypted and immediately re-encrypted directly to the Heir's X25519 public key. Intermediate plaintext memory is zeroized before the response returns.

---

## 6. Frontend & Operational Hardening (`apps/web`, `infra/`)

- [ ] **Content Security Policy:**
  ```http
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; require-trusted-types-for 'script';
  ```
- [ ] **Origin Isolation Headers:** `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, `Cross-Origin-Resource-Policy: same-origin`.
- [ ] **Container Hardening:**
  - Multi-stage Docker builds discarding dev tools.
  - All services run as unprivileged, non-root users (`USER node` UID 1000, `USER 101` in Nginx).
  - Enclave network configured with `internal: true` (no internet gateway).
  - Security option `no-new-privileges: true` set across all compose services.
- [ ] **Bundle Integrity Verification:** Users can independently verify web dashboard assets using `cip verify-bundle --dir apps/web/dist` (or `aethel verify-bundle`).

