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

## Phase 3: Vault Coordination API & Event Hash Chaining (`apps/api`, `packages/protocol`) (COMPLETED)
- [x] Setup PostgreSQL schema via Drizzle ORM (blind HMAC email indices, tenant isolation, ciphertext-only blob storage)
- [x] Implement strict Zod schemas with unexpected key rejection & BIP-39 mnemonic pattern detection
- [x] Implement append-only cryptographic Merkle event hash chain with Ed25519 digital signatures and verification
- [x] Implement vault CRUD endpoints (`POST /vaults`, `GET /vaults`, `GET /vaults/:id`, `PUT /vaults/:id/blob`)
- [x] Implement passkey liveness check-in (`POST /vaults/:id/checkin`) and countdown pause/resume
- [x] Implement heir management with step-up token enforcement (`POST /vaults/:id/heirs`)
- [x] Setup API rate limiting (`@fastify/rate-limit`)

## Phase 4: State Machine & Background Scheduler (`apps/worker`) (COMPLETED)
- [x] Implement heartbeat countdown evaluator (`apps/worker/src/heartbeat.ts`)
- [x] Implement escalating reminder notification pipeline (Email, SMS, WebPush, Emergency Contacts) (`apps/worker/src/notifications.ts`)
- [x] Implement Claim initiation and 30-day Challenge Window state machine (`apps/worker/src/claimEngine.ts`)
- [x] Implement instant Owner passkey revocation / cancellation API (`POST /vaults/:id/claim/cancel`)
- [x] Implement deterministic scheduler cycle runner with Merkle audit event logging (`apps/worker/src/scheduler.ts`)
- [x] Comprehensive test suite (15 unit and integration tests passing)

## Phase 5: Isolated Release Signer Enclave (`apps/release-signer`) (COMPLETED)
- [x] Implement minimalist enclave service (357 LOC, strictly < 1,000 LOC target)
- [x] Implement Multi-Clock verification (Hardware RTC + Cloudflare/Google signed Roughtime beacons)
- [x] Implement Merkle event chain validator (monotonic sequence, hash linkage, Ed25519 signatures, zero cancel/checkin events)
- [x] Implement escrow share decryption, direct re-encryption to Heir X25519 public key, and mandatory memory zeroization
- [x] 11 comprehensive unit and integration tests passing with complete round-trip proof

## Phase 6: Web Dashboard & Open-Source Release (`apps/web`, `infra/`) (COMPLETED)
- [x] Build high-density, accessible UI (Vite + React SPA + Tailwind + Radix Primitives)
- [x] Implement strict Content Security Policy (CSP), SRI, and Trusted Types
- [x] Implement reproducible Docker build containers and bundle verification CLI (`cip verify-bundle`)
- [x] Document `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, bug bounty procedures, and disaster recovery runbooks
