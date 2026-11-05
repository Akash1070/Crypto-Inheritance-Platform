# Security Threat Model

**Classification:** Critical-risk financial recovery product. Revisit this document for every architecture change.

## 1. Security objectives

1. Prevent the platform, its operators, or a single compromised account from obtaining usable wallet secrets.
2. Prevent an attacker from taking over an owner account, replacing guardians, or triggering false inactivity events.
3. Prevent unauthorized disclosure of sensitive wallet inventory, family relationships, and estate instructions.
4. Prevent loss of recovery availability through accidental deletion, bad migrations, invalid shares, or service shutdown.
5. Preserve integrity and auditability of check-ins, approvals, and plan changes.
6. Make limitations and trust assumptions legible to non-technical users.

## 2. Assets

### MVP assets

- Owner identity and account authentication credentials.
- Wallet inventory, public addresses, wallet/device details, and private instructions.
- Heir, executor, and guardian identities and contact data.
- Check-in history, status, due dates, cancellation data, and guardian attestations.
- Invitation tokens, session credentials, emergency-cancel code verifier.
- Audit logs, exports, backups, deployment credentials, source code, CI artifacts.

### Future crypto-tool assets

- Plaintext recovery package (seed/private key may be included by the user in the offline tool only).
- Data-encryption key (DEK), threshold shares, passphrases, recipient private keys, nonces, salts, ciphertext, format metadata.
- Offline tool source/build artifacts and release signing keys.

## 3. Adversaries

- External attacker targeting accounts, APIs, cloud infrastructure, or notification channels.
- Phisher/social engineer impersonating platform support, owner, guardian, or heir.
- Malicious or compromised guardian(s).
- Abusive family member or coercive partner attempting premature access.
- Malicious insider, support agent, developer, or compromised maintainer account.
- Compromised CI/CD, dependency, package registry, browser extension, or hosting provider.
- Malware on the owner's or guardian's device.
- Opportunistic attacker exploiting public wallet metadata.
- Ransomware, data loss, provider shutdown, or natural disaster.

## 4. Trust boundaries

1. Owner device/browser ↔ hosted frontend.
2. Frontend ↔ API.
3. API ↔ database.
4. API ↔ notification vendor.
5. Owner ↔ guardian / heir (human trust boundary).
6. Hosted service ↔ external storage of encrypted recovery package.
7. Guardian physical/offline share ↔ offline recovery tool.
8. Source repository ↔ CI/build artifacts ↔ production deployment.

The future offline tool is a separate boundary. Do not assume that isolating cryptographic operations in a frontend component is equivalent to an offline tool.

## 5. MVP abuse cases and controls

| Abuse case | Impact | Required controls / tests |
|---|---|---|
| Account takeover | Attacker changes plan or guardian list | Passkeys, re-authentication, session controls, notifications, cooling-off period, anomaly alerts |
| Guardian replacement attack | Attacker adds accomplice and removes real guardian | Owner re-auth, alert old guardians, delay, audit history, cancel path |
| Insecure direct object reference | Guardian sees another plan | Server-side tenant checks on every read/write; negative authorization tests |
| Invitation token theft | Unauthorized guardian acceptance | High-entropy single-use token, short expiry, recipient binding, verifier-only storage |
| Cancel-code brute force | Attacker cancels or manipulates event | Uniform high entropy code, rate limits, one-time rotation, generic errors, alert owner |
| False inactivity trigger | Living owner is treated as unresponsive | Long grace, multiple reminders/channels, passkey/cancel code, no death assertion, no automatic transfer |
| Scheduler replay/race | Timeline advances early or multiple times | Idempotency, transaction/row lock, monotonic state version, clock tests |
| Notification account compromise | Phishing or metadata leak | Minimal content, authenticated domain, no secrets/addresses in messages, vendor review |
| Admin abuse | Insider sees or alters plans | Least privilege, just-in-time access, audited access, no secret override, separation of duties |
| Service outage/shutdown | Heirs cannot find instructions | Export, offline copy, published service shutdown plan |
| Metadata breach | Family/wallet relationships exposed | Data minimization, private-by-default, encryption at rest, retention limits, access logs |
| XSS / malicious dependency | Browser data exfiltration | Strict CSP, no third-party scripts, dependency pinning, SAST, DAST, code review, no secrets in MVP |

## 6. Future crypto-tool abuse cases

| Abuse case | Impact | Required controls / tests |
|---|---|---|
| Malicious hosted JS captures seed | Total asset loss | Never handle secrets in hosted web app; offline signed build; independent source/build verification |
| Weak RNG | Predictable DEK or shares | OS CSPRNG only; fail if unavailable; test RNG API failure; no custom PRNG |
| Wrong AEAD/nonce handling | Forgery or key compromise | Standard AEAD implementation, unique nonce policy, test vectors, misuse-resistant design review |
| Custom Shamir bug | Shares leak secret or cannot recover | No custom implementation; standard and maintained implementation; interop tests; cryptographer review |
| Share threshold misunderstanding | Too few shares or premature collusion | Simulations, explicit diagrams, acknowledgement, recovery drill |
| Share copied to cloud/email | Premature access | Offline/physical distribution guidance; no email/SMS transmission; clear warnings |
| Ciphertext tampering | Corrupted or malicious recovery data | AEAD authentication, versioned envelope, fail closed |
| Format downgrade | Weak algorithm accepted | Versioned suite allow-list; reject unknown/weak suites; authenticated metadata |
| Tool substitution | Fake decrypt tool steals shares | Signed releases, pinned source, checksums, reproducible-build goal, offline docs |
| Long-term key compromise | Previously stored ciphertext exposed | Key rotation guidance, re-encryption, documented retention; acknowledge no forward secrecy for static offline bundles |
| Memory remnants | Secret recovered from process memory | Minimize lifetime/copies; native implementation review; best-effort zeroization; honest limits |

## 7. Fundamental limits — must appear in product UX

- **No proof of death:** silence is not evidence of death.
- **No cryptographic release gate from social quorum:** if guardians already possess a threshold of shares and ciphertext is available, they can collude early. The web app cannot stop that.
- **No revocation of copied secrets:** replacing guardians does not erase a share already copied or photographed. Rotation requires creating a new DEK, re-encrypting the package, and redistributing all new shares; old materials must be treated as compromised.
- **No recovery from missing entropy:** if too many shares or the only ciphertext package are lost, no service can reconstruct the wallet secret.
- **No protection from a compromised endpoint:** an infected device can capture data at the moment the owner uses it.
- **No guarantee from open source alone:** users must still verify the binary/build they run; hosted website code can differ from public source.

## 8. Risk methodology

Rate likelihood and impact as Low/Medium/High/Critical. Any path to unauthorized wallet-secret disclosure or signing is Critical. Any single-account path to change quorum or falsely initiate a final handover is High until mitigated. No Critical/High issues may be accepted for production launch without a documented executive risk owner and independent reviewer; Critical issues are release blockers.

## 9. Required threat-model review triggers

- New data field or file upload.
- New analytics, notification, auth, hosting, or storage provider.
- Any key, password, share, passkey-PRF, or encryption code.
- Guardian quorum, check-in, grace period, or cancellation changes.
- Any smart contract or wallet connection.
- New admin/support permissions.
- Cryptographic format, dependency, or release pipeline change.
