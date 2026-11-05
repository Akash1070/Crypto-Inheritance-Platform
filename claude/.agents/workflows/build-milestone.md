# /build-milestone

Build one milestone safely. Usage: `/build-milestone M1` (milestone id from `docs/07-PROJECT-PLAN.md`).

## Steps
1. **Load context.** Read `AGENTS.md`, `docs/04-SECURITY-ARCHITECTURE.md`, `docs/05-THREAT-MODEL.md`, `docs/03-TRD.md`, the milestone's section in `docs/07-PROJECT-PLAN.md`, the relevant PRD requirements (FR ids) and `docs/14-ADR-LOG.md`.
2. **Plan.** Produce a plan: files to add/change, tests to write first, dependencies needed (each needs `dependency-vetting`), threats affected, protected areas touched, open questions. Stop and wait for human approval if any protected area is touched or any question is open.
3. **Branch.** Create `milestone/<id>-<short-name>`.
4. **Tests first.** Write failing tests: KAT/property for crypto, transition matrix for state machine, API contract tests, e2e outlines.
5. **Implement** in small commits. After each commit run: typecheck, lint, unit/property tests, secret scan.
6. **Protected-area check.** If you touched a protected area, run the `crypto-change-review` skill and add a "Human review required" section to `docs/PROGRESS.md`.
7. **Dependency check.** For each new dependency run `dependency-vetting` and append to `docs/14-ADR-LOG.md`.
8. **Threat model.** Run `threat-model-update` if attack surface changed.
9. **Security review.** Run `/security-review`. Fix or document every finding.
10. **Full checks.** Run the complete CI suite locally (lint, types, tests, SAST, dependency scan, canary-secret e2e where relevant).
11. **Report.** Update `docs/PROGRESS.md` and output: What changed · Tests and results · Not tested · Uncertainties · Threats affected · ADRs added · Human review required · Next step. Do not start the next milestone.

## Stop conditions
Any hard stop in `.agents/rules/03-process.md`. When stopped, explain precisely what you need and why.
