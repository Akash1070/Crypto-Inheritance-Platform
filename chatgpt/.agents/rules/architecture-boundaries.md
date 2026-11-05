---
trigger: always_on
description: Architecture boundaries, data minimization, and server-side authorization rules.
---
# Architecture boundaries

- Keep the hosted coordination service separate from future offline cryptographic recovery.
- Enforce every authorization decision server-side; IDs and hidden UI elements are not access controls.
- Use strict runtime schemas and allow-listed fields at all trust boundaries.
- Use transactions/idempotency for invitations, guardian changes, check-ins, cancel codes, and state transitions.
- No third-party analytics, session replay, ad scripts, or arbitrary external scripts on sensitive routes.
- Treat public wallet addresses and guardian relationships as sensitive metadata.
- Do not add smart contracts, wallet connection, chain signing, or automated transfers to MVP.
