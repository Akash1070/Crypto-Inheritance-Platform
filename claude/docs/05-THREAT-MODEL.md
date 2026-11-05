# 05 — Threat Model

Method: STRIDE + attacker-goal trees. Living document: the `threat-model-update` skill must be run on every change to auth, crypto, state machine, infra or dependencies.

## 1. Assets (what attackers want)
A1 Pack contents (seeds, instructions). A2 Ability to trigger early release. A3 Ability to block legitimate release (DoS/griefing). A4 Owner identity/relationship graph (who has crypto, who inherits). A5 Escrow shares and KMS keys. A6 Signing keys (audit log, releases). A7 Source code and build pipeline. A8 Reputation/brand.

## 2. Attackers
| Id | Attacker | Capability |
|---|---|---|
| T1 | Remote external hacker | Internet, automation, 0-day in web stack |
| T2 | Phisher / scammer | Look-alike sites, social engineering of owners/heirs |
| T3 | Malicious/curious insider (employee, contractor) | Prod access, source access |
| T4 | Compromised dependency / maintainer | Supply chain |
| T5 | Malicious heir | Holds their own share, wants early access |
| T6 | Family member with owner's devices/email | Physical access to a living or dead owner's devices |
| T7 | Coercer ($5 wrench) | Forces owner to reveal/check-in |
| T8 | State actor / legal compulsion | Subpoena, seizure, network control |
| T9 | Competitor / griefer | DoS, reputation attacks |
| T10 | AI-generated-code mistakes (ours) | Subtle crypto/logic bugs from agent-written code |

## 3. Key scenarios and mitigations
Severity: C critical, H high, M medium. Residual risk after mitigation noted.

| # | Scenario | Sev | Mitigations | Residual |
|---|---|---|---|---|
| S1 | Full DB + object store breach | C | Only ciphertext stored; escrow share encrypted to release-signer key in KMS; heir shares sealed to heir keys; no keys in DB | Metadata exposure (emails, who has vaults): minimise, encrypt emails at rest, blind index |
| S2 | Malicious JS served to owners (server/CDN/supply-chain compromise) | C | Static hashed bundle, strict CSP, Trusted Types, SRI, reproducible builds + transparency log, `verify` CLI, dependency pinning, install scripts off, signed releases, CLI path for high value | Medium: users rarely verify; Phase 2 pinned PWA/desktop app |
| S3 | Compromised API only | H | API cannot decrypt escrow; release-signer independently verifies chain; separate DB roles | Can DoS/delay; cannot release |
| S4 | Compromised release-signer + heir device | C | Needs both; heir passkey required; challenge window; alerts on any escrow decrypt; HSM/KMS key policy; Fortress guardian share | Low-Med; this is the top residual risk, hence extra audit and Fortress mode |
| S5 | Heir phished (email takeover) | H | Heir identity is a passkey, not email; step-up; anomaly delay; owner notified; challenge window | Low |
| S6 | Heir colluding with insider | H | Insider cannot access `H`; release-signer isolation; 2-person approval for prod access; immutable logs; Fortress | Low-Med |
| S7 | Owner email takeover then fake "I'm alive"/cancel | M | Check-in/cancel need passkey; email never proof; recovery delayed and notified | Low |
| S8 | **Family reads dead owner's inbox and clicks check-in links** (false liveness, vault never opens) | H | Passkey required for check-in; links only open app; reminder emails say so; trusted contacts get parallel notice | Low |
| S9 | Premature release (owner hospitalised/travelling) | H | Long defaults, grace, multi-channel escalation, challenge window, pause mode, trusted contact "owner is OK" signal (pause only, cannot release) | Low-Med by design |
| S10 | Fraudulent death claim with forged certificate | H | Documents never sufficient alone; claim needs heir passkey AND inactivity AND challenge window | Low |
| S11 | Coercion of owner | H | Optional duress passkey/PIN that shows decoy pack and silently alerts trusted contact; documented limits | Medium (cannot fully solve) |
| S12 | Platform shutdown/outage when heirs need it | H | Heir Kit, CLI, open source, continuity escrow (04 §6.5), self-host | Low-Med |
| S13 | Lost passkeys (owner) | H | ≥2 passkeys, Emergency Kit, device list, delayed recovery; no vendor backdoor | Medium: some users will lose data; communicate clearly |
| S14 | Agent-written crypto bug | C | Crypto isolated in one package; vetted libs only; KAT/property/fuzz tests; mandatory human + external review; no hand-rolled primitives | Medium until audited |
| S15 | Malicious dependency / typosquat / compromised maintainer | C | Lockfile, pinned versions, SHA-pinned actions, `ignore-scripts`, vetting skill, SBOM, OSV/Socket scanning, minimal deps, vendoring for crypto-critical code | Medium |
| S16 | Account/session hijack (XSS, CSRF) | H | CSP, Trusted Types, SameSite=Strict, `__Host-` cookies, step-up, output encoding, no `dangerouslySetInnerHTML` | Low |
| S17 | Rate-limit/enumeration/credential attacks | M | Passkeys (no passwords), generic errors, uniform timing, per-IP/account limits | Low |
| S18 | Insider with prod access | H | No standing access, break-glass with 2 approvers, immutable audit, release-signer isolation, background checks for staff | Low-Med |
| S19 | Legal compulsion | M | We hold nothing readable; transparency report; warrant canary (legal advice needed) | Low |
| S20 | Time/clock manipulation to shorten challenge | H | Multiple NTP sources, signed events, monotonic checks, release-signer own clock, alert on skew | Low |
| S21 | Replay of old shares/events | M | Version + vault id + nonce bound in AD; sequence numbers; chain hash | Low |
| S22 | Pack contains seed that is stolen by malware on heir device after release | M | Education in Heir Kit: move funds to a fresh wallet immediately; recommended steps | Medium: out of our control |
| S23 | Social-engineering support staff | H | Support has no tools to alter vault state or auth; scripted responses; no override feature exists | Low |
| S24 | Breach of release logs revealing metadata | M | Minimal logging, redaction, retention limits | Low |
| S25 | Insecure self-hosters | M | Hardened defaults, config checker, docs | Medium |

## 4. Abuse and safety
- Vault used to store illegal content: size limits, no server-side scanning possible; terms of service; takedown policy limited to deletion of ciphertext.
- Stalking/harassment via heir invitations: invitation rate limits, opt-out, no sensitive content in emails.

## 5. Assumptions (must remain true)
- Passkeys and OS CSPRNGs are sound; libsodium and chosen SSS library are correct.
- At least one of {server, heir} is not compromised at the same time (Standard mode).
- KMS/HSM keys are non-exportable and access-controlled.
- Owner devices are not fully compromised during pack creation.

## 6. Required red-team exercises before launch
1. Full-DB-dump attacker tries to decrypt anything.
2. Rogue API tries to trigger release.
3. Rogue heir + rogue API tries early release.
4. Phish heir email; try claim.
5. Replay/rollback old events and shares.
6. Clock-skew attack on challenge window.
7. XSS to steal keys; bundle tamper detection.
8. Supply-chain simulation: malicious dependency update caught by CI.
9. DR drill: platform offline, heir recovers with Heir Kit.
10. Social-engineer support to alter state (must be impossible).
