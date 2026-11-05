# /pre-release-gate

Checks before any release candidate, beta, or public launch. Output a pass/fail table; any fail blocks release.

## Steps
1. **Gate status** (`docs/07-PROJECT-PLAN.md` §3): list gates G0–G6; for each, show evidence file/link or mark MISSING. Real user secrets are only allowed after G3 (limited beta) and G5 (public). If missing, stop.
2. **Repo hygiene** (`docs/11-OPEN-SOURCE-AND-RELEASE.md` §2): full-history secret scan; no internal URLs/keys; docs complete; SECURITY.md filled; branch protections described.
3. **Build integrity:** reproducible build produces identical hashes twice; SBOM generated; artifacts signed; provenance attached; bundle hash manifest published; `heirkey verify` passes against staging.
4. **Quality gates:** full CI green; mutation score on `crypto-core` and state machine ≥ 80%; fuzz nightly clean for 7 days; coverage targets met.
5. **Security tests:** every red-team exercise in `docs/05-THREAT-MODEL.md` §6 has a recorded result in `audit/`; no open critical/high findings.
6. **Operational readiness:** kill switches tested; backups restore tested; alerting tested; on-call and incident contacts set; status page; DR drill with Heir Kit while platform offline passed.
7. **Headers/CSP:** run header and CSP checks against staging; Trusted Types enforced; no third-party requests (Playwright allowlist test).
8. **Legal readiness** (`docs/10-LEGAL-AND-COMPLIANCE.md` §8): items checked.
9. **Dependency review:** `docs/dependencies.md` up to date; no unmaintained or unreviewed critical deps; lockfile diff reviewed.
10. **Output:** table `Item | Status (PASS/FAIL/MISSING) | Evidence | Owner`. End with one of: BLOCKED (list blockers) or READY FOR HUMAN SIGN-OFF. Never declare launch approved; only a human signs off.
