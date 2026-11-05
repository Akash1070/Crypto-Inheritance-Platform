---
name: crypto-change-review
description: Use whenever code in packages/crypto-core, release-signer, auth, the trigger/release state machine, or anything handling keys, shares, nonces, signatures or secrets is created or changed. Produces a structured review that a human must sign off.
---

# Crypto change review

## When to use
Any change that touches keys, shares, encryption, KDFs, randomness, signatures, key wrapping, share formats, event-chain signing, passkey-derived keys, or `release-signer`.

## Procedure
1. **Scope.** List every changed file and function that handles key material or ciphertext. Confirm all crypto stays in `packages/crypto-core`.
2. **Spec conformance.** Compare the code with `docs/04-SECURITY-ARCHITECTURE.md`. List each place it deviates. Deviations are stopped until a human approves an ADR.
3. **Primitive audit.** For each primitive call confirm: approved library, approved function, correct parameter sizes, no downgrade path.
4. **Nonce and AD.** Every AEAD call: random 192-bit nonce for XChaCha20-Poly1305, associated data binds vault id + version + purpose, nonce never reused or derived from counters held in client state that could roll back.
5. **Key hygiene.** One purpose per key; domain-separated derivation labels; no keys in strings, logs, errors, URLs, storage; zeroization after use; no key crossing into API code.
6. **Share handling.** Shares include version, vault id, integrity commitment; reconstruct only with verified compatible shares; test mixed/duplicate/old shares.
7. **Decoder safety.** Malformed, truncated, oversized, unknown-version input rejected; fuzz tests exist.
8. **Errors and side channels.** Generic errors; no oracle distinguishing failure causes; constant-time comparisons for secrets.
9. **Tests.** Confirm KAT vectors (library vectors + fixed vectors), property tests, tamper tests, cross-implementation test (CLI vs browser), mutation test results.
10. **Output a review block** in the PR/`docs/PROGRESS.md`:

```
Crypto change review — <date> — <branch>
Files: ...
Spec deviations: none | list
Primitives used: ...
New dependencies: none | list (with dependency-vetting refs)
Tests added/results: ...
Residual risks / doubts: ...
HUMAN REVIEW REQUIRED: <exact items a human cryptographer/dev must verify>
```

## Hard rules
- Never invent or "improve" a construction. If the spec lacks something, stop and ask.
- Never claim the change is secure. State what was checked and what was not.
- Do not skip this skill because the change "looks small".
