# ADR 0001: Non-custodial product boundary

- Status: Accepted for MVP direction
- Date: 2026-11-05

## Context

The core risk is catastrophic loss or theft if a platform receives private keys or can reconstruct them. A hosted application also depends on frontend code, hosting, operators, dependencies, and deployment pipeline.

## Decision

The hosted MVP will not collect, process, transmit, log, or store seed phrases, private keys, wallet passwords/PINs, threshold shares, or plaintext recovery packages. It will coordinate plans, contacts, check-ins, instructions, and notifications. It will not sign or transfer funds.

A future offline cryptographic recovery tool is a separate project component with its own protocol ADR, independent review, build process, and release gate.

## Consequences

- The MVP cannot directly recover a wallet secret.
- Some users may need an external/offline backup process.
- Security exposure from website compromise is materially reduced, not eliminated.
- Product copy must distinguish coordination from cryptographic recovery.
