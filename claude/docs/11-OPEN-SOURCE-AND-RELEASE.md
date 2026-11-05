# 11 — Open Source and Release

## 1. Licensing (proposal; confirm with counsel)
| Component | License | Why |
|---|---|---|
| `packages/crypto-core`, `packages/protocol`, `packages/cli` | Apache-2.0 (or MIT) | Heirs and third parties must be able to build recovery tools freely, forever |
| `apps/api`, `apps/worker`, `apps/release-signer`, `apps/web` | AGPL-3.0 | Prevents closed hosted forks that strip transparency; self-hosting still free |
| Docs | CC BY 4.0 | |
| Trademark | Reserved; policy for forks | Stops look-alike scam clones using our brand |

## 2. Repository hygiene before going public
- [ ] Secret scan of full Git history (gitleaks, trufflehog). Rotate anything that ever appeared, even in tests.
- [ ] Remove internal URLs, emails, keys, infra identifiers; use `.env.example` only.
- [ ] `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` (DCO sign-off), `GOVERNANCE.md`, issue templates, PR template with security checklist.
- [ ] Branch protection: signed commits, 2 reviews for `crypto-core`, `release-signer`, auth, infra, CI; CODEOWNERS enforced.
- [ ] GitHub: 2FA required, no long-lived tokens, Actions pinned by SHA, restricted `GITHUB_TOKEN`, Dependabot/Renovate with human review, secret scanning + push protection.
- [ ] Enable private vulnerability reporting.
- [ ] Publish threat model and audit reports (transparency is the product).

## 3. Reproducible builds and signing
- Deterministic builds in containers (pinned base images by digest, pinned toolchains, `SOURCE_DATE_EPOCH`).
- Release artifacts: web bundle (with hash manifest), CLI binaries, container images, SBOM.
- Sign with Sigstore (cosign keyless via GitHub OIDC); publish SLSA provenance; log to transparency log.
- `heirkey verify` (CLI) downloads bundle manifest and compares with what the site serves.
- Independent rebuild by at least one outside party before public launch.

## 4. Release process
1. Release branch, changelog, security notes.
2. CI full pipeline + nightly suites green.
3. For changes in protected areas: external review sign-off.
4. Tag (signed), build, sign, publish hashes, deploy to staging, smoke + red-team regression, promote.
5. Post-release monitoring; rollback plan rehearsed.
6. Never silently change crypto or release behaviour: format/version bump + migration plan + announcement.

## 5. Community and security culture
- Maintainers list with security contacts; PGP/age key for reports.
- Responsible disclosure: acknowledge in 72 h, triage in 7 days, fix critical in 14 days target, credit researchers.
- Public postmortems for incidents (doc 12).
- Encourage independent implementations of the recovery tool (spec in docs).

## 6. Self-hosting
Docker Compose + Helm chart; hardened defaults; config validator `heirkey doctor`; guide for running `release-signer` with local KMS (OpenBao/Vault transit or hardware key); warning that self-hosters carry the operational security burden.

## 7. Funding the audit via open source
Publish a funding page; apply to security/open-source grant programs (verify current ones); offer audit-sponsorship credits. Do not accept funding that comes with control over the crypto design.
