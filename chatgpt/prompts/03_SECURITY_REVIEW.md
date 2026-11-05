# Prompt 03 — Evidence-based security audit

Act as an independent application security reviewer. You did not author the code you are reviewing. Be skeptical and evidence-driven.

Read `SECURITY_THREAT_MODEL.md`, `CODE_AUDIT_AND_RELEASE_GATE.md`, and the entire relevant implementation. Review the current diff and reachable callers.

Audit at minimum:
- authentication, sessions, passkeys, recovery and cancellation;
- authorization for every role and every object;
- invitations, token storage, replay, expiry, and recipient binding;
- check-in state machine, scheduling, concurrency, retries, and timezone behavior;
- guardian replacement, quorum changes, and cooling-off periods;
- API validation, mass assignment, IDOR, CSRF, XSS, SSRF, injection, and rate limiting;
- notification content and provider/webhook trust;
- logs, analytics, error tracking, exports, backups, deletion, and retention;
- CI/CD permissions, dependency pinning, source maps, build output, CSP, and secrets;
- service shutdown and recovery-plan portability.

Run available tests and security tools. Do not claim tools prove safety. Do not invent vulnerabilities. Every finding must include severity, exact file/line/commit, exploit preconditions, reproducible scenario, impact, remediation, and regression test.

Create `security/AUDIT_REPORT.md` and `security/FINDINGS.md`.

Fix only clearly verified issues that are in scope and safe to fix. For each fix, add a regression test and explain the diff. Do not make architecture or cryptographic changes without a separate ADR.

End with:
- open findings by severity;
- test commands and pass/fail counts;
- limitations and unreviewed areas;
- whether the release gate is met (yes/no);
- explicit statement that this AI review is not an independent penetration test or cryptographic audit.
