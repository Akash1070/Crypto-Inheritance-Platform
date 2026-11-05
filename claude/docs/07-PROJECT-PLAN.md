# 07 — Project Plan (PM)

Owner: Akash. Builder: Antigravity agents + human review. Security reviewers: to be engaged (see budget).

## 1. Delivery philosophy
Security gates, not dates, decide when we move on. Estimates assume part-time vibe-coding with human review; adjust.

## 2. Milestones
| M | Name | Output | Est. |
|---|---|---|---|
| M0 | Foundations | Repo, CI, security tooling, rules, empty packages, ADR log | 1 wk |
| M1 | crypto-core + CLI | Vault format, AEAD, KDF, SSS wrapper, sealing, share integrity, known-answer + property tests, offline decrypt CLI | 2–3 wks |
| M2 | Auth | Passkey registration/login/step-up, sessions, device list, delayed recovery | 2 wks |
| M3 | Vault + Heirs | Pack editor (client-side encrypt), heir onboarding, Emergency Kit + Heir Kit generation | 3 wks |
| M4 | Trigger engine | State machine, hash-chained events, reminders, check-in, pause | 2 wks |
| M5 | Release path | Claim, challenge, `release-signer`, heir recovery flow, dry-run | 3 wks |
| M6 | Hardening | CSP/Trusted Types, rate limits, observability, DR, reproducible builds, internal audit round | 2–3 wks |
| M7 | External audit + beta | Third-party audit (crypto + app + infra), fix cycle, bug bounty (private), closed beta with fake data then limited real users | 6–10 wks |
| M8 | Public launch | Open source release, docs, status page, incident process live | 2 wks |
| P2 | Phase 2 | Fortress mode, Safe/Miniscript integrations, apps, localization | later |

## 3. Gates (hard stops)
| Gate | Condition | Evidence |
|---|---|---|
| G0 | Docs reviewed and decisions recorded | ADR log, owner sign-off |
| G1 | M1 complete: all KAT/property tests green; AI + human crypto review done | Checklist in doc 08 §3 |
| G2 | **Independent cryptographer reviews doc 04 and M1** | Written report; findings closed |
| G3 | **External pentest/audit complete, no open critical/high; red-team exercises in doc 05 §6 passed** | Audit report published |
| G4 | Closed beta with fake data: dry-run recovery success ≥ 95%, platform-offline recovery 100% | Test logs |
| G5 | Bug bounty live ≥ 4 weeks, no open critical/high | Platform report |
| G6 | Legal review done (doc 10), terms/privacy ready | Counsel sign-off |
Real user secrets are only permitted after G3 (limited beta) and G5 (public).

## 4. Budget (rough, validate with quotes; USD)
| Item | Range |
|---|---|
| Independent cryptography review | 5k–20k |
| External application/infra audit (reputable firm) | 20k–80k |
| Bug bounty rewards pool | 5k–25k |
| Infra (staging+prod, KMS, monitoring) | 300–1,500 / month |
| Legal (privacy, ToS, regulatory opinion) | 3k–15k |
| Domain, email, misc | <500 |
Cheapest honest path: self-fund M0–M6 with the agent, then crowdfund/grant (Ethereum Foundation ESP, Protocol Guild-adjacent programs, Gitcoin, OpenSats-style funders; *verify current programs*) for audit. Grants for open-source security tooling are plausible for this niche.

## 5. Roles
| Role | Who |
|---|---|
| Product + decisions | Akash |
| Builder | Antigravity agents under rules |
| Human code reviewer | Akash + a security-literate dev reviewer (hire/contract part-time) |
| Cryptographer | External reviewer |
| Auditor | External firm |
| Design/usability testers | Recruit 10 non-technical people |
| Legal | Counsel in India (+ EU/US opinion before launch there) |

## 6. Per-milestone Definition of Done
- Acceptance criteria in PRD met; tests green; coverage targets met (crypto-core 100% line + branch).
- `/security-review` workflow run, findings resolved or recorded with justification.
- Docs updated (threat model if surface changed, ADRs).
- No new high/critical in SAST/dependency scans.
- Human review recorded in PR description.

## 7. Risk register (top)
| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Agent-written crypto bug | High | Critical | Vetted libs only, isolation, tests, external review | Akash |
| Audit cost too high | Med | High | Phase scope; grants; self-host-first launch | Akash |
| Supply-chain compromise | Med | Critical | Doc 13 vetting rules, pinning, minimal deps | Akash |
| Scope creep (tokens, chains, AI features) | High | Med | PRD out-of-scope list; ADR to change | Akash |
| Legal/regulatory surprise | Med | High | Counsel before launch; no custody | Akash |
| Heirs fail recovery (UX) | Med | High | Dry-run, Heir Kit, usability tests | Akash |
| Single founder bus factor | High | High | Documentation, open source, continuity plan (the product itself!) | Akash |
| Breach/incident | Low-Med | Critical | Doc 12, minimal data, monitoring | Akash |

## 8. Weekly rhythm
Mon plan milestone slice with agent; Tue–Thu build; Fri review diff, run `/security-review`, update ADR/threat model, tag. Keep a `CHANGELOG.md`.

## 9. Launch checklist
Audit published · bounty live · reproducible build verified by a third party · SECURITY.md live · status page · incident contacts · backups restored in drill · legal docs · accessibility pass · onboarding dry-run success rates met · continuity plan documented.
