# 09 — Test Strategy

Principle: tests are the specification the agent cannot argue with. The agent must never delete, skip or loosen a test to get green.

## 1. Pyramid
| Level | Scope | Target |
|---|---|---|
| Unit | Pure functions, validators | ≥ 90% overall; `crypto-core` and state machine 100% line + branch |
| Property-based | Round-trips, invariants (fast-check) | Every crypto and protocol function |
| Known-answer (KAT) | Fixed vectors for AEAD, Argon2id, sealing, SSS, share format | Frozen in `packages/crypto-core/test/vectors/`, fake data only |
| Integration | API + DB + worker + release-signer in containers | All flows in PRD |
| E2E | Playwright: owner setup, check-in, claim, release, dry-run | Run on every PR (headless) + nightly |
| Fuzz | Decoders for vault, share, event, API inputs | Nightly, corpus saved |
| Mutation | Stryker on `crypto-core` and state machine | ≥ 80% mutation score on these |
| Security | SAST/DAST (ZAP baseline), dependency, secrets | Blocking |
| Chaos/DR | Kill worker mid-release, clock skew, DB failover, KMS outage | Pre-launch and quarterly |
| Usability | Non-technical owners/heirs | Per design doc |

## 2. Crypto test requirements
1. **Round trip:** for random pack sizes 0 B–5 MB, `decrypt(encrypt(x)) == x`.
2. **Tamper:** flipping any bit of ciphertext, nonce, AD, header, version, or vault id makes decryption fail with a generic error and no partial plaintext.
3. **Share properties:** any single share reveals nothing (statistical test is not proof, so rely on library guarantee and review); reconstruct with correct shares; fail with wrong/mixed vault shares, duplicate shares, truncated shares, older version shares.
4. **Nonce uniqueness:** 1M encryptions produce no repeats (sanity only).
5. **Cross-implementation:** CLI and browser build decrypt each other's ciphertext; reference vectors from libsodium/RFC test suites.
6. **Downgrade:** attacker-modified Argon2id params below minimum are rejected.
7. **Zeroization:** tests assert buffers are zeroed after use (best effort).
8. **No secrets in output:** serialization of errors/logs checked with canary secrets ("CANARY-SECRET-123") that must never appear in logs, errors, network payloads to API, or analytics (canary test in e2e).

## 3. State machine tests
- Exhaustive transition table test (every state × event → expected state or rejection).
- Time-travel tests with a fake clock: boundaries at interval, grace, challenge window (±1 s).
- Race tests: owner login at T_end−1 s vs. release request; concurrent claims; double release; retries after crash.
- Event chain: tampering, reordering, deleting, replay; `release-signer` rejects all.
- Pause abuse limits.

## 4. Auth tests
Registration/login/step-up with virtual authenticators; counter rollback; wrong origin; wrong RP ID; replayed assertion; expired challenge; second-passkey requirement; delayed recovery cancellation by any channel; session fixation/hijack; CSRF.

## 5. Web tests
CSP present and correct on every response; no inline scripts; Trusted Types enforced; no third-party requests (network allowlist test in Playwright fails on any external host); localStorage/IndexedDB contain no keys or plaintext; clipboard clearing; a11y (axe) zero serious violations.

## 6. Release-signer tests
Run in isolation with mocked KMS: refuses all invalid inputs; only releases in the exact valid condition; logs every decrypt; rate-limits; handles KMS failures safely (fail closed); memory zeroization; no network egress.

## 7. Red-team and DR drills (from threat model §6)
Scripted exercises with pass/fail criteria recorded in `audit/redteam-<date>.md`.

## 8. Test data rules
Fake secrets only, clearly labelled (e.g. `abandon abandon ... about` style test mnemonics must never hold real funds). No production data in tests. Fixtures contain no personal data.

## 9. CI structure
`pr.yml` (fast: lint, type, unit, property, KAT, SAST, secrets), `integration.yml` (containers), `nightly.yml` (fuzz, mutation, DAST, e2e matrix), `release.yml` (reproducible build, SBOM, sign, provenance, publish hashes).
