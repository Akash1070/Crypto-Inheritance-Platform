# Engineering Task Checklist: Project Crypto Inheritance Platform

## Phase 0: Foundations & Security Baseline (COMPLETED)
- [x] Initialize root monorepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`)
- [x] Setup linting & architecture boundaries (`eslint.config.js`, Semgrep rules banning crypto imports outside `crypto-core`)
- [x] Setup CI/CD supply-chain hardening (`.github/workflows/ci.yml`, pinned action SHAs, `ignore-scripts = true`, `.npmrc`)
- [x] Write foundational Architecture Decision Records:
  - [x] `ADR-0001`: Two-tier secret separation (Web Coordination vs Air-Gapped Key Operations)
  - [x] `ADR-0002`: Cryptographic suites (XChaCha20-Poly1305, Argon2id, Shamir GF(256) with commitments)
  - [x] `ADR-0003`: WebAuthn Passkey exclusive authentication (no password/SMS auth)
  - [x] `ADR-0004`: Isolated Enclave release-signer with Multi-Clock Verification
- [x] Setup secret scanning (`.gitleaks.toml`) & vulnerability disclosure policy (`SECURITY.md`)
- [x] Setup persistent AI agent rules (`AGENTS.md`)

## Phase 1: Cryptographic Engine & Standalone CLI (`packages/crypto-core`, `packages/cli`) (COMPLETED)
- [x] Implement `crypto-core`: `XChaCha20-Poly1305` authenticated encryption with bound associated data
- [x] Implement `crypto-core`: Argon2id key derivation with mobile/desktop minimum constraints (>=32 MiB, >=3 iterations)
- [x] Implement `crypto-core`: Verifiable Shamir Secret Sharing over $\text{GF}(256)$ with BLAKE2b share commitments
- [x] Implement `crypto-core`: X25519 sealed box key encapsulation for Heir and Enclave shares
- [x] Implement `crypto-core`: Versioned canonical vault envelope packaging (`CIP_VAULT`, version 1, suite 0x0001)
- [x] Implement `packages/cli`: Offline CLI for vault creation, key splitting, share sealing, and paper Heir Kit generation
- [x] Implement test suite: 100% line coverage, KAT vectors, property fuzzing, negative edge cases, and end-to-end offline recovery verification

## Phase 2: WebAuthn Passkeys & Identity (`apps/api`, `packages/protocol`, `apps/web`) (COMPLETED)
- [x] Setup `@simplewebauthn/server` and `@simplewebauthn/browser`
- [x] Registration ceremony: Enforce resident keys, user verification (`required`), minimum 2 passkeys registered per owner (primary + backup hardware key)
- [x] Authentication ceremony: Origin binding, challenge expiration, replay counters, and hardened `HttpOnly; SameSite=Strict; Secure` session cookies
- [x] Step-up verification: Time-bounded single-use 5-minute tokens for high-risk actions (`ADD_HEIR`, `CANCEL_CLAIM`, `CHANGE_GRACE_PERIOD`)
- [x] Emergency Kit generation: High-entropy mnemonic backup token for account re-association (held offline) with one-way HMAC-SHA256 verifier and 7-day security delay

## Phase 3: Vault Coordination API & Event Hash Chaining (`apps/api`, `packages/protocol`)
- [ ] Setup PostgreSQL schema via Drizzle ORM (blind HMAC email indices, tenant RLS)
- [ ] Implement vault CRUD endpoints (strict Zod schema validation, rejecting secret keys)
- [ ] Implement append-only Merkle hash chain for all vault lifecycle events

## Phase 4: State Machine & Background Scheduler (`apps/worker`)
- [ ] Implement `pg-boss` background scheduler for heartbeat expiration
- [ ] Implement escalating reminder notification pipeline (Email, SMS, WebPush, Emergency Contacts)
- [ ] Implement Claim initiation and 30-day Challenge Window state machine
- [ ] Implement instant Owner passkey revocation / cancellation

## Phase 5: Isolated Release Signer Enclave (`apps/release-signer`)
- [ ] Implement minimalist enclave service (< 1,000 LOC, zero external dependencies)
- [ ] Implement Multi-Clock verification (Hardware RTC + Cloudflare Roughtime beacons)
- [ ] Implement event chain validator (monotonic sequence, timer verification, zero cancel events)
- [ ] Implement escrow share decryption, re-encryption to Heir public key, and memory zeroization

## Phase 6: Web Dashboard & Open-Source Release (`apps/web`, `infra/`)
- [ ] Build high-density, accessible UI (Vite + React SPA + Tailwind + Radix Primitives)
- [ ] Implement strict Content Security Policy (CSP), SRI, and Trusted Types
- [ ] Implement reproducible Docker build containers and bundle verification CLI (`cip verify-bundle`)
- [ ] Document `SECURITY.md`, bug bounty procedures, and disaster recovery runbooks
