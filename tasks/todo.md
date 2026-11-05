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

## Phase 1: Cryptographic Engine & Standalone CLI (`packages/crypto-core`, `packages/cli`)
- [ ] Implement `crypto-core`: `XChaCha20-Poly1305` authenticated encryption with bound associated data
- [ ] Implement `crypto-core`: Argon2id key derivation with mobile/desktop minimum constraints
- [ ] Implement `crypto-core`: Verifiable Shamir Secret Sharing over $\text{GF}(2^8)$ with byte commitments
- [ ] Implement `crypto-core`: X25519 sealed box key encapsulation for Heir and Enclave shares
- [ ] Implement `packages/cli`: Offline CLI for vault creation, key splitting, and paper Heir Kit generation
- [ ] Implement test suite: 100% coverage, KAT vectors, property fuzzing, and negative tests

## Phase 2: WebAuthn Passkeys & Identity (`apps/api`, `packages/protocol`)
- [ ] Setup `@simplewebauthn/server` registration and assertion endpoints
- [ ] Implement resident key enforcement, user verification, and minimum 2-key policy
- [ ] Implement session management (`HttpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookies)
- [ ] Implement step-up authentication tokens for high-risk mutations

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
