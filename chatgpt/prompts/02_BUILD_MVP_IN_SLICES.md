# Prompt 02 — Build the no-secret MVP in small vertical slices

Implement Phase 1 only, following `AGENTS.md`, the PRD, TRD, threat model, approved architecture, and ADRs.

Before each slice:
- state the user outcome;
- identify data touched and trust boundaries;
- list abuse cases;
- define tests and rollback plan.

Build in this order:
1. Authentication/session foundation and server-side authorization tests.
2. Plan CRUD and wallet inventory with public metadata only.
3. Role model and secure guardian invitations.
4. Check-in state machine, idempotent scheduler, notifications, and timezone-safe display.
5. Emergency cancellation via passkey and high-entropy offline code.
6. Human-readable + JSON export and account deletion/retention flow.
7. Test/drill mode and security education pages.
8. Accessibility, responsive UX, operational dashboards with redacted metrics only.

Hard constraints:
- Never create secret input fields or API schema properties.
- Never accept a seed phrase/private key through an upload or free-text field.
- Never log request bodies from sensitive endpoints.
- Never add a wallet connection, transaction, transfer, chain signing, or smart contract.
- Never let a guardian change quorum or edit owner instructions.
- Never use a GET request to change state.
- Never rely on frontend-only authorization.

For every slice, run the relevant tests and report exact results. Add negative tests before closing the slice. Keep all unfinished recovery features behind disabled feature flags and do not make them accessible in production.

At completion, produce a table of implemented vs not implemented PRD requirements, test evidence, known risks, and recommended next slice. Do not auto-deploy.
