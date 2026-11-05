# Security Policy & Bug Bounty Program

Security is the primary foundation of the **Crypto Inheritance Platform (CIP)**. Because real generational assets, estate secrets, and family legacies depend on this protocol, correctness and mathematical security strictly outrank speed.

---

## 1. Vulnerability Disclosure & Bug Bounty Program

We operate a formal Coordinated Vulnerability Disclosure (CVD) process with rewards for verified vulnerabilities.

### Reward Matrix (USD)

| Severity | CVSS v3.1 Range | Bounty Reward | Examples |
|:---|:---:|:---:|:---|
| **Critical** | 9.0 – 10.0 | **Up to $50,000** | Unauthorized escrow release, cryptographic bypass in VSSS $\text{GF}(256)$, side-channel private key extraction, memory zeroization failure leading to key recovery. |
| **High** | 7.0 – 8.9 | **Up to $15,000** | WebAuthn passkey authentication bypass, Merkle event chain signature forgery, multi-clock time warp bypass, RLS tenant isolation failure. |
| **Medium** | 4.0 – 6.9 | **Up to $5,000** | Rate-limit bypass on sensitive endpoints, denial of service in enclave event walker, unexpected schema key injection. |
| **Low** | 0.1 – 3.9 | **Up to $1,000** | Non-sensitive information disclosure, CSP minor policy gap without script execution, documentation security omissions. |

### Safe Harbor Guarantee
Security researchers acting in good faith receive full safe harbor protection:
- We will not pursue civil or criminal legal action against researchers who discover and report vulnerabilities in accordance with this policy.
- Researchers must make a good-faith effort to avoid privacy violations, destruction of data, and interruption or degradation of our services.
- Never test against production user vaults; use local or staged test vaults only.

### Scope
- **In-Scope:**
  - Cryptographic Engine: `packages/crypto-core`
  - Offline Sovereign CLI: `packages/cli`
  - Protocol & Data Contracts: `packages/protocol`
  - Release-Signer Enclave: `apps/release-signer`
  - Coordination API: `apps/api`
  - Web Dashboard: `apps/web`
  - Docker & Container Infrastructure: `infra/docker/`, `docker-compose.yml`
- **Out-of-Scope:**
  - Volumetric DDoS attacks against hosted endpoints.
  - Social engineering or physical attacks against employees or users.
  - Vulnerabilities requiring physical access to an unlocked, authenticated client machine.

### Reporting Process
**Do NOT file public GitHub issues for security vulnerabilities.**

Report security vulnerabilities via encrypted email or GitHub Security Advisory:
- **Email:** `security@crypto-inheritance-platform.org`
- **PGP Fingerprint:** `4E6F 9025 14D0 C66A 91E5 4D63 F236 7355 AFBA 52D9`
- **Response SLA:**
  - Initial acknowledgement: within **24 hours**.
  - Triage assessment and severity classification: within **72 hours**.
  - Remediation & release target: **< 14 days** (or coordinated release date).

---

## 2. Non-Negotiable Architectural Invariants

Every code contribution must uphold the five architectural invariants established in our Architecture Decision Records:

1. **Two-Tier Secret Separation ([ADR-0001](docs/adrs/ADR-0001-two-tier-secret-separation.md)):**
   - The web client (`apps/web`) and API (`apps/api`) must **NEVER** accept, process, transmit, log, or store unencrypted seed phrases, private keys, or raw threshold shares.
   - Any secret handling must remain strictly in `packages/crypto-core` and the offline CLI (`packages/cli`).
   - Linting rules ban imports of `libsodium-wrappers-sumo`, `@noble/*`, and Node `crypto` in `apps/web` and `apps/api`.
2. **No Invented Cryptography ([ADR-0002](docs/adrs/ADR-0002-cryptographic-suites.md)):**
   - Vetted primitives only: `XChaCha20-Poly1305` (IETF, 24-byte nonce) with authenticated associated data ($AD$), Argon2id ($m \ge 32\text{ MiB}, t \ge 3$), Verifiable Shamir over $\text{GF}(256)$ with BLAKE2b share commitments, X25519 sealed boxes, and Ed25519 signatures.
3. **Passkeys Only ([ADR-0003](docs/adrs/ADR-0003-passkey-identity.md)):**
   - FIDO2 resident keys required. Email and SMS are strictly notification transports, never proof of liveness.
4. **Isolated Enclave Release with Multi-Clock Verification ([ADR-0004](docs/adrs/ADR-0004-isolated-enclave-release.md)):**
   - Only `apps/release-signer` (<1,000 LOC, zero egress) can decrypt escrow share $S$.
   - Independent verification of monotonic Ed25519 Merkle event chain and Multi-Clock Roughtime attestations to prevent clock-warp attacks.
5. **Fail-Closed Memory Zeroization:**
   - Any temporary memory holding plaintext shares or keys must be scrubbed immediately using `sodium.memzero` (`zeroize`).

---

## 3. Related Security References

- **Threat Model Runbook:** [`docs/THREAT_MODEL_RUNBOOK.md`](docs/THREAT_MODEL_RUNBOOK.md)
- **Independent Audit Checklist:** [`docs/AUDIT_CHECKLIST.md`](docs/AUDIT_CHECKLIST.md)
- **Architecture Decision Records:** [`docs/adrs/`](docs/adrs/)
