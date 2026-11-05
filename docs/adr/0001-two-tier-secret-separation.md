# ADR-0001: Two-Tier Secret Separation (Web Coordination vs. Air-Gapped Key Operations)

## Status
Accepted

## Context
A crypto inheritance system is a tier-0 financial recovery target. Adversaries include sophisticated nation-state cyber warfare units (e.g., Lazarus Group / APT38) and organized crypto-draining syndicates.

Historical attacks against web-based crypto applications demonstrate that **dynamic client-side web applications cannot guarantee the safety of user-entered secrets**:
- **CDN / DNS Hijacking:** DNS poisoning or compromised CDN infrastructure (e.g., Curve Finance, BadgerDAO, Poly Network) allows attackers to serve malicious JavaScript bundles.
- **Supply-Chain Dependency Poisoning:** Transitive npm dependencies can be compromised or hijacked (e.g., Ledger Connect Kit, EventStream) to execute keystroke logging or clipboard exfiltration.
- **Malicious Browser Extensions & XSS:** Browser extensions with broad permissions can read DOM inputs or hook WebCrypto APIs.

If users type raw BIP-39 mnemonic seed phrases or private keys into a web browser form—even if the website claims "client-side encryption"—a single compromised script exfiltrates the seed phrase immediately, leading to total irreversible loss of funds.

## Decision
We mandate a strict **Two-Tier Secret Separation Architecture**:

### Tier 1: Hosted Web Coordination Layer
- **Scope:** Account registration, liveness check-in ceremonies, wallet and vault metadata (public addresses, safe locations, hardware wallet models, attorney contacts), multi-channel notification schedules, claim/challenge state machine management, and tamper-proof audit event chaining.
- **Security Invariant:** The web application and its backend APIs **NEVER accept, process, render, parse, or store unencrypted seed phrases, private keys, or plaintext threshold shares**. 
- Form fields in the web application strictly reject 12/24-word mnemonic patterns and 64-character hex strings to prevent user error.

### Tier 2: Air-Gapped / Offline Recovery Core (`cip-core` / CLI)
- **Scope:** Generation of the 256-bit Vault Key ($VK$), authenticated symmetric encryption ($C_{\text{pack}}$), threshold splitting into Heir Share ($H$), Escrow Share ($S$), and Guardian Share ($G$), and final estate reconstruction.
- **Execution Boundary:** A standalone, statically compiled native binary with **zero network syscalls** (enforced by OS seccomp/pledge sandboxing). Can be run on clean, air-gapped, or offline machines (including live USB environments).
- Outputs sealed ciphertexts and an offline printable **Heir Kit** (encrypted QR codes and paper recovery protocol).

## Consequences
### Positive
- Total immunity of seed phrases to CDN, DNS, web XSS, and npm supply-chain injection attacks.
- Even in a catastrophic full breach of the platform's cloud servers and databases, attackers obtain zero usable keys.
- Open-source survivability: Heirs can recover assets offline even if the hosted platform ceases operation.

### Negative / Trade-offs
- Creating a vault with cold seed splitting requires running an offline CLI or verified native tool, which presents higher friction than a simple website form.
- Mitigated by offering clear step-by-step guidance, printable visual instructions, and a web-only "Metadata / Safe Location Directive" mode for less technical users.

