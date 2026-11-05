# 14 — Architecture Decision Records (ADR) Log

Append-only. The agent adds an entry for every non-trivial decision, dependency, or deviation. Format: ID, date, status (Proposed/Accepted/Superseded), context, decision, consequences, reviewers.

---
## ADR-001 — Information vault first; no custody, no custom contracts in v1
Date: 2026-11-05 · Status: Proposed (awaiting G0 sign-off)
Context: Smallest attack surface; contracts need costly audits; existing on-chain modules exist.
Decision: v1 stores only client-encrypted packs; on-chain inheritance deferred to integrations in Phase 2.
Consequences: Works for any chain/wallet; relies on release protocol security.

## ADR-002 — Sealing primitive: libsodium sealed box vs HPKE
Status: Open. Decide before M1 starts. Default if no decision: libsodium `crypto_box_seal`.

## ADR-003 — 2-of-2 heir release (H + escrow S), Fortress 3-of-3 later
Date: 2026-11-05 · Status: Proposed
Context: No single party may release; liveness needed.
Decision: Per doc 04. Escrow share encrypted to release-signer key; heir share sealed to heir key.
Consequences: Heirkey outage blocks release unless continuity path used (doc 04 §6.5).

## ADR-004 — Pure time-lock encryption rejected as primary release mechanism
Status: Proposed
Context: Time-lock ciphertexts are irrevocable; old copies open early.
Decision: Not primary. Optional later as a timing floor only.

## ADR-005 — Check-in requires passkey; emails never prove liveness
Status: Proposed
Context: Family often has access to deceased's inbox.

## ADR-006 — Static Vite SPA instead of SSR framework for the web client
Status: Proposed
Context: Easier to hash, pin, and verify bundle; avoids server-rendered complexity.

## ADR-007 — AGPL for services, Apache-2.0 for crypto-core/protocol/CLI
Status: Proposed (needs counsel)

<!-- Agent: append new ADRs below this line. Include dependency additions: name, version, source URL, commit SHA, licence, vetting date, reason. -->
