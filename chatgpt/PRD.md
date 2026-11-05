# Product Requirements Document (PRD)

**Status:** Draft for discovery and architecture review. Not authorization to handle real keys.

## 1. Objective

Build an open-source, non-custodial application that helps a self-custody holder prepare an understandable inheritance plan, appoint trusted contacts, maintain periodic check-ins, and notify the right people after an extended period of unresponsiveness.

The first production release must not accept, process, or store seed phrases, private keys, wallet passwords, PINs, threshold shares, or plaintext recovery bundles.

## 2. User stories

### Owner

- As an owner, I can create a private inheritance plan without connecting a wallet or exposing a secret.
- I can record wallet labels, public addresses, chain/network, wallet software, device model, and recovery instructions.
- I can identify heirs, an executor, and separate guardians, and define each person's responsibility.
- I can set a check-in interval and a long grace period.
- I receive reminders on more than one channel and can confirm that I am active.
- I can cancel an overdue process using a passkey or a separate high-entropy emergency-cancel code.
- I can export my plan in a documented format and delete my account/plan subject to disclosed retention obligations.
- I can run a test drill that does not expose or move real assets.

### Guardian

- As a guardian, I can accept an invitation, verify the owner and my assigned role, and read my responsibilities.
- I can see only the information necessary for my role.
- I can acknowledge a contact attempt or attest that I cannot reach the owner; I cannot declare death.
- I am warned that holding enough recovery shares may allow recovery before an inactivity event if I also obtain the encrypted package.
- I can export my acknowledgement history, but I cannot download secret material from the hosted app in MVP.

### Heir / executor

- I can receive a human-readable plan and understand who to contact.
- I can identify wallets and required devices/software without being asked to enter a seed phrase into a website.
- I receive explicit anti-phishing and safe-recovery instructions.

### Maintainer / operator

- I can operate the service without access to wallet secrets.
- I can audit redacted state transitions and notifications.
- I cannot override the owner, change guardian quorum, decrypt a vault, or transfer funds.

## 3. MVP scope (must-have)

1. Account creation and strong authentication (passkey/WebAuthn preferred; secure fallback documented).
2. Owner profile and inheritance plan.
3. Wallet inventory with public metadata only.
4. Heir, executor, and guardian roles with least-privilege visibility.
5. Guardian invitation and acceptance workflow.
6. Check-in schedule with reminder window, overdue state, configurable grace period, and guardian review.
7. Emergency cancellation using owner authentication or a separate high-entropy offline cancel code.
8. Notification delivery with retries, rate limits, delivery status, and no secrets in messages.
9. Readable and machine-readable export of the plan.
10. Test/drill mode clearly separated from live status.
11. Account deletion and data retention controls.
12. Security event log with redaction and tamper-evident event sequence (within the limits of the selected backend).
13. Accessibility, mobile-first layout, plain-language explanations, and multilingual-ready copy.

## 4. Explicitly out of scope for MVP

- Seed phrase, raw private key, wallet password, hardware-wallet PIN, or secret-share input.
- Wallet connection that can request transaction signatures.
- Any custodial key management, key escrow, admin recovery key, server-side decryption, or recovery concierge.
- Automated transfer, signing, sweeping, trading, staking, or smart-contract execution.
- On-chain death oracle or proof-of-death claim.
- Public publishing of wallet addresses or guardian relationships.
- Token, NFT, DAO, or paid recovery marketplace.
- AI parsing of uploaded screenshots or seed phrases.
- Sending seed phrases or shares over email, SMS, chat, or support tickets.

## 5. Functional requirements

### FR-01 Private plan

The owner can create, edit, version, export, pause, and delete a plan. Changes to guardians, notification destinations, check-in schedules, and recovery instructions must be authenticated and audited.

### FR-02 Wallet inventory

Each wallet record may include: user label, chain/network, public address, wallet app, hardware wallet model, account index/derivation notes, multisig policy description, and safe recovery instructions. It must reject known mnemonic/private-key formats in fields designed for labels or addresses and show a warning if pasted text resembles a secret. Do not log the rejected value.

