# ADR 0002: Inactivity is not proof of death

- Status: Accepted
- Date: 2026-11-05

## Context

No online service can reliably distinguish death from travel, illness, loss of connectivity, account lockout, coercion, or intentional inactivity.

## Decision

The product records only check-in status and guardian contact attestations. It never asserts “death confirmed,” provides legal proof of death, or initiates an asset transfer. The state machine includes multiple reminders, a long grace period, owner cancellation, and explicit guardian review.

The coordination flow is not a cryptographic time lock. A guardian who already holds enough shares and obtains the encrypted package may recover early.

## Consequences

- UX and marketing must be precise.
- Guardian-share holders are a trust assumption.
- Strict post-mortem-only access requires a separate protocol/chain-specific research project.
