# Open-Source Governance and Repository Security

## 1. Open-source promise

The core protocol, data formats, offline recovery utility, test vectors, and user recovery instructions should be openly inspectable. “Open source” must mean an OSI-approved license is present; a public repository without a license is not open source.

## 2. License strategy

Choose a license only after legal review. A permissive license such as Apache-2.0 may encourage broad adoption but can permit proprietary forks. A copyleft license may preserve reciprocity but can complicate integration. Keep protocol/spec documentation licensing explicit and compatible with copied standards. Do not copy third-party skill files or code without reviewing their license and attribution terms.

## 3. Required repository files before public launch

- `LICENSE`
- `README.md` with install, usage, architecture, and limitations
- `SECURITY.md` with private vulnerability reporting instructions
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `CHANGELOG.md`
- versioned protocol specification and test vectors
- threat model and audit reports (publish redacted versions where needed)
- dependency and SBOM policy
- release verification instructions

## 4. Branch and release policy

- Protect the default branch; require reviewed pull requests and passing CI.
- Require at least one human reviewer for normal changes and two for security-critical changes where practical.
- Pin GitHub Actions to immutable commit SHAs.
- Use least-privilege tokens and isolated release permissions.
- Use signed tags and release artifacts.
- Generate SBOM and provenance for releases; follow SLSA build-provenance guidance as maturity grows.
- Do not let the same unreviewed agent create code, approve its PR, and publish the release.
- Maintain a dependency update cadence and a vulnerability response SLA.

## 5. AI coding agent policy

- Agent-generated patches are untrusted until reviewed.
- Agents must not have production secrets or production database access.
- Do not ask an agent to inspect actual wallet secrets.
- Do not automatically merge or deploy security-sensitive agent changes.
- Review all new dependencies and scripts before execution.
- Treat community `SKILL.md` files as executable policy input: inspect their instructions, scripts, external calls, permissions, and license before adopting them.
- Pin external skill sources to a commit SHA, keep a local copy with provenance, and re-review updates.

## 6. Vulnerability disclosure

Publish a `SECURITY.md` with a private reporting channel, supported versions, response expectations, safe-harbor language reviewed by counsel, and a policy not to publish exploit details before a fix is available. Do not invite people to disclose secrets or user identity data in public issues.

## 7. Maintainer operational controls

- MFA/passkeys for maintainers.
- At least two independent release maintainers.
- Hardware-backed protection for release signing keys where possible.
- Audit and review privileged actions.
- Dependency ownership and CODEOWNERS for crypto, auth, data migrations, and CI.
- Reproducible-build work for the offline recovery binary.
