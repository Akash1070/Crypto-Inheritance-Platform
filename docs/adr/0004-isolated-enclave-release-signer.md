# ADR-0004: Isolated Enclave Release-Signer with Multi-Clock Verification

## Status
Accepted

## Context
In our threshold scheme, the Escrow Share ($S$) is encrypted to a public key controlled by the server infrastructure. If the standard web backend or database operator could arbitrarily decrypt $S$, an attacker who breaches the web server could collude with an heir (or compromise an heir device) to achieve premature vault opening while the owner is alive.

Furthermore, if the release logic relies solely on cloud server system time (NTP), an attacker with root infrastructure access or hypervisor control could perform a **time-warp attack** (artificially advancing the server clock by 30 days) to instantly bypass the challenge window.

## Decision
We establish an **Isolated Enclave `release-signer` with Multi-Clock Monotonic Verification**:

### 1. Architectural Isolation
- The `release-signer` is a microservice containing fewer than 1,000 lines of code, with zero external web dependencies.
- Runs in an isolated security domain (AWS Nitro Enclave, GCP Confidential Space, or air-gapped HSM environment).
- **Network Boundaries:** Zero public ingress; zero outbound internet access. Ingress is restricted to an authenticated mTLS connection from the internal API gateway transmitting only structured release claims.
- The decryption key for $S$ resides strictly within KMS/Nitro Enclave memory and cannot be exported.

### 2. Independent Cryptographic Proof Verification
The `release-signer` **never trusts assertions from the API or worker**. To release $S$, it requires and independently verifies:
1. **The Full Signed Merkle Event Chain:** Verifies all sequential Ed25519 signatures, verifying that the vault entered `PENDING` legally, and that a valid `CLAIM_STARTED` event was signed by the authenticated Heir passkey.
2. **Absence of Cancellation:** Verifies that no `CLAIM_CANCELLED`, `CHECKIN`, or `PAUSE` event exists anywhere in the chain following the claim.
3. **Fresh Heir Step-Up Token:** Verifies a cryptographic assertion from the Heir within the last 5 minutes.

### 3. Multi-Clock Anti-Time-Warp Verification
To prevent NTP spoofing and clock-advancement attacks:
- The enclave measures time against:
  1. Internal monotonic hardware RTC clock.
  2. Signed external Roughtime time beacons (e.g., Cloudflare Roughtime).
  3. Bitcoin / Ethereum header block timestamps anchored into the Merkle chain.
- If clock skew or backwards jump exceeds tolerances, or if the challenge period ($T \ge 30$ days) is not satisfied across all independent clocks, release fails closed.

### 4. Direct Re-Encryption to Heir Public Key
- When all invariants are cryptographically proven, the enclave decrypts $S$, immediately re-encrypts it using X25519 sealed box directly to the Heir's registered public key, emits a signed `RELEASE` event, and securely zeroes out memory buffers.
- The API gateway and database receive only the re-encrypted ciphertext; plaintext $S$ is never exposed to the API.

## Consequences
- Compromising the primary web API or database does **not** grant the ability to release escrow shares.
- Time-skew attacks cannot bypass the 30-day challenge period.
- The trusted computing base (TCB) for share release is minimized to < 1,000 lines of auditable code.

