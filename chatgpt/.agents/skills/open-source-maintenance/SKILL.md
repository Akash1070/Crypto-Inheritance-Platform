---
name: open-source-maintenance
description: Prepare and maintain the public repository, licenses, disclosures, contribution flow, dependency policy, and signed releases.
---
# Open Source Maintenance Skill

## Procedure
1. Read `OPEN_SOURCE_GOVERNANCE.md`, `SECURITY.md`, and `THIRD_PARTY_SKILLS.md`.
2. Verify an OSI-approved license and license compatibility for copied code/docs/skills.
3. Ensure README, install instructions, limitations, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, changelog, and protocol specs are accurate.
4. Review CI permissions, pinned actions, branch protections, CODEOWNERS, dependency update policy, SBOM, provenance, and release signing.
5. Inspect third-party Agent Skills and scripts before vendoring; pin commit SHA and record provenance.
6. Do not publish a release with open Critical/High findings or unverified security claims.

## Output
Produce a repository-readiness checklist with completed, missing, and blocked items. Never invent a security contact address or claim a license exists if the file is absent.
