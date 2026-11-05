# Repository-wide instructions for coding agents

You are working on a system whose failure can permanently expose or destroy other people's financial assets. Optimize for safety, correctness, reversibility, and explicit assumptions—not speed, feature count, or visual polish.

## Before changing code

1. Read `README.md`, `DESIGN.md`, `PRD.md`, `TRD.md`, `SECURITY_THREAT_MODEL.md`, `CRYPTOGRAPHIC_DESIGN.md`, and the relevant ADRs.
2. Inspect the existing repository, package manifests, deployment configuration, authentication, database rules, CI, and dependencies. Preserve working conventions unless they violate a documented invariant.
3. Produce a short implementation plan and list unresolved decisions. Do not invent a cryptographic protocol or silently choose a custody model.
4. Separate what is implemented, tested, stubbed, simulated, and merely documented. Never present a mock recovery flow as working recovery.

## Absolute security constraints

- NEVER add a form, API field, database column, log, analytics event, telemetry payload, crash report, URL parameter, or support workflow that accepts a seed phrase, private key, wallet password, hardware-wallet PIN, raw signing key, or usable threshold share in the web MVP.
- NEVER ask a user to connect a wallet and sign a transaction for inheritance setup. Address ownership verification, if ever added, must use a clearly scoped human-readable message signature and must never request transaction approval.
- NEVER implement custom cryptographic primitives, custom elliptic-curve code, custom random-number generation, homemade Shamir arithmetic, or bespoke key derivation.
- NEVER let the backend decrypt a recovery bundle or reconstruct a recovery key.
- NEVER add auto-transfer, auto-sweep, relayer signing, admin override, or hidden recovery master key.
- NEVER call a missed check-in “proof of death.”
- NEVER place secret values in tests, screenshots, fixtures, issue reports, logs, or generated docs. Use synthetic test vectors only.
- NEVER claim that passing AI review, unit tests, scanners, or this project pack means the product is secure.

## Required engineering behavior

- Treat `SECURITY_THREAT_MODEL.md` and `CRYPTOGRAPHIC_DESIGN.md` as binding architecture constraints.
- Prefer a smaller feature that can be tested over a broad feature that cannot be verified.
- Use explicit types and runtime validation at every trust boundary.
- Enforce authorization server-side on every object and state transition. UI hiding is not authorization.
- Use secure defaults; require explicit opt-in for high-risk features.
- Keep secrets out of browser storage, server logs, analytics, replay tools, error trackers, and third-party scripts.
- Do not add trackers, session replay, advertising pixels, or third-party JavaScript to sensitive routes.
- Keep dependencies minimal, pinned through the lockfile, actively maintained, and reviewed. Record why security-critical dependencies were selected.
- Add negative tests, abuse-case tests, and regression tests for every security-sensitive change.
- Use database constraints and transactions for one-time actions, quorum changes, and state transitions.
- Make high-risk operations observable through redacted audit events without recording secret values.
- Use feature flags to keep unfinished recovery functionality inaccessible in production.

## Mandatory stop conditions

Stop implementation and write a decision memo instead of guessing when:

- the requested feature requires secret material to enter the hosted app;
- the cryptographic library or protocol is unreviewed, unmaintained, or lacks test vectors;
- it is unclear whether an event is a social approval or a cryptographically enforced restriction;
- a proposed admin/support override could decrypt, release, or transfer funds;
- the recovery process cannot be tested end-to-end without risking real assets;
- a migration could invalidate existing recovery material;
- any P0 or P1 security finding remains open.

## Definition of done

Every change must include: implementation summary, files changed, tests run and exact outcomes, security impact, remaining risks, and rollback notes. For security-sensitive changes, include a threat-model delta and proof of negative cases. Be candid about tests not run.
