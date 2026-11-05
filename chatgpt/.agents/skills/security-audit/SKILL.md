---
name: security-audit
description: Perform an evidence-based security audit of code, APIs, state machines, authentication, authorization, deployment, and dependencies.
---
# Security Audit Skill

## Procedure
1. Establish scope, commit hash, and repository baseline.
2. Map routes, data stores, roles, jobs, external services, secrets, and trust boundaries.
3. Review auth/session, object authorization, guardian workflow, invitations, cancellation, scheduler, notifications, exports, logs, backup, CI/CD, and dependency paths.
4. Trace attacker-controlled input to security-sensitive effects.
5. Run available tests and scanners. Record tool/version/command/output summary.
6. Validate each finding with reproducible evidence; distinguish confirmed vulnerabilities from hypotheses.
7. Assign severity based on impact and exploitability; include exact file/line, preconditions, attack path, fix, and regression test.
8. Fix only in-scope verified findings; do not silently redesign crypto or trust boundaries.

## Output
Create a Markdown report under `security/` and conclude with open findings, coverage limits, tests not run, and explicit release-gate status. Never describe an AI-only audit as an independent audit.
