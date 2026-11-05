# Product Management Plan

## Strategy

Build trust through verifiable constraints and operational clarity, not fear-based marketing. The wedge is a clear inheritance plan and a tested human process. Cryptographic recovery is a later capability with a higher evidence bar.

## Personas and jobs-to-be-done

- **Owner:** “I want my family to know what exists and what to do without me exposing my wallet keys today.”
- **Guardian:** “I want to help without becoming a custodian or being able to steal funds alone.”
- **Executor/heir:** “I need a reliable, understandable checklist and a safe path to the right people.”
- **Maintainer:** “I want to operate a useful service without holding the most dangerous data.”

## Roadmap and stage gates

### Phase 0 — Problem validation and architecture (no production code)

Deliverables: 15–20 user interviews across holders, heirs, estate professionals, and guardians; terminology tests; threat model; data map; crypto feasibility spike; legal/privacy questions; UX prototype; ADRs.

Exit gate: demonstrate that users understand the difference between “plan notification,” “death determination,” and “cryptographic recovery.” No unresolved fundamental trust-model contradiction.

### Phase 1 — MVP coordination product

Deliverables: owner accounts, wallet inventory with public metadata only, roles, invitations, check-ins, multi-channel reminders, grace period, emergency cancellation, export, audit log, test drill, security baseline.

Exit gate: independent web-app penetration test, no open Critical/High findings, 10+ non-developer usability tests, restore drill, incident-response tabletop, privacy/legal review.

### Phase 2 — Offline recovery protocol/tool

Deliverables: selected standard and implementation ADR, test-vector corpus, standalone offline tool, format specification, share distribution guide, offline recovery instructions, independent cryptographic review, external recovery drill.

Exit gate: reviewer signs off on design and implementation; recovery works on clean offline machines; corruption/partial-share/duplicate-share/wrong-password cases fail safely; no server secret path; all P0/P1 findings closed.

### Phase 3 — Optional chain integrations

Only after demand validation. Each chain/network module gets its own ADR, formal threat model, testnet simulation, independent contract audit, upgrade/key-management policy, and migration/rollback plan. Do not use “audited” as a blanket claim for the whole platform.

## Prioritization rubric

Score each proposed feature on: user harm reduction, recovery reliability, security risk added, complexity, privacy cost, and whether the feature can be tested. Features that collect or centralize secrets have a strong presumption against inclusion.

## North-star and guardrail metrics

North-star: **successful, owner-authorized inheritance-plan drills completed**, not assets “protected.”

Guardrails:
- zero secret material accepted by MVP APIs;
- zero secrets in logs/telemetry/support;
- 100% of active guardians explicitly accepted their role;
- 100% of live plans have an export test;
- 100% of protocol releases have an independent review record;
- zero open Critical/High findings at release;
- no feature that triggers a financial transaction.

## Pricing and business model

Do not monetize access to emergency recovery or charge a percentage of recovered assets. Early options to validate: free/open-source self-hosted core; paid hosted convenience for notifications and plan management; optional paid professional setup education that never takes custody. Legal review is needed before offering services that resemble estate administration, fiduciary services, or custody.

## Launch messaging

Use “prepare,” “document,” “coordinate,” “practice,” and “recover using your own keys.” Avoid “guaranteed inheritance,” “death detection,” “recover any wallet,” “zero trust” unless technically qualified. The often-repeated $140B figure traces to a January 2021 estimate about lost or stranded Bitcoin valued at that time; do not present it as a current all-crypto or death-specific statistic without fresh primary evidence and a clear methodology.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Owner forgets check-in | Multiple reminders, long configurable grace, cancel code, no automatic transfer |
| Malicious guardian | Threshold model, separate people, explicit early-collusion warning, replace/rotate procedure |
| Guardian loses share | Practice drills, independent physical/offline backups, share-count warning |
| Web frontend compromise | No secrets in web MVP; offline recovery tool later |
| Service shutdown | Export, documented format, offline tool, public source and signed releases |
| Misleading “death detection” claim | Use “unresponsive” language; no legal determination |
| Legal/estate complexity | Jurisdiction-specific review, user-facing limitations, no legal advice claims |
| Agent-generated insecure code | Rules, skills, tests, human review, independent audit |
