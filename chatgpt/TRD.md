# Technical Requirements Document (TRD)

**Status:** Architecture proposal. The coding agent must inspect the actual repository before selecting or changing frameworks.

## 1. Architecture principles

- Separate the hosted coordination application from all cryptographic recovery operations.
- Treat the browser, API, database, notification vendor, hosting provider, CI system, dependencies, and maintainers as distinct trust boundaries.
- Do not add a blockchain dependency to solve a problem that is primarily about documentation and human coordination.
- No smart contracts in MVP.
- Prefer simple, well-supported components over novel architecture.

## 2. Logical components

1. **Web client:** owner/guardian/executor interface; validates and displays non-secret plan data; no secret input fields.
2. **Application API:** authentication, authorization, plan CRUD, invitation flow, state machine, notification orchestration, export generation.
3. **Relational database:** plans, roles, non-secret wallet metadata, check-in events, invitations, notification status, audit events.
4. **Notification adapter:** email first; optional SMS/push only after threat/privacy review. Messages contain no wallet addresses, private notes, secrets, or sensitive claim details.
5. **Background scheduler:** idempotent due-date processing with database-backed locks/transactions and retry-safe jobs.
6. **Offline recovery utility (future):** separate package/release pipeline; no production API dependency; handles encryption/decryption and threshold-share operations only after a cryptographic ADR and independent review.

## 3. Recommended implementation baseline

These are candidates, not a command to replace an existing stack:

- TypeScript with strict mode for web/API code.
- A maintained web framework already familiar to the repository (if starting fresh, compare Next.js with a smaller React + API architecture).
- PostgreSQL for relational integrity and transactional state transitions.
- Runtime request validation (e.g., Zod or equivalent) at API boundaries.
- Passkeys/WebAuthn for owner and guardian authentication where support is reliable; secure recovery/fallback must not collapse to email-only access.
- SameSite, Secure, HttpOnly session cookies; CSRF protection; short session lifetime for high-risk actions; re-authentication for guardian changes and cancellation.
- Vitest/Jest or equivalent for unit/integration tests, Playwright for browser E2E, and property-based testing for state-machine invariants.
- CI: lint, typecheck, unit tests, integration tests, secret scan, SAST, dependency scan, build, and artifact provenance.

Do not select a hosted database/auth vendor solely because it makes the prototype quick. If Supabase or another BaaS is used, verify row-level security policies, server key exposure, backup/restore, auditability, region/data transfer, and tenant isolation. Never ship a service-role secret to the browser.

## 4. Backend security requirements

- Every query and mutation is scoped by authenticated principal and plan membership.
- Authorization is checked on the server for every object, not inferred from client routes or IDs.
- Use database transactions for quorum updates, guardian replacement, plan state changes, cancel-code use, and one-time invitations.
- Enforce unique constraints and one-time token consumption in the database.
- Use high-entropy opaque tokens for invitations and cancellation recovery; store only suitable verifiers; expire and revoke them.
- Rate-limit authentication, invitations, cancellation attempts, check-in endpoints, and guardian attestations.
- Prevent IDOR, CSRF, SSRF, mass assignment, injection, insecure direct file access, open redirects, and replay.
- Use strict request schemas with allow-listed fields; reject unknown fields for sensitive endpoints.
- Use prepared statements/ORM safe parameterization.
- Add security headers including a restrictive Content-Security-Policy; avoid inline scripts where practical.
- Do not include third-party analytics, session replay, ad scripts, or externally hosted fonts/scripts on sensitive pages.
- Redact data in logs. Define retention and access controls for logs and backups.

## 5. Client security requirements

- No secret material in MVP forms, React state, localStorage, sessionStorage, IndexedDB, service-worker caches, URL parameters, browser history, clipboard, crash reporting, or analytics.
- Do not persist sensitive plan drafts in browser storage without an explicit reviewed design.
- Render user text safely; no raw HTML injection.
- Avoid third-party script tags and dynamic script loaders.
- Sensitive actions require clear confirmation and recent authentication.
- Prevent phishing-like design: display the canonical app origin in security-sensitive help and never ask users to paste a seed phrase.
- If public addresses are displayed, treat them as privacy-sensitive metadata and default to private visibility.

## 6. Identity and authorization

