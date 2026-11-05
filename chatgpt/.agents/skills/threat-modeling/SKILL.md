---
name: threat-modeling
description: Create or update a threat model for the crypto inheritance project. Use before changing authentication, authorization, data storage, guardian workflows, check-in logic, recovery, or deployment.
---
# Threat Modeling Skill

## Procedure
1. Read `SECURITY_THREAT_MODEL.md`, `DESIGN.md`, and relevant ADRs.
2. Identify assets, actors, attacker capabilities, trust boundaries, entry points, and data flows.
3. Enumerate abuse cases, including insider, compromised guardian, endpoint compromise, notification failure, service shutdown, and social engineering.
4. For each case, state impact, likelihood, control, test, owner, and residual risk.
5. Mark any feature that introduces secret handling or changes a trust assumption as a stop condition.
6. Update the threat model and add a regression/security test for every accepted mitigation.

## Required output
Create `security/THREAT_MODEL_REVIEW_<date>.md` with diagrams, verified paths, open questions, and a go/no-go recommendation. Use exact file/line evidence where code exists. Do not claim death can be detected from inactivity.
