# Rule 02 — Engineering Standards

## Language and tooling
- TypeScript strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`; no `@ts-ignore` without a comment explaining and an ADR if in protected areas.
- pnpm workspaces, Turborepo. Node 22 LTS. Exact dependency versions, lockfile committed. `ignore-scripts=true` in `.npmrc`.
- ESLint with security rules; Prettier. Custom lint rule: crypto imports only in `packages/crypto-core` and `packages/cli`.
- Validate all external input with Zod at boundaries; reject unknown fields. Validate outputs for sensitive endpoints.

## Structure and style
- Small modules, pure functions where possible, explicit error types. No clever metaprogramming.
- Protected areas (need extra review, see rule 03): `packages/crypto-core`, `apps/release-signer`, auth module, state machine, CSP/header config, `infra/`, CI workflows.
- Keep `release-signer` under ~1,000 lines of code, minimal dependencies, no framework magic.
- Database: migrations in Git, least-privilege roles, parameterised queries only (ORM), RLS as defence in depth, no secrets in columns except KMS-wrapped or client-sealed ciphertext.
- Config via typed env schema; fail fast at startup if insecure config (e.g. missing CSP, debug flags in prod).

## API standards
- Idempotency keys on mutating endpoints. Rate limits per IP, account and vault. Generic error messages, uniform timing for auth paths, no user enumeration.
- Never include secrets in error responses. Correlation ids only.
- OpenAPI generated from schemas; contract tests.

## Frontend standards
- Static Vite SPA. No inline scripts. Self-hosted fonts and assets. No external network calls except own API.
- Accessibility: WCAG 2.2 AA, axe tests in CI, keyboard operable, plain-language copy per `docs/06-DESIGN.md`.
- UI never says "safe" or "unhackable". Follow microcopy rules in the design doc.

## Testing standards
- Tests first for `crypto-core` and the state machine. Property tests and known-answer vectors. See `docs/09-TEST-STRATEGY.md`.
- Coverage: `crypto-core` and state machine 100% line and branch; others ≥ 90%.
- Canary-secret test in e2e: strings like `CANARY-SECRET-123` must never appear in logs, API payloads, DB rows or analytics.

## Documentation standards
- Every public function in `crypto-core` has a doc comment stating inputs, outputs, security assumptions, failure modes.
- Update docs when behaviour changes. Update `docs/05-THREAT-MODEL.md` via the `threat-model-update` skill when attack surface changes.
- Commits: small, conventional commits, signed. PR template includes the security checklist.

## Dependencies
- Prefer standard library and already-approved packages. Fewer than ~40 direct runtime dependencies.
- Every new package goes through `dependency-vetting`, with name, version, source, SHA, licence, maintainers, reason logged in the ADR log.

## When uncertain
Ask. Document the uncertainty in the PR. Never guess on crypto, auth, release logic, legal wording, or infra permissions.
