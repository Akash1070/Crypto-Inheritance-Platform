---
name: release-readiness
description: Prepare a security-focused go/no-go assessment for a release candidate. Use before tagging, publishing, or deploying.
---
# Release Readiness Skill

## Procedure
1. Read `CODE_AUDIT_AND_RELEASE_GATE.md`, `OPEN_SOURCE_GOVERNANCE.md`, and current audit findings.
2. Verify clean worktree, commit, lockfile, pinned CI actions, build configuration, and environment-secret handling.
3. Collect tests, SAST, SCA, secret scan, DAST, SBOM, provenance/signature, migration, restore, and usability drill evidence.
4. Review unresolved Critical/High findings and all accepted risks.
5. Verify `SECURITY.md`, incident contact, privacy/retention disclosures, release signatures, rollback plan, and shutdown/export path.
6. Mark missing evidence as missing. Do not infer test success from config files or past runs.
7. Produce explicit GO/NO-GO with reasons.

## Stop conditions
No GO with any open Critical/High issue, any secret intake in the hosted MVP, no human sign-off, no required independent test, or missing restore/recovery drill. Do not deploy or publish unless a human explicitly authorizes it after reviewing the report.
