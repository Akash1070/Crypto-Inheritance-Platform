# 08 — Code Audit Plan

Three layers: (1) automated on every PR, (2) AI-assisted review per milestone, (3) human and external audits at gates. **AI review is a filter, not a verdict.** No AI review replaces G2/G3.

## 1. Automated gates (every PR, blocking)
| Check | Tool (candidates; vet first) |
|---|---|
| Type + lint | `tsc --strict`, ESLint with security plugins, custom rule banning crypto imports outside `crypto-core` |
| SAST | Semgrep (OWASP + custom rules), CodeQL |
| Secrets | gitleaks / trufflehog (pre-commit + CI) |
| Dependencies | `pnpm audit`, OSV-Scanner, license check, Socket/Snyk-style behaviour scan |
| Supply chain | Lockfile diff review, SHA-pinned Actions, `ignore-scripts`, SBOM (CycloneDX), SLSA provenance |
| Containers/IaC | Trivy, Checkov/tfsec |
| Web | CSP evaluator, header tests, axe a11y |
| Tests | Unit, property (fast-check), KAT vectors, integration, e2e (Playwright) |
| Fuzz | Parser/format fuzzing for vault, share, event decoders (jazzer.js or fast-check structured fuzz) |

## 2. Per-milestone AI audit (run `/security-review`)
The agent must produce `audit/<milestone>-report.md` containing: scope, files reviewed, threats touched, findings (severity, location, fix), tests added, unresolved doubts. Use a **fresh agent/session** for review (no shared context with the builder) and the prompt in `prompts/99-adversarial-review.md`. Also run a second, different model if available.

## 3. Crypto review checklist (G1/G2)
- [ ] Only approved primitives and libraries; versions pinned.
- [ ] No custom crypto; no unsafe randomness; no `Math.random`.
- [ ] Every AEAD call: random nonce of correct size, AD binds vault id + version + purpose, failures throw without partial output.
- [ ] No key reuse across purposes; domain-separated KDF labels.
- [ ] Share format has version, vault id, integrity commitment; wrong/mixed/duplicate shares detected.
- [ ] Constant-time comparisons for secrets/MACs.
- [ ] Argon2id parameters stored/validated; minimums enforced; cannot be downgraded by attacker-controlled header.
- [ ] Key and plaintext buffers zeroized; no secrets in exceptions, logs, JSON, URLs.
- [ ] Decoders reject malformed, truncated, oversized, unknown-version input; fuzzed.
- [ ] Known-answer tests from library vectors + our own fixed vectors; cross-implementation test (CLI vs browser).
- [ ] Replay/rollback tests for old shares and events.
- [ ] Signature verification of chain: all fields covered by signature; canonical serialization.
- [ ] No timing or error oracle in auth, claim or release.

## 4. State-machine review checklist (M4/M5)
- [ ] Every transition has explicit guard and signed event; illegal transitions impossible (tests enumerate matrix).
- [ ] Idempotent handlers; retries cannot double-release or skip challenge.
- [ ] Time handling: server-side only, monotonic, signed; clock-skew tests.
- [ ] `release-signer` re-verifies independently; does not trust API/worker inputs.
- [ ] No code path releases without CLAIM_STARTED + elapsed window + no cancel.
- [ ] Owner passkey login always cancels in CHALLENGE (tested race conditions around the last second).
- [ ] Pause cannot be abused to extend lock-out indefinitely without notice/limits.

## 5. Web/app review checklist (OWASP ASVS L3 mapped)
Auth/session (V2/V3), access control (V4), validation (V5), crypto (V6), errors/logging (V7), data protection (V8), comms (V9), business logic (V11), files (V12), API (V13), config (V14). Specifically: IDOR on every `:id` route; CSRF; XSS sinks; open redirects; SSRF in any URL fetch; mass assignment; verbose errors; user enumeration; rate-limit coverage.

## 6. Infra review checklist
Least-privilege IAM; no wildcard KMS policies; `release-signer` network isolation; mTLS; secret handling; backup encryption and restore test; log redaction tests; patching cadence; separate accounts; break-glass procedure; immutable logs; alerting tested.

## 7. Supply-chain review
Maintain `docs/dependencies.md`: each runtime dependency, why, maintainers, license, last release, weekly downloads, alternatives, vetting date. Fewer than ~40 direct runtime deps target. Review every lockfile diff. Prefer vendoring tiny critical libs with hash pin.

## 8. External audit process (G2/G3)
1. Freeze scope: `crypto-core`, `release-signer`, auth, state machine, web client integrity, infra.
2. Prepare audit pack: docs 03–05, architecture diagrams, threat model, test results, known issues, deploy instructions (use `audit-context-building`/`audit-prep-assistant` style skills, see doc 13).
3. Engage: independent cryptographer first (design), then application/infra firm (implementation). Prefer firms with crypto-wallet and applied-crypto experience.
4. Triage: all findings tracked; critical/high fixed and re-tested; medium justified or fixed; publish report.
5. Re-audit changes to crypto/state machine/release-signer after launch.

## 9. Bug bounty
Private first (invite-only researchers), public at G5. Scope: web app, API, release-signer, CLI, crypto-core, infra. Safe harbour language. Rewards tiered; max for any path to early release or plaintext recovery. Triage SLA 72 h. `SECURITY.md` and `security.txt`.

## 10. Audit report template (`audit/TEMPLATE.md`)
```
# Audit report — <milestone/date>
Reviewer: <agent/human>  Scope: <paths/commit>
Summary: <3 lines>
Findings: ID | Severity | Location | Description | Exploit scenario | Fix | Status
Tests added:
Threat-model impact:
Unresolved doubts (must be non-empty if any uncertainty):
Sign-off: <human name/date>
```
