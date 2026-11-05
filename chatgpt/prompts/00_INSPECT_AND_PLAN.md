# Prompt 00 — Inspect the repository and produce a plan (NO CODE CHANGES)

Act as a principal product security architect and staff engineer. This project can permanently expose or destroy users' financial assets. Precision and security outrank speed.

Read these files completely before doing anything else:
- `AGENTS.md`
- `README.md`
- `DESIGN.md`
- `PRD.md`
- `TRD.md`
- `SECURITY_THREAT_MODEL.md`
- `CRYPTOGRAPHIC_DESIGN.md`
- `DATA_MODEL_AND_API.md`
- `CODE_AUDIT_AND_RELEASE_GATE.md`
- all ADRs under `docs/adr/`

Then inspect the existing repository without modifying files. Map:
1. framework, language, package manager, entry points, routes, UI structure;
2. API routes, data layer, database policies/migrations, authentication and authorization;
3. scheduled jobs, notifications, file uploads, analytics, logging, error tracking;
4. deployment, environment variables, CI/CD, dependency graph, secrets exposure;
5. tests, coverage gaps, accessibility, current architecture constraints.

Produce `docs/REPOSITORY_AUDIT.md` with:
- repository inventory and current architecture diagram;
- what already exists and what is missing against the PRD/TRD;
- trust boundaries and data flows;
- concrete security findings with file paths and line numbers;
- dependency/security posture observations;
- unresolved product/technical decisions;
- recommended smallest safe implementation sequence;
- risks that must block implementation.

Rules:
- Do not edit application code or package manifests.
- Do not add dependencies.
- Do not create secret-handling forms or cryptographic code.
- Do not claim the repository is secure based on a scan.
- Distinguish verified findings from hypotheses and unknowns.
- Do not ask for or inspect real keys, seed phrases, production credentials, or user data.

At the end, provide a concise “go / no-go for MVP implementation” recommendation and explain why.
