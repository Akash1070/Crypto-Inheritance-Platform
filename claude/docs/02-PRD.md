# 02 — Product Requirements Document (PRD)

Status: v0.1 draft. Owner: Akash. Working name: Heirkey.

## 1. Summary
Heirkey lets a crypto holder create an encrypted **Legacy Pack** that only their chosen **heirs** can open, only after the holder is gone, and which Heirkey itself can never read.

## 2. Personas
| Persona | Description | Needs |
|---|---|---|
| **Owner (Meera, 45)** | Holds BTC/ETH on a hardware wallet and an exchange. Not technical. Worried about family. | Simple setup, no jargon, confidence it is safe, no accidental release |
| **Heir (Rohan, 30)** | Spouse/child/sibling. Not a crypto user. Grieving. | Clear steps, calm tone, works even if he is not technical |
| **Guardian (optional)** | Trusted friend/lawyer who confirms events | Minimal effort, cannot access anything alone |
| **Power owner (Dev, 35)** | Technical, multi-chain, multisig | Advanced options, open source, self-host, verifiable |
| **Attacker** | See threat model | Must fail |

## 3. Scope
### In scope (MVP, Milestones M0–M6)
- Account with passkeys (no passwords).
- Create a Legacy Pack: structured fields + free text + optional file attachments (small), encrypted client-side.
- Add heirs (invite via email; each heir sets their own passkey and gets their own Heir Kit).
- Check-in schedule, escalating reminders, trusted-contact notices.
- Trigger engine: inactivity → pending → heir claim → challenge window → release.
- Heir recovery flow in browser and with an offline CLI.
- Printable/downloadable **Heir Kit** (PDF + encrypted file + instructions).
- Dry-run mode: owner and heir rehearse recovery with a fake pack.
- Audit log visible to the owner (client-verifiable hash chain).
- Self-host docs (Docker compose).

### Out of scope for MVP
Custody of funds; token; custom smart contracts; fiat payments to heirs; legal will generation; mobile apps (PWA only); AI features that see user content.

### Phase 2 (after external audit)
Guardians / Fortress mode; Safe dead-man's-switch integration; Bitcoin Miniscript/Liana descriptor helper; native mobile apps; lawyer/executor portal.

## 4. Functional requirements
IDs are referenced by tests and ADRs.

### Accounts and auth
- FR-A1 Passkey (WebAuthn) sign-up and sign-in; no passwords stored.
- FR-A2 At least two passkeys required before a vault can be activated (device loss resilience).
- FR-A3 Account recovery never gives access to vault contents. It only restores ability to log in via a delayed, notified, multi-channel process.
- FR-A4 Session lifetimes short; sensitive actions require fresh passkey assertion (step-up).

### Legacy Pack
- FR-V1 Client generates all keys. Server never receives plaintext or keys.
- FR-V2 Templates: "Hardware wallet", "Exchange account", "Software wallet", "Multisig", "Other", each with plain-language prompts.
- FR-V3 Warn clearly when the user types something that looks like a seed phrase (BIP-39 word patterns) or private key; recommend instructions-only, allow override with explicit confirmation.
- FR-V4 Versioned pack; edits create a new version; previous versions remain only in owner's history (encrypted).
- FR-V5 Max pack size (e.g. 5 MB) to limit abuse.

### Heirs
- FR-H1 Add 1–5 heirs per vault; each heir has independent keys.
- FR-H2 Heir identity is bound to a passkey created by the heir; email alone is never enough.
- FR-H3 Heir learns a vault exists only at the time and level the owner chose (default: only after PENDING state).
- FR-H4 Owner can remove or replace a heir at any time; replacement rotates affected shares.

