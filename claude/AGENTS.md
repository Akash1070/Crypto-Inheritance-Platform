# AGENTS.md — Heirkey

You are building **Heirkey**, an open-source zero-knowledge crypto inheritance platform. A mistake here can cost real people their life savings or leak their secrets. Security beats speed, features and cleverness. If a task conflicts with a rule below, STOP and ask the human.

## Read before coding (in order)
1. `docs/04-SECURITY-ARCHITECTURE.md` — the protocol. Source of truth for crypto.
2. `docs/05-THREAT-MODEL.md` — what we defend against.
3. `docs/03-TRD.md` — stack, layout, data model.
4. `docs/02-PRD.md` and `docs/06-DESIGN.md` — what and how it looks.
5. `docs/07-PROJECT-PLAN.md` — current milestone and gate. Only work on the current milestone.
6. `.agents/rules/*` — standing rules.

## Non-negotiables (full text in `.agents/rules/01-security-invariants.md`)
- Server never sees plaintext, vault keys, seed phrases, passphrases or private keys. Ever. Not in logs, errors, analytics, crash reports, backups.
- Never write your own cryptographic primitive, mode, KDF, secret-sharing scheme, RNG or comparison. Use only libraries approved in `docs/13-RECOMMENDED-REPOS-AND-SKILLS.md`.
- All crypto lives in `packages/crypto-core`. No crypto calls anywhere else.
- No new dependency without running the `dependency-vetting` skill and logging it in `docs/14-ADR-LOG.md`.
- No secrets in code, tests, fixtures, screenshots or commit history. Test vectors use obviously fake values.
- No mainnet funds, no real seed phrases, ever, in dev or test.
- Do not weaken, skip or delete a test, lint rule, CSP header, rate limit or security check to make something pass.
- Any change touching `packages/crypto-core`, the release/trigger state machine, auth, or CSP requires the `crypto-change-review` skill and a human-review note in the PR description.

## How to work
- One milestone, one branch, small commits. Plan first, then code, then tests, then run `/security-review`.
- TypeScript strict mode. No `any`, no `@ts-ignore` without a written reason.
- Write tests first for crypto and state-machine code (known-answer vectors, property tests).
- When unsure about anything security-relevant, say so and ask. Never guess and never paper over uncertainty.
- When you finish: list what changed, what is untested, what you are unsure about, and which threats in `docs/05-THREAT-MODEL.md` are affected.
- Append every non-trivial decision to `docs/14-ADR-LOG.md`.

## Never
- Add telemetry, third-party scripts, fonts from CDNs, tracking pixels or session replay to the web app.
- Log request bodies. Log only redacted metadata.
- Store anything "temporarily" in plaintext on the server.
- Treat a death certificate, email click, SMS code or support ticket as sufficient proof for release.
- Build a "support can recover your vault" feature. Nobody can. That is the point.
