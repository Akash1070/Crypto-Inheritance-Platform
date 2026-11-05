# 04 — Security Architecture and Release Protocol (v1 draft)

**Status: DRAFT. Must be reviewed by a qualified applied cryptographer before any real secret is stored (Gate G2).** The agent implements this document; it never improvises or "improves" it. Proposed changes go through an ADR and human review.

## 1. Goals
- G1 Confidentiality: Heirkey (and anyone who breaches it) cannot read any pack.
- G2 No early release: no single compromised party (server, heir, guardian, email, phone) can open a pack while the owner is alive.
- G3 Liveness: heirs can recover after the owner is gone, even if Heirkey is offline (continuity).
- G4 Owner can always open and revoke their own pack.
- G5 Verifiable: open source, reproducible builds, client-verifiable audit log.

## 2. Non-goals
Protect against a fully compromised owner device while unlocked; protect against a coerced owner; make lost passkeys recoverable by Heirkey; custody funds.

## 3. Trust model
| Party | Trusted for | Not trusted for |
|---|---|---|
| Owner client (browser/CLI) | Generating keys, encrypting | — (must be integrity-verified, see §9) |
| Heirkey server | Storing ciphertext, scheduling, gating escrow release | Confidentiality |
| `release-signer` | Releasing escrow share only after verified conditions | Reading packs (it never has the heir share) |
| Heir | Holding their own share and passkey | Releasing early on their own |
| Drand (optional v2) | Randomness/time beacon | — |

## 4. Primitives (only these; all from vetted libraries via `crypto-core`)
- Symmetric AEAD: XChaCha20-Poly1305 (libsodium `crypto_aead_xchacha20poly1305_ietf`), 256-bit keys, random 192-bit nonces from the OS CSPRNG. Associated data binds vault id, version and purpose.
- Passphrase KDF: Argon2id (libsodium `crypto_pwhash`), parameters in header.
- Key agreement / sealing to a person: X25519 sealed box (`crypto_box_seal`) or HPKE (RFC 9180) if a vetted TS implementation is approved; pick one via ADR.
- Hash/KDF: BLAKE2b / HKDF-SHA256 with domain separation labels.
- Signatures (audit log, release events): Ed25519.
- Secret sharing: Shamir over GF(256) via a vetted library (candidate: `shamir-secret-sharing` — *verify its published audit status before adoption*). Share integrity: every share carries a version byte, vault id and an HMAC/commitment so corrupted or swapped shares are detected (SSS alone provides no integrity).
- Randomness: libsodium `randombytes_buf` / WebCrypto `getRandomValues` only.
- Constant-time comparison: libsodium `sodium_memcmp`.
Forbidden: custom ciphers/modes, RSA-PKCS1v1.5, AES-CBC without MAC, MD5/SHA-1, `Math.random`, unauthenticated encryption, ECB, homemade SSS, roll-your-own HPKE, key reuse across purposes.

## 5. Keys and shares
- `VK` — Vault Key, 256-bit random, generated in owner's client.
- `Pack ciphertext` = AEAD(VK, pack plaintext, AD = vault_id ‖ version).
- `OwnerWrap` — VK wrapped by an owner key derived from the owner's passkey (WebAuthn PRF extension, if available) **and/or** a high-entropy Emergency Kit secret. Owner can always open their pack.
- Heir release uses a **2-of-2 split** (Standard mode): `VK = H ⊕ S` using proper SSS (threshold 2, n 2) so neither alone reveals anything.
  - `H` — Heir share. Sealed to the heir's public key (`heir_pubkey`). The heir's private key is protected by the heir's passkey (PRF) and the Heir Kit secret. Stored on server as ciphertext, useless without heir keys.
  - `S` — Escrow share. Encrypted by owner client directly to the **release-signer's public key** (never visible to API). Stored as ciphertext in `escrow_shares`. Only `release-signer` (with KMS-protected private key) can decrypt it, and only after §7 conditions. On release it re-encrypts `S` to the heir's public key and publishes that ciphertext.
