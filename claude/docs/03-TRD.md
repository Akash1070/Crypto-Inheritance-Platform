# 03 — Technical Requirements Document (TRD)

## 1. Principles
1. Boring, well-understood technology. No novelty in security-critical paths.
2. Smallest possible trusted surface: all crypto in one package; one state machine; one auth module.
3. Server is untrusted for confidentiality, trusted only for availability and release gating.
4. Everything reproducible, signed, and verifiable.

## 2. Recommended stack (top pick; change only via ADR)
| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) everywhere | One language, vibe-coding friendly, strong typing |
| Monorepo | pnpm workspaces + Turborepo | Simple, reproducible |
| Web client | Vite + React SPA (static build), served from a minimal static host/CDN | Static bundle is easier to hash, pin, and verify than SSR; avoids server-rendered secrets |
| Styling | Tailwind + accessible component primitives (Radix) | Speed, accessibility |
| API | Fastify (or Hono) on Node 22 LTS, schema-validated with Zod | Small, fast, explicit |
| DB | PostgreSQL 16, Drizzle ORM, migrations in Git | Standard, auditable |
| Jobs/scheduler | Postgres-backed queue (pg-boss) | One less moving part than Redis; transactional with state |
| Auth | WebAuthn passkeys via `@simplewebauthn/server` + `/browser` | Phishing-resistant, no passwords |
| Crypto | libsodium (`libsodium-wrappers-sumo`) for XChaCha20-Poly1305, Argon2id, X25519 sealed boxes; `@noble/hashes` and `@noble/curves` where needed; vetted Shamir library (see doc 13) | Audited, widely used |
| Key management (server) | Cloud KMS/HSM (AWS KMS, GCP KMS or self-host: HashiCorp Vault/OpenBao transit) | Escrow share encrypted at rest with non-exportable key |
| Email | Transactional provider with DKIM/SPF/DMARC, minimal content (no secrets, no vault names) | Deliverability |
| SMS/Push | Optional; Web Push first; SMS via provider as best-effort channel only | SIM-swap risk, so never proof |
| Infra | Containers, IaC (Terraform), single region at first, multi-AZ DB, PITR backups | Reproducible |
| Observability | OpenTelemetry to self-hosted/own-tenant stack; strict PII redaction | No third-party session replay |
| CI/CD | GitHub Actions, pinned by SHA, OIDC to cloud, Sigstore signing, SLSA provenance | Supply-chain safety |

Rejected: Next.js SSR for the app shell (harder to pin the served JS), Firebase/Supabase-as-trust-root (outsources trust we need to control; fine for prototypes only), third-party auth (Auth0 etc.), any analytics SDK, any wallet-connect SDK in v1.

## 3. Repository layout
```
heirkey/
  apps/
    web/                 # Vite React SPA (no secrets, strict CSP)
    api/                 # Fastify API
    worker/              # Scheduler: reminders, trigger evaluation
    release-signer/      # Isolated service: the ONLY thing allowed to decrypt/release escrow shares
  packages/
    crypto-core/         # ALL cryptography. Tiny. 100% coverage. Known-answer tests.
    protocol/            # Types/schemas for vault format, state machine events
    ui/                  # Shared components
    cli/                 # `heirkey` CLI: offline recovery, bundle verify
  infra/                 # Terraform, Docker, CSP config
  docs/ .agents/ prompts/
```
Dependency rule (enforced by lint): only `crypto-core` and `cli` may import crypto libraries. `apps/api` never imports `crypto-core` decrypt functions.

## 4. Data model (PostgreSQL, simplified)
All sensitive columns are ciphertext produced by clients. Names below are suggestions.

- `users(id, email_hash_idx, email_enc, created_at, status)` — email encrypted at rest with KMS data key; blind index (HMAC) for lookup.
- `credentials(id, user_id, webauthn_cred_id, public_key, sign_count, transports, created_at, last_used_at)`
- `vaults(id, owner_id, state, checkin_interval_days, grace_days, challenge_days, last_checkin_at, version, created_at)`
- `vault_blobs(vault_id, version, ciphertext_ref, ciphertext_sha256, size, created_at)` — ciphertext in object storage; hash in DB.
- `heirs(id, vault_id, label_enc, invite_email_enc, heir_pubkey, wrapped_heir_share, status, created_at)` — `wrapped_heir_share` is sealed to heir's public key.
- `escrow_shares(id, vault_id, kms_ciphertext, key_version, created_at)` — encrypted by KMS; only `release-signer` role can decrypt.
- `claims(id, vault_id, heir_id, started_at, challenge_ends_at, status)`
- `events(id, vault_id, seq, type, payload_hash, prev_hash, created_at, signature)` — append-only hash chain; DB role has INSERT only.
- `notifications(id, vault_id, channel, template, sent_at, status)` — no secrets in payloads.

