# Third-Party Pre-Launch Security Audit

**Audited by:** Unfold Logic — Akash Kumar Jha
**Scope:** Full monorepo — `apps/api`, `apps/worker`, `apps/release-signer`, `apps/web`, `packages/crypto-core`, `packages/protocol`, `packages/event-chain`, `packages/cli`, infrastructure (Docker/compose/nginx), CI.
**Method:** Cloudflare security-audit-skill methodology in spirit: reconnaissance → coverage-led hunting → candidate validation → structured, ranked findings with exact fixes.
**Status:** All P0 and P1 findings fixed. P2 findings fixed. P3 residual notes tracked below.

---

## Ranking Summary

| Rank | Finding | Severity | Status |
|---|---|---|---|
| 1 | Hardcoded / shipped cryptographic keys in compose & code defaults | P0 · CRITICAL | FIXED |
| 2 | Entire API state held in memory — data loss on restart | P0 · CRITICAL | FIXED |
| 3 | Worker and API operate on disconnected state; placeholder audit events | P0 · CRITICAL | FIXED |
| 4 | Release-signer exposed plaintext HTTP, unauthenticated, self-attestation fallback | P0 · HIGH | FIXED |
| 5 | Plain check-in silently cancelled an active inheritance claim | P1 · HIGH | FIXED |
| 6 | Heirs cannot authenticate — claims impossible after owner death | P1 · HIGH | FIXED |
| 7 | Ephemeral server signing key + self-generated bundle manifests | P1 · HIGH | FIXED |
| 8 | Rate-limit bypass via trust-proxy; per-process limits at scale | P2 · MEDIUM | FIXED |
| 9 | Emergency kit mnemonic ~80-bit, non-standard wordlist, raw HMAC verifier | P2 · MEDIUM | FIXED |
| 10 | Public account enumeration on registration | P2 · MEDIUM | FIXED |
| 11 | Step-up tokens not bound to the target vault | P2 · MEDIUM | FIXED |
| 12 | Unbounded event-chain payloads | P2 · MEDIUM | FIXED |
| 13 | Demo/prototype UI files showing fabricated balances | P3 · NOTE | PARTIALLY FIXED |

---

## P0 — Fixed (Blocking Before Launch)

### 1. Hardcoded/shipped keys → full compromise of every escrow share
**Before:** `docker-compose.yml` shipped `CIP_SERVER_SIGNING_KEY_HEX=4444…`, `CIP_ENCLAVE_PRIVATE_KEY_HEX=1111…`, `CIP_RELEASE_SIGNING_KEY_HEX=2222…`, dev cookie & DB passwords. Anyone with the repo held the enclave decryption key and the event-chain signing key.

**Fix:**
- `packages/protocol/src/secrets.ts`: `assertStrongHexSecret` / `assertStrongSecret` reject missing, non-hex, all-same-byte, or repeated-pattern secrets.
- API boot requires `CIP_COOKIE_SECRET` + `DATABASE_URL` in production; `getServerSigningKey` gates `CIP_SERVER_SIGNING_KEY_HEX` in all modes.
- Release-signer boot requires enclave key, release signing key, server public key, shared secret, TLS certs.
- `docker-compose.yml` now uses `${VAR:?}` for every secret — no defaults, no shipped keys; API host port removed.

### 2. In-memory-only API
**Before:** `MemoryAuthStore`, `MemoryVaultStore`, and the event-chain `Map` held 100% of production state; a restart destroyed users, vaults, escrow shares, and audit chains. `db/schema.ts` existed but was never wired.

**Fix:** `PgAuthStore`, `PgVaultStore`, `PgEventChainStore` (new `@cip/event-chain` package, transactional appends with per-vault advisory locks). `apps/api/src/db/index.ts` bootstraps schema (`CREATE TABLE IF NOT EXISTS …`). Stores auto-select: Postgres when `DATABASE_URL` is set, memory otherwise (tests/dev).

### 3. Worker/API parallel universes
**Before:** Worker wrote placeholder audit rows (`prev_hash='prev-hash'`, `signature='worker-signature'`) that could never be verified, while the API signed chains in its own memory.

**Fix:** Worker now reads full vault state (including challenge + notification fields) from Postgres and appends **real signed events** through `@cip/event-chain`, using the same persistent server signing key. Notification escalation state is persisted.