- **Fortress mode (Phase 2):** 3-of-3 using `H`, `S`, and `G` where `G` is itself split k-of-m across guardians (each guardian share sealed to the guardian's key). Early release then needs three independent compromises.
- Multiple heirs: each heir gets an independent (H_i, S_i) pair for the same VK (separate SSS per heir). Removing an heir deletes their shares; for strong revocation the owner rotates VK and re-encrypts the pack (UI offers "Rotate keys").

Why not pure time-lock encryption (drand/tlock) for release? Time-lock ciphertexts cannot be revoked: any copy made earlier will open at its round even if the owner is alive. A server compromise or heir copy of an old ciphertext would release the vault early. Time-lock may be added later only as an extra floor on `S` release timing (ADR-004), never as the primary mechanism. (tlock/tlock-js are verified public repos if this is explored.)

## 6. Flows

### 6.1 Create pack (owner client)
1. Passkeys registered (≥2).
2. Generate `VK`; encrypt pack → `Pack ciphertext`; upload ciphertext + hash.
3. Create `OwnerWrap`; upload.
4. For each heir: heir completes onboarding (own passkey, generates `heir_pubkey`). Owner client produces `(H_i, S_i)` via SSS of VK; seals `H_i` to heir key; seals `S_i` to release-signer key; uploads both.
5. Generate Emergency Kit (owner) and prepare Heir Kit (see 6.5). Owner confirms printed/stored.
6. Dry-run recommended before activation.

### 6.2 Check-in
Owner performs WebAuthn assertion bound to `vault_id`, a server nonce and timestamp. Server writes a signed `CHECKIN` event. Email/SMS/push never count.

### 6.3 Trigger
Worker evaluates `last_checkin_at` against interval + grace, escalating reminders; writes signed `PENDING` event. No cryptographic material moves.

### 6.4 Claim → challenge → release
1. Heir (passkey step-up) starts claim in PENDING → `CLAIM_STARTED` event; challenge timer set (default 30 d, min 14 d) and owner notified on all channels every 3 days.
2. Owner passkey login in CHALLENGE → `CLAIM_CANCELLED`; state ACTIVE.
3. After timer: heir requests release with fresh step-up. API forwards `{vault_id, claim_id, event_chain_head}` to `release-signer` over mTLS.
4. `release-signer` independently: verifies event chain signatures and hashes; confirms `CLAIM_STARTED` age ≥ challenge window on its own clock; confirms no `CLAIM_CANCELLED`/`CHECKIN`/`PAUSE` after it; verifies heir step-up token; rate-limits; requires a second approver key for vaults flagged high value (optional, v1.1).
5. It decrypts `S`, re-encrypts to heir's public key, emits `RELEASE` event, and zeroizes memory.
6. Heir client decrypts `S` and `H` locally, reconstructs `VK`, decrypts pack. Server never sees `VK`.

### 6.5 Heir Kit and continuity (platform-offline recovery)
Problem: `S` lives behind Heirkey. If Heirkey disappears, heirs cannot get `S`.
Mitigations (all available; owner picks, default A+B):
- **A. Escrow export to a trusted third party:** owner may seal a copy of `S` to an independent escrow (lawyer, notary, second Heirkey instance, self-host) released by the same time rules. Documented in the kit.
- **B. Self-host/open source:** the kit lists how to stand up the open-source release service; the escrow key can be provided by a continuity trustee (Heirkey Foundation/lawyer) if the company shuts down (legal doc, see doc 10).
- **C. Owner-held backup of `S`:** owner may print `S` as QR for a lawyer's safe, accepting a trust tradeoff (documented).
Heir Kit contents: instructions in plain language; encrypted pack file; heir's sealed share `H`; CLI download hash/signature; who to call; no cleartext secrets.

### 6.6 Rotate / revoke
Owner rotates VK (new pack ciphertext, new shares). Old escrow shares are deleted; heirs' old `H` becomes useless.

## 7. Release conditions (checked by `release-signer`, not by API)
All must hold: valid chain; CLAIM_STARTED + ≥ challenge window; no cancelling event; heir step-up fresh (<5 min); vault not PAUSED; rate limits; escrow key version matches; not already RELEASED; anomaly checks (geo/device change on heir → extended delay).
`release-signer` code is minimal (<1,000 LOC target), separately reviewed and audited, with no inbound dependencies except the verified request and KMS.

## 8. Account and session security
Passkeys only; resident keys preferred; two required; attestation not required; user verification required for sensitive operations; counters checked; session cookies `HttpOnly; Secure; SameSite=Strict; __Host-` prefixed; short TTL; step-up for all sensitive actions; device list visible with revocation; account recovery = delayed (≥7 days), notified on all channels, cancellable, and grants login only (never vault access).

## 9. Client integrity (the hardest web E2EE problem)
A malicious JS bundle served by a compromised server can steal keys. Mitigations: static, hashed, reproducible bundle; strict CSP + Trusted Types; SRI; no third-party code; signed releases + transparency log; `heirkey verify` and a browser extension/PWA option that pins hashes (Phase 2); desktop/mobile app builds signed; optional "air-gapped CLI" path for advanced owners; documentation honest about the residual risk. Recommend heirs use the CLI for high-value packs.

## 10. Audit log
Each event: `{seq, type, vault_id, payload_hash, prev_hash, ts, signature}`. Server signing key in KMS; owner client verifies chain head on each login and shows alerts on unexpected events. Chain head also periodically anchored to a public log (e.g. Sigstore Rekor or a public blockchain timestamp) so server cannot rewrite history silently.

## 11. Memory and data handling
Zeroize key buffers after use; avoid string copies of secrets; disable core dumps on `release-signer`; no secrets in logs, URLs, query strings, error messages, analytics, crash reports; redaction middleware with tests; backups hold ciphertext only.

## 12. Parameters (initial, to be confirmed by reviewer)
| Parameter | Value |
|---|---|
| VK | 256-bit |
| AEAD nonce | 192-bit random |
| Argon2id | ≥ 64 MiB, t ≥ 3, p = 1 (desktop); never below 32 MiB, t ≥ 3 |
| Check-in interval | default 90 d (30–365) |
| Grace | default 21 d |
| Challenge window | default 30 d (min 14) |
| Heir step-up freshness | 5 min |
| Passkeys required | ≥ 2 owner, ≥ 1 heir (recommend 2) |

## 13. Open cryptographic questions for the reviewer
1. SSS library choice and share-integrity commitment format.
2. HPKE vs sealed box for sealing.
3. Using WebAuthn PRF for client key derivation across browsers/OS and fallback behaviour.
4. Whether to require 2 approvers on `release-signer` at launch.
5. Post-quantum plan (hybrid KEM, e.g. X25519+ML-KEM) given multi-decade storage horizon. Recommend designing format versioning now so upgrade is possible.
6. Padding/metadata hiding of pack sizes.

## 14. Format versioning
Every ciphertext and share begins with `{magic, format_version, suite_id}`. Decoders reject unknown versions. Migrations require re-encryption by the owner.