### Check-in and trigger
- FR-T1 Default interval 90 days (30–365). Reminders escalate across email, push, SMS (optional), trusted contact.
- FR-T2 Check-in requires a passkey assertion from the owner. Email/SMS links only open the app; they never count as proof of life.
- FR-T3 State machine: ACTIVE → REMINDING → PENDING → CLAIMED → CHALLENGE → RELEASED (also PAUSED, CANCELLED). See TRD.
- FR-T4 Vacation/medical pause: owner can pause for a set period with passkey.
- FR-T5 Heir may start a claim only in PENDING state.
- FR-T6 Challenge window (default 30 days, minimum 14). During it, any owner passkey login cancels the claim and returns to ACTIVE. All channels notified every 3 days.
- FR-T7 Release requires: state CHALLENGE elapsed + heir passkey step-up + (Fortress) guardian quorum.
- FR-T8 Release never happens due to a single human action at Heirkey (no admin override).

### Recovery
- FR-R1 Heir completes recovery in browser in under 10 minutes with guided steps.
- FR-R2 Heir Kit allows full offline recovery using the open-source CLI, with no Heirkey server, if the heir has the kit and the escrow share was released or exported (see Security Architecture "Continuity").
- FR-R3 Dry-run mode exercises the entire flow with a decoy vault.

### Transparency
- FR-X1 Owner-visible audit log (append-only, hash-chained, client-verifiable).
- FR-X2 Published web bundle hashes per release; `heirkey verify` CLI checks the running bundle against signed releases.

## 5. Non-functional requirements
- Security: see docs 04, 05, 08. ASVS Level 3 target for auth, crypto, and session sections.
- Availability: trigger and release jobs are idempotent, durable, and monitored. Target 99.9% for read paths; trigger engine must tolerate outages without early or lost release.
- Privacy: collect minimum data (email, optional phone). No analytics that identify users. No third-party trackers.
- Accessibility: WCAG 2.2 AA; works for older users; large text, high contrast.
- Localization-ready; English first, then Hindi, Gujarati, Portuguese, Spanish.
- Performance: pack create/open under 3 seconds on mid-range phone (Argon2id parameters tuned accordingly, see TRD).

## 6. User stories with acceptance criteria
**US-1 Owner creates a pack**
Given a new user, when they complete onboarding, then they have 2 passkeys, one pack, one heir invited, and a printed Emergency Kit, within 15 minutes in usability tests; and the network log shows no plaintext of pack contents.

**US-2 Owner checks in**
Given reminder received, when owner taps "I'm here" and completes passkey assertion, then the timer resets and the audit log records it. Clicking the email link alone does not reset the timer.

**US-3 Owner is gone**
Given no check-in for the interval + grace, then state becomes PENDING, heirs and trusted contacts are notified, and nothing is released.

**US-4 Heir claims**
Given PENDING, when heir proves identity with their passkey and starts a claim, then CHALLENGE begins and owner channels are notified. After the window with no cancel, heir completes recovery and sees the pack.

**US-5 Owner returns during challenge**
Given CHALLENGE, when owner signs in with passkey, then claim is cancelled, heirs are told, state returns to ACTIVE.

**US-6 Server compromised**
Given an attacker with full read access to the database and object storage, then they obtain only ciphertext and cannot decrypt any pack (verified by red-team exercise).

**US-7 Heir account phished**
Given an attacker controls heir's email only, then they cannot claim or recover (passkey required, plus escrow share requires CHALLENGE completion).

**US-8 Heirkey shuts down**
Given Heirkey is offline, then heirs with a Heir Kit can recover using the CLI per the documented continuity path.

## 7. Risks (product)
- Premature release anxiety → conservative defaults, long windows, dry-runs.
- Lost access anxiety → Heir Kit, continuity path, multiple heirs.
- Over-trust in the platform → clear in-product statement of what is and is not protected.
- Users store raw seeds → warnings, instructions-first templates, education.

## 8. Open questions (for Akash)
1. Primary launch market (India first or global)? Affects language, legal, payment.
2. Free tier limits.
3. Do you want Guardian (Fortress) mode in MVP or Phase 2? Recommendation: Phase 2.
4. Self-host only vs hosted + self-host? Recommendation: both.
