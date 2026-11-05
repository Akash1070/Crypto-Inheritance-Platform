# Prompt 05 — Phase 2 cryptographic research spike (SYNTHETIC DATA ONLY)

This is a research spike, not permission to integrate crypto recovery into production.

Read `CRYPTOGRAPHIC_DESIGN.md` and ADR 0004. Research the current canonical standards and maintained candidate implementations for:
- AEAD encryption of a random 256-bit DEK;
- threshold splitting and reconstruction of the DEK;
- offline recovery package format and versioning;
- optional public-key wrapping of shares, including HPKE limitations;
- offline build verification and artifact signing.

Use only synthetic test vectors. Do not request, create, paste, log, or store a real wallet seed phrase, private key, or production share.

Deliver:
1. `docs/CRYPTO_LIBRARY_EVALUATION.md` comparing candidate specs/libraries, license, maintenance, language/runtime support, test vectors, known limitations, audit evidence, and supply-chain risks.
2. `docs/CRYPTO_PROTOCOL_SPIKE.md` with a precise proposed flow and failure modes.
3. `docs/CRYPTO_TEST_VECTORS.md` with synthetic vectors only.
4. A proposed ADR with unresolved questions and a go/no-go recommendation.

Mandatory analysis:
- Confirm SLIP-0039 secret-size and threshold semantics against the canonical spec; do not assume it is automatically right for an arbitrary DEK.
- Do not implement Shamir arithmetic or cryptographic algorithms from scratch.
- Verify nonce handling, associated data, version downgrade handling, parser behavior, and authentication failure behavior.
- Explain that guardians holding a threshold can collude early if they obtain ciphertext; the inactivity service is not a cryptographic time lock.
- Explain how share rotation works and why already copied shares cannot be remotely revoked.
- Prove the tool can operate without network access in secret-handling paths.

Do not modify the hosted MVP, do not add production endpoints, and do not merge the spike. The output is for independent cryptographer review.
