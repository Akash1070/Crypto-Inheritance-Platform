# Threat Model & Security Runbook

This document defines the formal threat model for the **Crypto Inheritance Platform (CIP)**, outlining potential attack vectors, threat actor capabilities, technical defenses, and incident response procedures.

---

## 1. Threat Matrix Overview

| Threat Vector | Adversary Profile | Attack Description | Architectural Defense |
|:---|:---|:---|:---|
| **T-1: Hypervisor Clock-Warp Attack** | Rogue Cloud Provider / Compelling State Actor | The hypervisor warps VM system time forward by 30 days to instantly expire the challenge window and force escrow share release. | **Multi-Clock Verification Engine** (`apps/release-signer/src/multiclock.ts`). Hardware RTC must match external signed Roughtime beacons (Cloudflare/Google) within $\pm 10$ minutes. |
| **T-2: CDN / DNS Hijacking & Script Tampering** | Nation-State APT / Man-in-the-Middle | Malicious JavaScript injected via compromised CDN or DNS poisoning to harvest user credentials or spoof UI state. | **Subresource Integrity (SRI)**, strict CSP (`default-src 'none'`, `require-trusted-types-for 'script'`), COOP/COEP, and offline verification via `cip verify-bundle`. |
| **T-3: Rogue Share Substitution / Database Tampering** | Compromised DB Admin / SQL Injection | An attacker substitutes an escrow share with an arbitrary share, attempting to cause incorrect reconstruction or extortion. | **Verifiable Shamir Secret Sharing ($\text{GF}(256)$)**. Every share is bound to a 32-byte BLAKE2b commitment ($C_i = \text{BLAKE2b}(i \parallel S_i)$). Reconstruction verifies all commitments before interpolation. |
| **T-4: Premature or Hostile Heir Claim** | Colluding Heir / Rogue Family Member | An heir attempts to claim an active vault while the owner is alive, or social-engineer platform operators. | **Strict State Machine Gating**. Claims are strictly rejected unless vault is in `PENDING` state. Initiating a claim starts a mandatory 30-day Challenge Window with 72h escalating alarms. Single-tap passkey assertion cancels the claim. |
| **T-5: Plaintext Secret Ingestion / Exfiltration** | Web Exploit / Misconfigured Client | A user accidentally uploads a seed phrase or private key into the web dashboard or API. | **Two-Tier Secret Separation ([ADR-0001](adrs/ADR-0001-two-tier-secret-separation.md))**. Web and API lack crypto key libraries. Strict Zod schemas reject unexpected fields and BIP-39 mnemonic wordlists. |

---

## 2. In-Depth Attack Scenarios & Mitigations

### Scenario T-1: Cloud Provider Attempts to Fast-Forward Time
- **Attack Goal:** A cloud administrator or malicious hypervisor fast-forwards the clock of the `apps/release-signer` enclave to bypass the 30-day challenge window.
- **Protocol Defense:**
  1. The enclave receives the current system RTC time alongside a bundle of signed Roughtime beacons from external timestamp authorities (e.g. Cloudflare, Google).
  2. The enclave verifies the Ed25519 digital signature of each beacon against hardcoded trust anchors.
  3. The enclave calculates the median beacon timestamp. If `abs(systemTime - medianBeacon) > 600_000ms` (10 minutes), the enclave **aborts and fails closed**:
     `MULTI_CLOCK_WARP_DETECTED: System RTC deviates from trusted Roughtime beacons by >10 minutes`.
  4. The escrow share is **never decrypted**.

### Scenario T-2: Malicious Web Dashboard Asset Injection
- **Attack Goal:** An attacker compromises the web host or CDN, modifying JavaScript bundles to leak user sessions or intercept passkey ceremonies.
- **Protocol Defense:**
  1. The web application enforces strict Content Security Policy (CSP):
     `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:3000; require-trusted-types-for 'script';`
  2. Frame ancestors are denied (`frame-ancestors 'none'`) preventing clickjacking.
  3. All release builds generate `dist/checksums.json` containing SHA-256 and SRI hashes of every asset.
  4. Users run the offline CLI tool:
     ```bash
     cip verify-bundle --dir apps/web/dist
     ```
     Any tampered, unexpected, or missing asset results in immediate verification failure (`CHECKSUM MISMATCH`).

### Scenario T-3: Rogue Share Tampering
- **Attack Goal:** A compromised database or untrusted network node modifies the encrypted escrow share $S$.
- **Protocol Defense:**
  1. The threshold scheme is not standard Shamir; it is **Verifiable Shamir Secret Sharing (VSSS)**.
  2. During `split-key`, a 32-byte cryptographic commitment $C_i = \text{BLAKE2b}(i \parallel \text{ShareValue}_i)$ is generated for every share.
  3. During `recover`, every share's commitment is recomputed in constant-time. If any byte was altered, reconstruction halts immediately before polynomial math occurs.

---

## 3. Incident Response Runbooks

### Runbook 1: Active Heir Claim Alert Response
1. **Trigger:** Owner receives `[CIP RED ALERT]` email, SMS, or WebPush indicating `INHERITANCE CLAIM INITIATED`.
2. **Immediate Action:**
   - Log into the CIP Web Dashboard using a registered FIDO2 Passkey.
   - Review active claim details (Appointed Heir, Initiated At, Challenge Expiration).
   - Tap **"Cancel Claim Immediately"**.
3. **Automated Protocol Reaction:**
   - The API verifies the owner's passkey and records a `CLAIM_CANCELLED` event on the Merkle chain.
   - The vault state reverts to `ACTIVE` and resets `lastCheckinAt = now`.
   - The release-signer enclave permanently rejects any release request containing this claim.

### Runbook 2: Web Bundle Hash Discrepancy
1. **Trigger:** `cip verify-bundle` reports `[CRITICAL ERROR] CHECKSUM MISMATCH`.
2. **Immediate Action:**
   - Immediately cease using the hosted web application.
   - Check the official GitHub repository for recent release tags and signatures.
   - Alert the security team at `security@crypto-inheritance-platform.org`.
   - Use the sovereign offline CLI (`packages/cli`) for all emergency key operations.

