# 13 — Recommended Repos, Libraries and Skills

**Trust labels:** ✅ = I confirmed the repo exists and its purpose via search in this session. 🔎 = recommended from general knowledge; **verify the repo, maintainers, license, latest release and audit status yourself before adopting.** Run the `dependency-vetting` skill for every addition. Pin exact versions. An "audited" claim is only as good as the report you actually read.

## A. Agent skills (add as folders under `.agents/skills/`)
Skills are instructions your agent will obey. Read every `SKILL.md` before installing. Third-party skill repos can themselves be an attack vector (a scan of one popular skill-install guide flagged auto-loading remote CLAUDE.md/skills as a prompt-injection risk). Clone a pinned commit, review, then copy, never auto-update.

| Skill / repo | Use for | Notes |
|---|---|---|
| ✅ `trailofbits/skills` (github.com/trailofbits/skills) | Security audit workflows: audit-context-building, audit-prep-assistant, insecure-defaults, differential-review, sharp-edges, supply-chain-risk-auditor, constant-time-analysis, semgrep/codeql helpers, fix verification | Built for Claude Code but follows the SKILL.md standard Antigravity also loads. License CC BY-SA 4.0: check obligations before copying text into your repo; referencing/cloning for local use is simplest. Many skills target other languages (Solidity, Rust); pick relevant ones |
| ✅ Antigravity skills docs pattern | `.agents/skills/<name>/SKILL.md` layout; global `~/.gemini/config/skills/` or per workspace | Our three skills in `.agents/skills/` follow it |
| 🔎 Anthropic `anthropics/skills` | General document/code skills examples | Not security-specific; optional |
| 🔎 OWASP ASVS / Cheat Sheet Series as markdown | Reference for review prompts | Paste relevant cheat sheets (Authentication, Session, CSP, Cryptographic Storage, Password Storage, Logging) into `docs/refs/` for the agent to read |
| 🔎 `OWASP/ASVS`, `OWASP/CheatSheetSeries` | Above | CC licensed |

## B. Cryptography libraries (use ONLY via `packages/crypto-core`)
| Library | Purpose | Notes |
|---|---|---|
| 🔎 `jedisct1/libsodium` + `libsodium-wrappers-sumo` | AEAD, Argon2id, sealed boxes, RNG, constant-time | Widely audited and used; sumo build needed for Argon2id |
| 🔎 `paulmillr/noble-hashes`, `noble-curves`, `noble-ciphers` | Hashes, X25519/Ed25519, HKDF | Audited, minimal, no deps; verify the audit reports |
| 🔎 `privy-io/shamir-secret-sharing` | Shamir secret sharing in TypeScript | Reported as audited; **confirm audit reports and licence**; add our own integrity commitment on top |
| 🔎 `FiloSottile/age` (Go) / `str4d/rage` (Rust) / `FiloSottile/typage` (TS) | File encryption format for the Heir Kit / CLI interoperability | Strong, simple, well-reviewed; consider for CLI format |
| ✅ `drand/tlock`, `drand/tlock-js`, `thibmeu/tlock-rs` | Time-lock encryption (drand) | **Not** used for primary release (see doc 04 §5). Optional later as a timing floor |
| 🔎 HPKE (RFC 9180) implementations (e.g. `dajiaji/hpke-js`) | Sealing to a public key | Pick via ADR-002 |
| Any small "crypto helper" npm package not listed here | — | **Do not use.** Unknown packages are a supply-chain and correctness risk; go through `dependency-vetting` and an ADR first |

## C. Auth and web security
| Library | Purpose |
|---|---|
| 🔎 `MasterKale/SimpleWebAuthn` | WebAuthn passkeys server + browser |
| 🔎 WebAuthn PRF extension docs (W3C/MDN) | Deriving client keys from passkeys; check browser/OS support matrix before relying on it |
| 🔎 `helmetjs/helmet` (API) and a CSP test tool | Headers |
| 🔎 `google/trusted-types` / `DOMPurify` (only if user HTML is ever rendered; we plan not to) | XSS defence |
| 🔎 `colinhacks/zod` | Input/output validation |
| 🔎 `fastify/fastify`, `fastify/fastify-rate-limit` | API and rate limits |
| 🔎 `drizzle-team/drizzle-orm`, `timgit/pg-boss` | DB and job queue |

## D. Existing inheritance work (study, integrate, do not reinvent)
| Project | What to learn/use |
|---|---|
| ✅ `blockful/deadman-switch-safe` (Safe forum post: "Dead Man's Switch Module", guard+module pattern, heir takeover, auto-pause) | EVM inheritance module for Phase 2 integration; check audit status before recommending to users |
| ✅ Liana (Wizardsardine) | Bitcoin Miniscript timelock wallet; Phase 2: guide users, import descriptors |
| ✅ Sarcophagus | Design lessons on re-wrapping, Arweave storage, economic incentives, failure modes |
| ✅ Deadhand Protocol (open source, server-assisted SSS + DMS) | Closest architecture; study its release design and issues; compare with ours |
| ✅ Casa Inheritance, Unchained Inheritance, Vault12 | Product/UX benchmarks (closed source) |
| 🔎 Bitcoin Core Miniscript docs, BIP-39/SLIP-39 specs | Background |

## E. Security tooling (CI)
| Tool | Purpose |
|---|---|
| 🔎 Semgrep (+ community rules), CodeQL | SAST |
| 🔎 gitleaks, trufflehog | Secrets |
| 🔎 OSV-Scanner, `pnpm audit`, Socket | Dependencies and malicious package behaviour |
| 🔎 Trivy, Checkov/tfsec | Containers and IaC |
| 🔎 Sigstore `cosign`, SLSA GitHub generator | Signing and provenance |
| 🔎 CycloneDX tools | SBOM |
| 🔎 fast-check, Stryker, Jazzer.js | Property, mutation, fuzz testing |
| 🔎 Playwright + axe-core | E2E and a11y |
| 🔎 OWASP ZAP | DAST baseline |
| 🔎 Slither/Foundry/Echidna | Only if/when Phase 2 contracts are built; don't write contracts in v1 |

## F. How to add a skill or repo safely
1. Clone to a scratch dir, pin the commit SHA.
2. Read every file (agents execute instructions in them). Reject anything that fetches remote content at runtime or auto-updates.
3. Check licence compatibility with our licences (doc 11).
4. Copy only needed files into `.agents/skills/<name>/`, record source URL + SHA in `docs/14-ADR-LOG.md`.
5. Re-review on every update.

## G. Reading list (for you, Akash, and reviewers)
Tlock paper (Gailly, Melissaris, Romailler); Lopp, "Fifteen Men on a Dead Man's Switch" (✅ found: blog.lopp.net) for the design tension between liveness and security; arXiv 2209.11194 on crypto inheritance (✅ found); OWASP ASVS; Latacora/Trail of Bits crypto guidance; Signal/Matrix E2EE web-client integrity discussions.
