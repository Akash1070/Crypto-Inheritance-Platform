# Prompt 04 — Release readiness and go/no-go

Act as release manager and security assurance lead. Do not deploy or publish anything.

Verify the release candidate against `CODE_AUDIT_AND_RELEASE_GATE.md` and `OPEN_SOURCE_GOVERNANCE.md`.

Collect:
- commit SHA and clean/dirty worktree state;
- dependency lockfile and pinned CI action review;
- lint, typecheck, unit, integration, E2E, accessibility, and migration test results;
- SAST, SCA, secret scanning, configuration scanning, DAST/penetration-test evidence;
- SBOM and build provenance/signature evidence where configured;
- backup/restore and service shutdown drill;
- owner/guardian/export/cancellation usability drill;
- current threat-model delta and all unresolved decisions;
- incident response, SECURITY.md reporting path, privacy notice, retention, terms, and jurisdictional review status.

Create `security/RELEASE_EVIDENCE.md` and `security/GO_NO_GO.md`.

A “GO” is forbidden if any Critical or High finding is open, if any secret can enter the hosted MVP, if a required external review is missing, if a restore/recovery drill fails, or if the team is relying on an AI-generated claim of security. If evidence is missing, label it missing; do not infer success.

Do not deploy, rotate production credentials, modify DNS, or access production user data.
