---
name: crypto-design-review
description: Review cryptographic protocol proposals, key lifecycle, encryption envelopes, threshold shares, or crypto libraries. Use before any secret-handling code is written or changed.
---
# Cryptographic Design Review Skill

## Hard stops
- No custom cryptographic primitives, RNG, KDF, Shamir arithmetic, or serialization parser for secrets.
- No real wallet secrets in prompts, test fixtures, logs, or issue reports.
- No hosted secret intake or server decryption.
- No cryptographic implementation approval by the coding agent alone.

## Procedure
1. Read `CRYPTOGRAPHIC_DESIGN.md` and ADR 0004.
2. Identify the exact security goal and attacker model.
3. Compare canonical specifications and maintained implementations; verify license, provenance, test vectors, runtime support, and current maintenance.
4. Review entropy generation, key separation, nonce policy, AEAD associated data, versioning, downgrade/replay behavior, threshold semantics, share encoding, memory handling, and rotation.
5. Document security properties and non-goals, including early guardian collusion and lack of remote revocation for copied shares.
6. Propose an ADR; do not implement until a human approves the ADR and independent cryptographic review is scheduled/completed as required.

## Required output
A written design review with exact references, library/commit details, test-vector plan, failure modes, unresolved questions, and a clear NO-GO when evidence is insufficient.
