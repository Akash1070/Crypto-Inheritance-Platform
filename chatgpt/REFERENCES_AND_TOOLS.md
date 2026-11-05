# Standards, GitHub Repositories, Agent Skills, and Security Tools

This list is a starting point, not an endorsement that every package is safe for this product. Verify current maintenance, release history, license, open vulnerabilities, and exact implementation before adopting anything. Pin versions/commits and record the review.

## Standards and primary references

- [BIP-39 — Mnemonic code for generating deterministic keys](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki): wallet mnemonic format. Do not use it as a generic password KDF.
- [Bitcoin BIPs repository](https://github.com/bitcoin/bips): canonical Bitcoin improvement proposals, including wallet descriptor-related standards.
- [SLIP-0039 — Shamir's Secret-Sharing for Mnemonic Codes](https://github.com/satoshilabs/slips/blob/master/slip-0039.md): candidate threshold-sharing standard; evaluate exact scope and implementation before use.
- [RFC 9180 — Hybrid Public Key Encryption](https://www.rfc-editor.org/rfc/rfc9180.html): standard HPKE construction; application still needs identity binding and replay handling.
- [OWASP ASVS](https://github.com/OWASP/ASVS): use stable ASVS 5.0.0 as the web-app verification baseline; the repository's main branch may contain in-progress changes.
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html): threat-model-first data protection and key-management guidance.
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html): key lifecycle, storage, rotation, and operational practices.
- [W3C WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/): phishing-resistant public-key authentication; WebAuthn authentication is not itself a recovery-secret encryption design.
- [SLSA specification](https://slsa.dev/spec/): build provenance and supply-chain security.

## GitHub repositories to consider

### Security review skills (Markdown / Agent Skills)

- [Trail of Bits — skills](https://github.com/trailofbits/skills): a collection of security-focused agent skills. Start by inspecting `differential-review`, `open-sourcing`, and `building-secure-contracts` only if a future smart-contract module is actually in scope. Do not install the entire collection blindly.
- [Semgrep — skills](https://github.com/semgrep/skills): agent skills related to Semgrep and secure code analysis. Review each skill's instructions and scripts before use.
- [OpenSSF Scorecard](https://github.com/ossf/scorecard): automated checks for repository security practices; use to identify gaps, not as a safety certificate.

### Static analysis, secret scanning, dependency and artifact security

- [Semgrep](https://github.com/semgrep/semgrep): static analysis and custom rules. Community scans can miss cross-file/data-flow issues; combine with human review.
- [Gitleaks](https://github.com/gitleaks/gitleaks): secret scanning for Git repositories and CI.
- [TruffleHog](https://github.com/trufflesecurity/trufflehog): secret discovery and verification; configure carefully to avoid sending sensitive content to external services.
- [OSV-Scanner](https://github.com/google/osv-scanner): dependency vulnerability scanning using OSV data.
- [Syft](https://github.com/anchore/syft): generate SBOMs.
- [Grype](https://github.com/anchore/grype): vulnerability scanning for images/filesystems/SBOMs.
- [CodeQL](https://github.com/github/codeql): semantic code analysis; review supported language and CI setup.
- [Cosign](https://github.com/sigstore/cosign): sign and verify build artifacts.
- [SLSA framework](https://github.com/slsa-framework/slsa): build provenance and supply-chain security specification.

### Crypto and wallet references

- [libsodium](https://github.com/jedisct1/libsodium) and [libsodium.js](https://github.com/jedisct1/libsodium.js): cryptographic libraries; verify browser/runtime maintenance and API suitability before selecting.
- [Trezor SLIPS](https://github.com/satoshilabs/slips): canonical SLIP documents.
- [Trezor python-mnemonic](https://github.com/trezor/python-mnemonic): BIP-39 reference implementation/test vectors; not a reason to put mnemonic processing in the web app.

### Optional EVM / smart-contract phase only

Do not add these to the MVP merely because it is a crypto project:
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/openzeppelin-contracts): standard contract components; correct integration and configuration still need review.
- [Foundry](https://github.com/foundry-rs/foundry): Solidity development and testing toolkit.
- [Slither](https://github.com/crytic/slither): Solidity static analysis.
- [Echidna](https://github.com/crytic/echidna): smart-contract property-based fuzzing.

## Suggested agent skills to add locally

This pack already includes focused first-party skills under `.agents/skills/`:
- `threat-modeling`
- `crypto-design-review`
- `secure-implementation`
- `security-audit`
- `release-readiness`
- `open-source-maintenance`

Recommended external skills to inspect and selectively vendor:
1. Trail of Bits `differential-review` — PR/commit security review. Its risk-first, evidence-based approach is a good fit.
2. Trail of Bits `open-sourcing` — repository launch, license, SECURITY.md, docs, and contribution hygiene.
3. Trail of Bits `building-secure-contracts` / `secure-workflow-guide` — only for a later on-chain module.
4. Semgrep skills — useful to write/check project-specific static-analysis rules.

## Rules for adding any third-party skill

1. Read the complete `SKILL.md` and all scripts/resources it references.
2. Inspect every shell command, network call, file write, and requested permission.
3. Check license and attribution.
4. Pin the source commit SHA and record upstream URL + date in `THIRD_PARTY_SKILLS.md`.
5. Remove irrelevant instructions and scope the skill to this project.
6. Do not permit a skill to request real secrets or production access.
7. Re-review on every upstream update.

## Current Antigravity customization format

As of this pack's research date (5 November 2026), Antigravity documents workspace skills under `.agents/skills/<skill-folder>/SKILL.md` and rules under `.agents/rules/*.md` or root `AGENTS.md`. Agent Skills are the preferred reusable workflow format; legacy Antigravity workflows were scheduled to stop working on 19 October 2026. Verify official docs again when upgrading the IDE because paths and behavior can change.
