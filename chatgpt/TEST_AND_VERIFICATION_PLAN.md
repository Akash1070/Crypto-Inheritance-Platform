# Test and Verification Plan

## 1. Testing philosophy

The critical question is not “does the happy path work?” It is “can a user, attacker, insider, dependency, or failure mode cause premature access, permanent lockout, silent state corruption, or misleading recovery claims?”

## 2. MVP test layers

### Unit tests

- State-machine transition table, including invalid transitions.
- Date arithmetic across daylight-saving/timezone changes and leap days.
- Idempotency and duplicate job processing.
- Invitation expiry, consumption, revocation, and recipient binding.
- Authorization policy functions.
- Cancel-code verification and rotation.
- Export schema versioning and redaction.

### Integration tests

- Cross-tenant isolation for every resource.
- Owner/guardian/heir/executor/operator authorization matrix.
- Concurrent guardian changes and check-in jobs.
- Duplicate and replayed check-ins.
- Scheduler outage and retry behavior.
- Notification vendor failure and fallback.
- Account deletion and backup retention behavior.
- Database restore into a clean environment.

### End-to-end tests

- Owner creates plan, invites guardians, completes check-in, exports plan.
- Guardian accepts invitation and sees only permitted information.
- Missed check-in progresses through each stage at accelerated test time.
- Owner cancels via passkey.
- Owner cancels via offline emergency code after simulated device loss.
- Guardian records a contact attempt but cannot alter owner plan or claim death.
- Export remains readable without the hosted service.
- Drill mode cannot be confused with a live plan.

### Abuse/security tests

- IDOR and broken object-level authorization.
- CSRF, XSS, injection, open redirect, SSRF, clickjacking, session fixation, replay.
- Account enumeration and invitation token brute force.
- Rate-limit bypass and concurrent request race conditions.
- Guardian replacement/social-engineering scenarios.
- Malicious email links and GET-triggered state changes.
- Log/telemetry scanning for secret-like values and PII leakage.
- Dependency compromise simulation and CSP validation.

## 3. Property-based invariants

- A plan cannot skip a required state.
- No scheduler retry moves the due date earlier.
- A guardian cannot mutate owner-only fields under any sequence of API calls.
- Revoked invitation tokens never become valid again.
- An expired or consumed cancel code never becomes valid again.
- A state transition is recorded at most once for one idempotency key.
- No state can create a transaction or signing request.
- No API accepts a secret field.

## 4. Future crypto-tool tests

- Published vectors for selected algorithms and formats.
- Round-trip encryption/decryption on supported OS versions.
- Tamper detection for every byte region of the ciphertext/envelope.
- Wrong key, wrong password, wrong AAD, unsupported version, truncated envelope.
- Threshold-minus-one shares cannot reconstruct; threshold shares can reconstruct.
- Duplicate shares, wrong package shares, mixed generations, malformed words, reordered shares.
- Independent implementation interoperability.
- Fuzz parsers and share reconstruction; run sanitizers where applicable.
- RNG failure must abort; no weak fallback.
- Network sandbox confirms no outbound connections during secret operations.
- Clean-machine offline recovery drill with no developer account or hosted-service access.
- Device compromise limitations documented and tested to the extent possible.

Never put real seed phrases or real private keys in CI. Use official synthetic test vectors and disposable keys only.

## 5. Security tooling

Evaluate and configure, with versions pinned:
- Semgrep (SAST/custom rules).
- CodeQL (where supported and licensing/CI conditions permit).
- Gitleaks (secret scanning).
- OSV-Scanner (dependency vulnerability scanning).
- Syft (SBOM generation) and Grype (SBOM/image vulnerability scanning).
- OpenSSF Scorecard (repository security posture).
- Playwright + ZAP or equivalent DAST for web flows.
- Fuzzing/property testing appropriate to the chosen language and crypto library.

Automated tools supplement—not replace—manual review and an independent penetration test.

## 6. Release test evidence

Every release candidate must attach:
- commit hash and dependency lockfile hash;
- test command and complete pass/fail summary;
- SAST/SCA/secrets/DAST results;
- SBOM and provenance/signature evidence;
- threat-model delta;
- open issue list with severity and owner;
- reviewer sign-offs;
- recovery drill record (synthetic test assets only).
