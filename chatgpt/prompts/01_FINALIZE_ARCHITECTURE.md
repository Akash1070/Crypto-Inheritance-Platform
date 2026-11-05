# Prompt 01 — Finalize the architecture (NO SECRET HANDLING)

Using the repository audit and project docs, act as a principal architect and application security engineer.

Goal: finalize the architecture for Phase 1 only — the no-secret inheritance coordination MVP.

Deliver:
1. `docs/ARCHITECTURE.md` with component responsibilities, trust boundaries, deployment view, and Mermaid diagrams.
2. ADRs for every material choice: framework changes, auth method, database/RLS strategy, notification provider, audit log, cancellation mechanism, state-machine timing, and export format.
3. `docs/SECURITY_DECISIONS.md` listing each security invariant and the component/test that enforces it.
4. Updated `docs/DATA_MODEL_AND_API.md` with precise schemas and API request/response contracts.
5. A vertical-slice implementation plan with dependencies and test requirements.

Constraints:
- No seed/private-key/share fields; no wallet connection; no smart contracts; no transaction signing or transfers.
- Do not add frontend analytics, session replay, advertising scripts, or external script dependencies.
- Do not expose service-role credentials or database admin keys to the client.
- If using a BaaS, prove tenant isolation and review all row-level security policies before implementing routes.
- The check-in system must never claim to prove death or cryptographically block an already-informed guardian.
- Require owner re-authentication, delay, notification, and cancellation for guardian/quorum changes.

Do not begin implementation until you have listed security assumptions and the owner has a clear reviewable architecture proposal. Do not silently decide unresolved protocol questions.
