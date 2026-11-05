---
trigger: always_on
description: Non-negotiable security invariants for the crypto inheritance project.
---
# Security invariants

- Hosted MVP never accepts, processes, transmits, logs, or stores seed phrases, private keys, wallet passwords/PINs, threshold shares, DEKs, or plaintext recovery packages.
- No custody, signing, broadcasting, transfer, hidden master key, admin recovery, or support override.
- Never call inactivity proof of death. It is a coordination status only.
- Guardian quorum is social governance, not a cryptographic time lock. Explicitly disclose early-collusion risk.
- No custom cryptography or custom Shamir implementation.
- Any future crypto tool is offline, separately versioned, standard-based, independently reviewed, and tested with synthetic vectors.
- Security-sensitive decisions require an ADR, negative tests, and human review.
- Stop and document an unresolved security design instead of guessing.
