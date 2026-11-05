---
name: threat-model-update
description: Use when a change adds or alters an endpoint, data field, dependency, service, permission, infrastructure component, notification channel, or any trust boundary. Updates docs/05-THREAT-MODEL.md and checks the change against it.
---

# Threat model update

## Procedure
1. **Describe the change** in 3 lines: what is new, what data flows, which trust boundary is crossed (client ↔ API, API ↔ DB, API ↔ release-signer, release-signer ↔ KMS, CI ↔ cloud, user ↔ email/SMS).
2. **STRIDE pass** on the changed components: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege. Write at least one concrete attack per applicable letter.
3. **Map to existing scenarios** in `docs/05-THREAT-MODEL.md` (S1–S25). Note which are affected and whether mitigations still hold.
4. **Add new scenarios** with ID, severity, mitigations, residual risk. Never delete a scenario; mark it superseded with reason.
5. **Update assumptions** (§5) if the change relies on a new one (e.g. a new third-party service).
6. **Check abuse cases:** harassment through invites, enumeration, cost/DoS abuse, notification spam.
7. **List tests** that prove each mitigation (name the test file). If none exist, create tasks to add them.
8. **Output** a short diff-style summary and the exact edits to the doc. Flag any scenario whose residual risk increased and ask the human to accept or redesign.

## Rules
Be adversarial, not reassuring. If you cannot articulate how a mitigation is verified, mark it UNVERIFIED.
