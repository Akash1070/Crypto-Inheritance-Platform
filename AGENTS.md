# Standing Instructions for AI Coding Agents: Crypto Inheritance Platform

You are working on the Crypto Inheritance Platform, an open-source, zero-knowledge, non-custodial crypto inheritance protocol. 

Real funds, estate secrets, and family legacies depend on this code. Correctness and mathematical security strictly outrank speed.

## Non-Negotiable Security Invariants

1. **Two-Tier Secret Separation (ADR-0001):**
   - The web client (`apps/web`) and API (`apps/api`) MUST NEVER collect, accept, process, transmit, log, or store unencrypted seed phrases, private keys, or plaintext threshold shares.
   - Any secret handling must remain exclusively inside `packages/crypto-core` and the offline `packages/cli`.

2. **No Invented Cryptography (ADR-0002):**
   - NEVER create homemade encryption algorithms, custom KDFs, custom curves, homemade Shamir math, or unauthenticated cipher modes.
   - Use only vetted implementations (`libsodium-wrappers-sumo`, `@noble/hashes`).
   - All symmetric ciphertexts must use XChaCha20-Poly1305 with authenticated associated data.
   - Every Shamir share must include a BLAKE2b commitment to prevent rogue share tampering.

3. **Passkeys Only (ADR-0003):**
   - WebAuthn FIDO2 resident keys are required for owner and heir authentication.
   - Email is a notification transport, NEVER proof of liveness.

4. **Isolated Enclave Release (ADR-0004):**
   - Only `apps/release-signer` may decrypt escrow shares.
   - It independently verifies the full signed Merkle event chain and multi-clock time anchors.

5. **Linting & Architecture Enforcement:**
   - Any import of `libsodium-wrappers-sumo`, `@noble/*`, or `crypto` inside `apps/web` or `apps/api` is a build-failing security violation.

6. **Preserve Archival Blueprints:**
   - The directories `chatgpt/` and `claude/` are archival reference folders. Do not delete them.

