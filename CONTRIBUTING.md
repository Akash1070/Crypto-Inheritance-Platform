# Contributing to Crypto Inheritance Platform (CIP)

Thank you for your interest in contributing to the Crypto Inheritance Platform. Real estates, family continuity, and sovereign wealth depend on this software. For this reason, our security and architecture standards are rigorous.

---

## 1. Core Engineering Principles

1. **Correctness Outranks Speed:** We never rush code into master. Security proofs, mathematical soundness, and defense-in-depth come before feature velocity.
2. **Two-Tier Secret Separation ([ADR-0001](docs/adrs/ADR-0001-two-tier-secret-separation.md)):**
   - `apps/web` and `apps/api` must **NEVER** import or execute cryptographic secret operations.
   - Any raw seed phrases, private keys, or plaintext threshold shares must remain exclusively in `packages/crypto-core` and the offline CLI (`packages/cli`).
   - Linting and Semgrep rules will fail any pull request that attempts to import `libsodium-wrappers-sumo`, `@noble/*`, or Node `crypto` inside `apps/web` or `apps/api`.
3. **No Homemade Cryptography ([ADR-0002](docs/adrs/ADR-0002-cryptographic-suites.md)):**
   - Never invent new encryption algorithms, unauthenticated modes, custom curves, or proprietary Shamir math.
   - Use only vetted implementations with constant-time verification.
4. **Passkeys Only ([ADR-0003](docs/adrs/ADR-0003-passkey-identity.md)):**
   - WebAuthn FIDO2 resident keys are required. Email and SMS are strictly for notifications, never proof of liveness.
5. **Fail-Closed Releases ([ADR-0004](docs/adrs/ADR-0004-isolated-enclave-release.md)):**
   - The enclave microservice must remain strictly under 1,000 LOC with zero outbound internet egress and independent multi-clock time verification.

---

## 2. Development Setup

### Prerequisites
- Node.js `v22.0.0+`
- pnpm `v10.0.0+`
- Git with GPG/SSH commit signing enabled

```bash
# Clone the repository
git clone https://github.com/crypto-inheritance-platform/crypto-inheritance-platform.git
cd "crypto inheretence platform"

# Install monorepo dependencies
pnpm install

# Run automated test suites across all packages
pnpm test

# Run strict TypeScript typecheck
pnpm typecheck

# Run linter
pnpm lint
```

---

## 3. Pull Request Guidelines

1. **Branch Naming:**
   - `feat/feature-name`
   - `fix/bug-fix-name`
   - `refactor/scope-description`
   - `docs/topic-name`

2. **Commit Conventions:**
   We enforce [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat(crypto-core): add KAT test vectors for RFC 8439`
   - `fix(worker): handle clock drift in countdown evaluator`
   - `chore(deps): update simplewebauthn`

3. **Coverage Standards:**
   - Any PR modifying `packages/crypto-core` must maintain **100% line coverage**.
   - All other packages require unit and integration tests covering positive and negative edge cases.

4. **Security Review:**
   Every PR is automatically checked against:
   - Secret scanning (`gitleaks`)
   - Static analysis (`semgrep`)
   - Architecture boundary enforcement (`eslint` restricted imports)

---

## 4. Reporting Security Vulnerabilities

Please **do not** open public issues for security vulnerabilities. Instead, follow the coordinated disclosure policy in [SECURITY.md](SECURITY.md).