### 4. Release-signer exposure
**Before:** `createEnclaveServer` defaulted to plain `http`, had no authentication or rate limit, and if `CIP_SERVER_SIGNING_PUBLIC_KEY_HEX` was missing, validated chains against its own key.

**Fix:** Fail-closed: refuses to start without the server public key; refuses plaintext (mTLS required); HMAC-authenticated `/release` via `x-cip-release-auth`; per-IP rate limit; test coverage added for both rejections.

---

## P1 — Fixed (Breaks Real Users or the Core Safety Promise)

### 5. Check-in cancelled active claims silently
**Before:** `updateCheckin` set `state='ACTIVE'` unconditionally — a cookie-authenticated `POST /checkin` during `CHALLENGE` cancelled the heir's claim with no step-up and no `CLAIM_CANCELLED` event.

**Fix:** `updateLastCheckin` never overrides `CHALLENGE`; `pause`/`resume` are state-guarded in store and route (409 on invalid transitions); the web UI disables "Assert Liveness"/pause during challenge and shows "Claim Active".

### 6. Heirs couldn't authenticate
**Before:** `INITIATE_CLAIM` required the owner's session + owner step-up token. After the owner's death, no heir could ever claim.

**Fix:** `POST /vaults/:id/claim` is heir-authenticated: Ed25519 signature over `CIP_CLAIM:v1:<vault>:<heirPubkey>:<timestamp>:<nonce>`, 5-minute freshness window, replay-nonce rejection, no session required. Owner cancellation still requires step-up. Tests cover premature claim, success, and replay.

### 7. Ephemeral signing key + self-referential manifests
**Fix:** Production requires a persistent `CIP_SERVER_SIGNING_KEY_HEX`; `cip verify-bundle --sign` (Ed25519) now creates `checksums.json.sig`, and `--public-key-file` verifies it — release gates can enforce an externally-held key.

---

## P2 — Fixed

### 8. Cross-instance rate limiting
`apps/api/src/security/rateLimit.ts`: Postgres-backed atomic limiter (`rate_limits` table). 20/min for `/auth/*`, 60/min for state-changing `/vaults/*`, 100/min otherwise; replaces the per-process limiter when a DB is configured. `trustProxy` only trusts the single ingress hop.

### 9. Emergency kit strength
Full BIP-39 2048-word wordlist (`@scure/bip39`) with 128-bit entropy + checksum; verifier upgraded from raw HMAC-SHA256 to **Argon2id** (64 MiB, opslimit 4) with per-user 16-byte salt, constant-time comparison.

### 10. Account enumeration
`/auth/register/options` no longer creates users or leaks existence (identical 200 response). Uniqueness is enforced at `/register/verify` (409 on duplicate), and failed ceremonies roll back the created user.

### 11. Step-up token resource binding
Tokens now carry optional `vaultId`; `ADD_HEIR` / `CANCEL_CLAIM` reject tokens minted for a different vault.

### 12. Event-chain pagination
`GET /vaults/:id/events?limit=&beforeSequence=` — default 200, max 1000, page metadata, safe in both PG and memory stores.

---

## P3 — Residual Notes

- **Demo/prototype UI files** (`EstateAssetsCard`, `WalletConnectModal`, `HeirsDirectoryCard`, `CreateVaultModal`) were added in parallel work sessions with **fabricated balances** ($1.6M sample estate). Defaults changed so sample data never auto-loads (empty state until an explicit "Load Sample Estate" action). Before launch: gate or remove demo data, wire heirs from real vault data, and confirm the "Link Wallet" feature only monitors public addresses.
- `@fastify/rate-limit` remains the fallback when no DB is configured (per-process).
- CORS origin is a single env string; multi-origin production needs an array.
- The `createDemoVault` envelope contains no secrets and is clearly labeled — safe to use for onboarding, but server-side demo detection is not yet present.

---

## Verification

- Repo-wide: `pnpm build` 9/9 · `pnpm lint` 12/12 · `pnpm test` 11/11 green.
- Targeted: API 22 tests incl. new anti-enumeration, Argon2id verifier, vault-bound step-up, replay rejection; release-signer 15 tests incl. mTLS fail-closed; event-chain 4 tests.