- Prefer WebAuthn/passkeys for phishing-resistant authentication; verify challenge, origin, RP ID, user presence/verification policy, and credential ownership server-side.
- Email is a notification channel, not sufficient authority for high-risk changes.
- Guardian acceptance must be explicit and bound to the intended plan.
- Guardian replacement, threshold changes, and recovery-plan changes require owner re-authentication, a cooling-off period, and notifications to existing guardians.
- Operators have no impersonation or “break glass” path to wallet secrets. Support may assist with account metadata only through auditable, least-privilege procedures.

## 7. Inactivity state machine

Use a server-authoritative, versioned state machine. Suggested states:

`DRAFT -> ACTIVE -> REMINDER_WINDOW -> OVERDUE -> GRACE_PERIOD -> GUARDIAN_REVIEW -> INACTIVITY_NOTICE -> CLOSED/CANCELLED`

Rules:

- All state changes are authenticated or performed by an idempotent scheduler job with a recorded reason.
- A heartbeat must be bound to the owner account and protected against replay.
- Reminder jobs are idempotent; retries must not advance time.
- Time arithmetic uses UTC timestamps; UI renders owner-local time and timezone explicitly.
- Owner can cancel/refresh before the disclosed cutoff using passkey or emergency code.
- Guardian review records contact attempts; it does not set a legal death status.
- No state can initiate a transaction, sign a message, decrypt a package, or transfer crypto.
- State changes must be auditable and reversible where specified.

Default product proposal: monthly or quarterly check-in selected by owner; reminder notices begin before the due date; post-due grace is long (90 days as a suggested default), with a warning before selecting a shorter period. The exact cadence must be user-tested and recorded in an ADR. Do not ship a short “7-day death switch.”

## 8. Data storage and backups

- Store only information needed to coordinate a plan.
- Encrypt data at rest and in backups using managed platform controls, but do not misrepresent server-side encryption as end-to-end encryption.
- Separate application data, audit records, and operational logs where feasible.
- Restrict production DB access; require MFA and just-in-time access; log privileged access.
- Test backup restore quarterly. A backup that restores data but loses notification state or breaks a plan is not a successful restore.
- Publish data export, account deletion, retention, and service shutdown procedures.

## 9. API requirements

- Version API contracts.
- Use strict schemas and reject secret-like fields.
- Require idempotency keys for state-changing operations that may be retried.
- Use request IDs and structured redacted logs.
- Return generic authentication errors to avoid account enumeration.
- Avoid leaking guardian lists, wallet addresses, or private instructions in error messages.
- Do not expose internal stack traces or database errors.

## 10. Future offline recovery tool — separate security boundary

The future tool must:

- Be separately versioned, separately packaged, and built from a pinned source commit.
- Work fully offline for encrypt, split, reconstruct, and decrypt operations.
- Have no telemetry/network calls in secret-handling code paths.
- Use a standard AEAD and a reviewed threshold-sharing implementation; never custom cryptography.
- Use a versioned envelope with explicit algorithm identifiers, nonce, salt where applicable, threshold parameters, ciphertext, and authenticated metadata.
- Fail closed on unsupported versions, invalid checksums, wrong threshold, duplicate shares, malformed shares, or authentication failure.
- Include test vectors and cross-implementation interoperability tests.
- Avoid claiming secure memory erasure unless the runtime and implementation can actually guarantee it. Document best-effort limitations.
- Produce an independently verifiable build artifact and release signature.

## 11. Observability and privacy

Allowed logs: account/plan ID pseudonym, actor role, event type, timestamp, state version, success/failure code, request ID. Avoid raw wallet addresses, full names, private instructions, invitation tokens, cancel codes, and all secret material. Define data retention and deletion windows before launch.

## 12. Infrastructure hardening

- Separate dev/staging/prod; never reuse production data in lower environments.
- Use managed secrets storage; no secrets in Git, CI output, frontend bundles, Docker layers, or `.env.example` values that look real.
- Pin actions and dependencies; use least-privilege CI tokens.
- Protect main branch, require code review, require passing checks, and use signed tags/releases.
- Generate SBOMs and build provenance; sign release artifacts.
- Use OpenSSF Scorecard and SLSA guidance as maturity targets, not proof of safety.
