# 06 — Design (UX, Content, Visual System)

## 1. Design principles
1. **Calm, not clever.** Users are thinking about death and money. No gamification, no jokes, no urgency tricks.
2. **Plain language.** Never say "seed phrase" without explaining it once. Never say "Shamir" or "KDF" in the UI.
3. **Honest about limits.** Say what we can and cannot do ("We cannot recover your vault. Nobody can.").
4. **Make the safe path the easy path.** Defaults are the conservative ones.
5. **Rehearsal builds trust.** Dry-run is a first-class feature.
6. **Accessible for older users.** Large type, high contrast, one task per screen.

## 2. Visual system
- Tone: trustworthy, warm, modern. Palette: deep navy / ink (#0F1B2D), warm paper (#FAF7F2), soft teal accent (#1F8A8A), amber warning (#B7791F), red danger (#B42318). Check contrast ≥ 4.5:1 (7:1 for body text where feasible).
- Type: system font stack or self-hosted Inter/Source Serif 4. Body ≥ 17px, headings in serif for warmth.
- Spacing scale 4/8/12/16/24/32/48. Radius 12. Soft shadows. Generous whitespace.
- Icons: one outline set (Lucide). No stock photos of people or skulls/hourglasses.
- Motion: minimal; respect `prefers-reduced-motion`.
- Dark mode supported.
- Use the `frontend-design` skill for distinctive look; do not use default template look.

## 3. Information architecture
Owner app: Home (status + next check-in) · My Pack · Heirs · Check-in settings · Security (passkeys, devices, audit log) · Dry-run · Help.
Heir app: Landing "Someone you know has left you something" · Verify (passkey) · Status (waiting / challenge) · Recovery guide · Move your funds safely.

## 4. Key flows (screen-level)

### 4.1 Owner onboarding (target ≤ 15 min)
1. Welcome: what Heirkey is/is not (3 bullet cards). "We never see your information."
2. Create passkey #1 (explain: Face/Touch ID or security key). Create passkey #2 (another device or key). Block progress until 2.
3. Choose security phrase (anti-phishing).
4. Build your Legacy Pack, guided cards: "Where is your crypto?" (hardware wallet / exchange / app / other), each card gives plain prompts and examples. Warn if seed-phrase-like text detected: "Writing your seed phrase here is possible, but safer is to describe where it is stored. Learn why."
5. Add an heir: name, email, relationship. Choose when they learn about the pack (default: only if you stop checking in).
6. Set check-in rhythm (default every 90 days) and a trusted contact.
7. Print Emergency Kit (PDF) and confirm "I stored it safely" with a quiz question (not a checkbox).
8. Dry-run offer (recommended). Then Activate.

### 4.2 Check-in
One big button "I'm here" + passkey prompt. Success screen shows next date. Email says: "Open Heirkey and tap I'm here. This email link alone cannot confirm you are okay." Copy must explain why.

### 4.3 Heir flow
Gentle, short, no jargon. Steps: (1) "We're sorry. Here is what you need to know." (2) Verify with passkey (or create one with the Heir Kit). (3) If in waiting period: show countdown and reason ("This waiting period protects the owner in case this is a mistake."). (4) Release: guided reveal of pack in sections; "Copy" buttons clear clipboard after 60 s. (5) "Before you touch any funds" checklist: use clean device, move funds to a new wallet, never share the words, beware scams.

### 4.4 Challenge window cancel (owner)
Any login shows a red banner "Someone started a claim on {date}. If this is a mistake, cancel it." with passkey-confirm. All channels notified.

### 4.5 Rotate keys, remove heir, pause (vacation mode)
Each has a plain explanation of consequences and a final confirm with passkey.

## 5. Content and microcopy rules
- Reading level grade 6–8. Short sentences. Active voice.
- Never imply guarantees ("100% safe"). Use "designed so that…".
- No fear marketing. Facts and calm reassurance.
- Every destructive or irreversible action states exactly what happens and what cannot be undone.
- Error messages: helpful but non-leaky (no account enumeration).
- Emails: no vault names, no amounts, no secrets; short; contain the anti-phishing phrase for owners; never a link that performs a state change.
- Translate via professional translators for legal-ish text.

## 6. Components to build
Passkey prompt card, step wizard, pack template cards, seed-pattern warning, heir card, check-in button, status timeline (ACTIVE → ... → RELEASED), countdown, hash-chain log viewer, kit download panel, danger-zone confirm dialog, toast (no sensitive content), empty states, help drawer.

## 7. Accessibility checklist
Keyboard operable; visible focus; labels; ARIA live for status changes; no time-limited tasks without extension; screen-reader tested; large touch targets (≥ 44px); plain-language alternative for every diagram; WCAG 2.2 AA tests in CI (axe).

## 8. Trust and safety UI
- Always show a small "What can Heirkey see?" panel: email, number of heirs, check-in dates. Not your pack.
- Visible release-state timeline and audit log.
- Link to source code, build hash, last audit report.
- Anti-phishing: security phrase on login; domain shown; guidance to bookmark.

## 9. Usability testing plan
5 non-technical owners + 5 non-technical heirs per round. Tasks: set up, check-in, simulate death + claim, recover with platform offline. Success metrics in doc 01. Record only with consent; never use real secrets.

## 10. Design deliverables for the agent
Design tokens file, component library in `packages/ui`, Storybook with a11y addon, screenshots in CI for visual regression (fake data only).