### FR-03 Role separation

Roles: owner, guardian, heir, executor, and service operator. The same person may hold multiple roles only with a visible conflict warning. A guardian cannot change the owner’s plan or quorum. Operators cannot impersonate an owner or guardian.

### FR-04 Guardian verification

Invitations must be bound to an intended recipient. Acceptance requires strong authentication and a confirmation step that shows the plan owner's identity and the guardian's duties. Changing a guardian requires owner re-authentication, notification to existing guardians, and a configurable cooling-off period.

### FR-05 Check-ins

The owner configures a reasonable cadence and a grace period. The system sends reminders before and after due time. State transitions use server-side time and a transactional state machine. Duplicate or replayed events must not shorten the configured timeline.

### FR-06 Emergency cancellation

The owner can cancel a pending process using a passkey or a separate high-entropy cancel code that is generated once and shown only at setup/rotation. Store only a keyed/hash verifier suitable for a uniformly random code; never store the plaintext. The code must not be a memorable low-entropy phrase. Rotation invalidates the previous code and notifies the owner.

### FR-07 Guardian review

After the grace period, guardians may record contact attempts and attest only to “unable to reach owner” or “owner contacted me.” A quorum changes the coordination status, not legal status or cryptographic access. The event must remain reversible until the plan's disclosed final notification stage. No automated asset movement occurs.

### FR-08 Export

Owner can export all plan data in documented JSON and human-readable PDF/print format. Export includes schema version and creation timestamp. The export must not silently include credentials or secrets because none should be stored.

### FR-09 Audit events

Record actor, action, target object, timestamp, result, request correlation ID, and relevant before/after non-secret state hashes. Never record message bodies containing private notes unless explicitly approved; never record secret material.

### FR-10 Recovery drill

The test flow uses fake wallet data and synthetic secrets only. It tests roles, instructions, timeouts, cancellation, and export. It must be visually impossible to confuse a drill with a live inheritance plan.

## 6. Non-functional requirements

- Security: target OWASP ASVS 5.0 Level 2 baseline for the web app, with a risk-based Level 3 control set for authentication, authorization, data protection, and auditability. Independent review required before launch.
- Privacy: collect minimal personal data; no third-party advertising or session replay.
- Availability: documented RPO/RTO for plan metadata and notifications. Availability must not be marketed as a guarantee of crypto recovery.
- Portability: open export format; hosted service is not required for offline recovery.
- Accessibility: WCAG 2.2 AA target for owner/guardian critical flows.
- Usability: a non-technical participant must complete a supervised test drill without being asked to reveal a wallet secret.
- Maintainability: documented state machine, data model, threat model, migration strategy, and dependency inventory.

## 7. Acceptance criteria / launch blockers

- No API, DB schema, telemetry, log, support, or analytics path accepts secret fields.
- Server-side authorization tests cover every owner/guardian/heir/operator object boundary.
- Account takeover, guardian swap, notification failure, replay, and delayed check-in scenarios are tested.
- Emergency cancellation works after owner device loss using the offline code.
- A user can export a plan and understand how to act if the hosted service shuts down.
- The test drill has been run by at least 10 people who are not developers; critical comprehension failures are fixed.
- External penetration test is completed; no open Critical/High issue.
- Privacy/legal review is complete for initial launch jurisdictions.
- Incident response and security contact are published.

## 8. Future encrypted recovery-kit requirements (not MVP acceptance)

- Recovery package is encrypted locally/offline using a versioned, authenticated format.
- DEK is random, not derived only from a user-chosen password.
- Threshold shares use a standard and a reviewed, maintained implementation; no custom Shamir code.
- Shares are distributed separately and stored outside the hosted service.
- A full end-to-end recovery drill reconstructs the package without network access.
- Documentation explains that share holders can collude early; the hosted inactivity trigger is not a cryptographic time lock.
- A recovery package can be decrypted with a pinned open-source tool after service shutdown.
- Independent cryptographer signs off on the protocol and implementation before feature enablement.