Database roles: `api_rw` (no access to escrow_shares), `worker_rw` (no escrow), `release_signer_ro_escrow` (read escrow only, separate network path), `migrator`. Row-level security on tenant tables as defence in depth.

## 5. Vault state machine
```
ACTIVE --(missed check-in)--> REMINDING --(interval+grace elapsed)--> PENDING
PENDING --(heir claim w/ passkey)--> CLAIMED -> CHALLENGE (timer starts)
CHALLENGE --(owner passkey login)--> ACTIVE   [claim cancelled]
CHALLENGE --(timer elapsed, no cancel, heir step-up)--> RELEASED
ACTIVE/REMINDING/PENDING --(owner pause)--> PAUSED --(end/resume)--> ACTIVE
ANY non-RELEASED --(owner cancel/delete)--> CANCELLED
```
Rules:
- Transitions are only performed by `worker` (time-based) or `api` (user-driven), each written as a signed event in the hash chain.
- `RELEASED` is terminal and one-way.
- `release-signer` independently re-verifies the event chain (valid signatures, timer elapsed by its own clock, no cancel event) before touching escrow. It does not trust `api` or `worker` assertions.
- Time source: NTP-synced servers plus signed timestamps; reject clock jumps; challenge timer measured from stored signed event, never from client input.

## 6. API (representative; full OpenAPI generated from Zod)
- `POST /auth/register/options|verify`, `POST /auth/login/options|verify`, `POST /auth/stepup`
- `GET/PUT /vaults/:id/blob` (ciphertext only, with size and hash checks)
- `POST /vaults/:id/checkin` (requires passkey assertion)
- `POST /vaults/:id/pause|resume`
- `POST /vaults/:id/heirs`, `DELETE /vaults/:id/heirs/:hid`
- `POST /vaults/:id/claims` (heir, passkey), `POST /claims/:id/cancel` (owner, passkey)
- `POST /claims/:id/release` (heir step-up; API forwards to `release-signer`; API never sees the share)
- `GET /vaults/:id/events` (owner; hash chain)
Standards: schema-validate input and output; reject unknown fields; idempotency keys on mutations; rate limits per IP, account and vault; generic error messages; no user enumeration.

## 7. Web client security requirements
- Strict CSP: `default-src 'none'; script-src 'self'` with hashed/nonced inline only if unavoidable; no `unsafe-inline`, no `unsafe-eval`; `connect-src` limited to own API; `frame-ancestors 'none'`; `require-trusted-types-for 'script'`; `base-uri 'none'`; `form-action 'self'`.
- Other headers: HSTS preload, COOP/COEP, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal, `X-Content-Type-Options`.
- Subresource integrity for all assets; no third-party origins; self-hosted fonts.
- Keys held in memory only; non-extractable WebCrypto keys where possible; clear buffers; never in localStorage/IndexedDB unwrapped.
- Reproducible build; bundle hash published in signed release and in a transparency log; `heirkey verify` compares.
- Dependency lockfile, `pnpm audit`, SBOM, install scripts disabled by default (`ignore-scripts`).
- Anti-phishing: show an owner-chosen "security phrase" on sign-in screens; encourage bookmarking; passkeys are origin-bound which defeats look-alike domains.

## 8. Argon2id and key derivation
Used only for user-supplied passphrases (Emergency Kit passphrase, optional pack passphrase). Parameters stored in the file header; default target ≥ 64 MiB memory, t≥3, p=1 on desktop; adaptive on mobile but never below documented minimums. Parameters are never lowered by server request. Exact values defined in doc 04.

## 9. Infrastructure and operations
- Separate cloud accounts/projects for prod, staging, dev. No prod data in lower envs.
- `release-signer` in its own account/VPC, ingress only from API over mTLS, egress none; KMS key policy allows only its role; all decrypts logged to an immutable log with alerts.
- Secrets in KMS/secret manager; short-lived creds via OIDC; no long-lived keys in CI.
- Backups encrypted, tested restores monthly; backups never contain plaintext (nothing to contain).
- WAF + rate limiting + bot protection (self-hosted or privacy-respecting; no JS challenge from third parties on app pages if avoidable).
- 24/7 alert on: release-signer decrypts, failed chain verifications, spikes in claim starts, auth anomalies.

## 10. Quality gates (blockers for merge)
Type-check, lint, unit + property tests, crypto known-answer tests, SAST (Semgrep, CodeQL), secret scanning (gitleaks), dependency scan (OSV-Scanner/`pnpm audit`), license check, CSP check, container scan, IaC scan. See docs 08 and 09.

## 11. Deliverables per milestone
Mapped in doc 07. Each milestone yields code, tests, docs updates, ADRs, and a completed checklist from doc 08.
