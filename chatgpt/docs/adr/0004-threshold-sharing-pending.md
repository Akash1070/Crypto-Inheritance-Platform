# ADR 0004: Threshold-sharing scheme selection is pending

- Status: Proposed / Research required
- Date: 2026-11-05

## Context

The product may eventually split a random DEK among independent guardians. Implementing Shamir Secret Sharing from scratch is unacceptable. SLIP-0039 is a published candidate standard, but its exact secret-size, group-threshold, passphrase, UX, and library interoperability characteristics must be evaluated for this use case.

## Decision

Do not implement threshold sharing until an ADR names the exact specification, version, implementation, license, supported parameters, test-vector corpus, and independent reviewer. Evaluate SLIP-0039 first, but do not assume it is automatically appropriate for arbitrary DEKs or interoperable with all wallets.

## Consequences

- Phase 2 is blocked until the decision is approved.
- No ad hoc GF arithmetic or homegrown share encoding is allowed.
- The hosted MVP proceeds without secret handling.
