---
name: secure-implementation
description: Implement a scoped feature using secure defaults, strict validation, server-side authorization, and negative tests. Use for all application coding tasks.
---
# Secure Implementation Skill

## Procedure
1. Read the PRD, TRD, threat model, ADRs, and root `AGENTS.md`.
2. Inspect existing patterns and define a small vertical slice.
3. Map untrusted inputs, authorization checks, sensitive data, and failure modes.
4. Define tests before or alongside implementation, including unauthorized and malformed requests.
5. Implement the smallest change with strict types, runtime schemas, least privilege, transaction safety, and redacted logging.
6. Run targeted tests, then the full relevant suite; report exact outcomes.
7. Review the diff for data leakage, new dependencies, unsafe defaults, and hidden side effects.

## Project restrictions
The MVP cannot handle wallet secrets, cannot connect/sign with wallets, and cannot initiate transfers. If a feature appears to require these, stop and write a design question instead of coding it.
