# Code Audit, Security Review, and Release Gate

## 1. Audit scope

Audit the entire reachable attack surface, not only the most obvious crypto file:

- authentication and session lifecycle;
- authorization and tenant isolation;
- plan, role, invitation, check-in, and guardian state machines;
- scheduler, queue, webhook, and notification handlers;
- database schema, RLS/policies, migrations, backups;
- input validation, serialization, exports, and rendering;
- logging, analytics, telemetry, error reporting, support tooling;
- frontend build, scripts, CSP, dependency graph, CI/CD, secrets;
- future offline cryptographic core, package format, share flow, memory handling, releases.

## 2. Required review passes

### Pass A — Repository and architecture inventory

Map routes, components, APIs, tables, roles, scheduled jobs, external services, secrets, CI workflows, and dependency tree. Identify all trust boundaries. Do not modify code in this pass.

### Pass B — Threat-driven manual review

Walk each abuse case in `SECURITY_THREAT_MODEL.md`. Trace from untrusted input to sensitive state change or data disclosure. Include callers, asynchronous jobs, and indirect effects.

### Pass C — Automated testing

Run typecheck, lint, unit/integration/E2E tests, SAST, dependency scan, secret scan, configuration scan, SBOM generation, and DAST where appropriate. Record tool versions and commands. Triage findings with evidence.

### Pass D — Differential review

For every security-sensitive PR, compare the diff with the previous trusted commit. Inspect auth, crypto, validation, access control, data exports, error handling, and deployment configuration first. Small diffs can contain critical bugs.

### Pass E — Recovery and failure drills

Use dummy data. Test device loss, guardian loss, owner unavailability, email compromise, notification outage, service shutdown, corrupt export, failed restore, and partial-share recovery in Phase 2.

## 3. Finding format

Every finding must include:

- ID and title;
- severity: Critical / High / Medium / Low / Informational;
- affected file and exact line(s)/commit;
- preconditions and attacker capability;
- reproducible attack or failure scenario;
- impact and blast radius;
- evidence (test, trace, or code path);
- recommended fix;
- regression test;
- reviewer confidence and coverage limitations.

Do not report unsupported guesses as confirmed vulnerabilities. Do not mark a finding fixed until the regression test fails before the fix and passes after it, where feasible.

## 4. Severity guide

- **Critical:** plausible path to wallet-secret disclosure, unauthorized signing/transfer, broad cross-tenant data access, or irreversible recovery destruction.
- **High:** owner/guardian account takeover, unauthorized quorum/plan mutation, premature release coordination, sensitive inventory disclosure at scale, or bypass of a major protection.
- **Medium:** limited privacy/integrity issue, partial policy bypass, exploitable denial of service, or meaningful control weakness.
- **Low:** minor hardening or limited-scope information leak.
- **Informational:** documentation or defense-in-depth recommendation.

## 5. Production release blockers

- Any open Critical or High finding.
- Any code path that accepts or logs seed phrases/private keys in the web MVP.
- Any admin/support key recovery or signing capability.
- Unreviewed cryptographic implementation or custom crypto.
- No tested export/restore or service shutdown procedure.
- No owner emergency-cancel method.
- No independent penetration test.
- No incident contact/runbook.
- Unpinned critical dependencies or exposed build secrets.
- No evidence that permissions work across all role combinations.

For Phase 2, additionally block on missing independent cryptographic review, missing cross-implementation tests, inability to recover offline, or unclear early-collusion limitations.

## 6. Human sign-off

Required sign-offs:
- Product owner: requirements, wording, and user comprehension.
- Engineering lead: architecture, operations, and rollback.
- Security reviewer: threat model, manual review, test coverage.
- Independent penetration tester: web app.
- Independent cryptographer: Phase 2 protocol and implementation.
- Legal/privacy reviewer: launch jurisdictions, data handling, estate language.

An AI agent may prepare evidence and identify issues. It cannot provide independent sign-off on its own work.
