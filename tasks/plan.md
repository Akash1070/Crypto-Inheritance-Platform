# Master Engineering Plan: Project Aethelgard (Heirkey)
**Open-Source Zero-Knowledge Crypto Inheritance Platform**

## 1. Vision & Architecture Summary
Project Aethelgard merges the deep architectural principles of ChatGPT and Claude into a unified, nation-state-hardened system:
- **Two-Tier Secret Isolation:** The web interface handles planning metadata, heartbeats, and coordination. It never touches plaintext seed phrases or raw private keys.
- **Air-Gapped Cold Vault Core:** Secret generation, AEAD encryption, and Verifiable Shamir Secret Sharing ($VK = H \oplus S \oplus G$) run via an offline-verifiable CLI/desktop tool (`aethel-core`).
- **Phishing-Resistant Identity:** FIDO2 WebAuthn Passkeys only. No passwords, no SMS, and email never counts as proof of life.
- **Isolated Release-Signer Enclave:** Dedicated microservice in an isolated VPC/enclave that evaluates a signed cryptographic Merkle event chain and multi-clock time anchors before releasing the escrow share $S$.
- **Sovereign Heir Kit:** Complete continuity package enabling heirs to recover offline if the hosted platform is ever discontinued.

## 2. Phase Breakdown
- **Phase 0:** Monorepo scaffolding, ADRs, security linters, and supply chain rules.
- **Phase 1:** `packages/crypto-core` & offline `cli` with 100% test coverage and KAT test vectors.
- **Phase 2:** WebAuthn passkey authentication, PRF key derivation, and session management.
- **Phase 3:** Vault coordination API, PostgreSQL schema, RLS, and tamper-proof Merkle event chain.
- **Phase 4:** Background scheduler (`pg-boss`), escalating reminders, and 30-day challenge window state machine.
- **Phase 5:** `release-signer` enclave microservice with multi-clock verification and event validation.
- **Phase 6:** Accessible Web UI, strict CSP, reproducible Docker builds, and open-source release readiness.

