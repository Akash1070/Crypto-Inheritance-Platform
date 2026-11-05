# UX, Content, and Recovery Flows

## 1. Tone

Calm, plain language, factual, and non-alarmist. The user is making a high-consequence plan. Do not use countdown panic, fear-based prompts, dark patterns, or claims that the app can detect death.

Preferred phrases:
- “Inheritance plan”
- “Trusted guardian”
- “Check-in overdue”
- “Owner unresponsive”
- “Recovery instructions”
- “Offline recovery kit” (future)

Avoid:
- “Death confirmed”
- “Guaranteed inheritance”
- “Recover lost crypto instantly”
- “Your crypto is safe forever”
- “Unhackable”

## 2. Owner onboarding

1. Explain what the service does and does not do.
2. State plainly: “Never enter your seed phrase, private key, wallet password, or hardware wallet PIN here. We will never ask for them.”
3. Create account with strong authentication.
4. Create plan and add wallet inventory using public metadata only.
5. Add heirs/executor and at least three independent guardians (exact minimum subject to protocol/UX decision).
6. Explain guardian role and possible collusion. Obtain explicit confirmation from each guardian.
7. Set check-in cadence and long grace period; show a calendar preview with exact dates/timezone.
8. Generate emergency-cancel code; show once, require user to confirm they saved it offline. Do not offer email delivery of the code.
9. Export the plan and perform a simulated drill.
10. Show a setup completion checklist; do not mark “inheritance ready” until the drill is completed.

## 3. Guardian onboarding

- Show who invited them and which role they have.
- Explain they are not receiving ownership, custody, or authority to move funds.
- Explain how to recognize fake invitations and that support will never request secrets.
- Require strong authentication and explicit acceptance.
- Encourage the owner to verify identity using an out-of-band channel before distributing any future physical shares.

## 4. Check-in flow

- Remind before due date.
- Reminder links should take the user to the canonical domain, but must not perform check-in solely by GET request.
- Require authenticated action for check-in; anti-CSRF protection for state change.
- Show next check-in date and timezone after success.
- Send a separate receipt/notification without sensitive details.

## 5. Missed-check-in flow

1. First reminder before due date.
2. Due-date notice.
3. Several post-due reminders over distinct days/channels.
4. Long configured grace period begins.
5. Owner receives repeated “cancel / check in” instructions.
6. Guardians receive a neutral request to attempt contact only after the defined stage.
7. Guardians can record limited attestations; they cannot declare death or move funds.
8. If a quorum is reached, the service records an “inactivity notice” and shares the owner-provided human instructions according to the explicit plan permissions.
9. The interface repeats that this is not proof of death and does not cryptographically block guardians who already have enough shares.

The owner can cancel with passkey or the offline emergency code before the disclosed cutoff. The platform must not silently shorten the delay after an outage or migration.

## 6. Recovery education

Every plan and exported guide must include:
- Never enter a seed phrase into a website, form, chat, email, or support ticket.
- Use the hardware wallet vendor's official recovery instructions and verify the domain independently.
- Be suspicious of paid “recovery experts,” impersonators, remote-access requests, and urgent demands.
- Do not send a seed phrase or threshold share to one person over email/chat.
- Confirm the executor/guardian identity through an independent channel.
- Use an offline recovery tool obtained from a verifiable release source.
- If the owner used multisig, identify the policy, number of signers, wallet software, and where each signer is; do not assume a single seed phrase is sufficient.

## 7. Recovery drill

The drill must use dummy wallet labels and synthetic test secrets. The user should prove they can:
- export the plan;
- identify each guardian role;
- locate the owner's offline copy (without typing the location into the service);
- simulate a missed check-in;
- cancel using the emergency code;
- complete a guardian review;
- explain why the app cannot prove death or guarantee recovery.

Future crypto-tool drill must additionally reconstruct a test DEK, decrypt a test package offline, and confirm the recovered text matches the known test vector.

## 8. Sensitive copy examples

**MVP secret warning:**

“Do not enter a recovery phrase, private key, wallet password, or device PIN. This service does not need them. Anyone who asks you to paste one into a website or chat may be trying to steal your funds.”

**Missed check-in warning:**

“A missed check-in does not mean the owner has died. It means the service has not received a check-in. The owner may be travelling, offline, or unable to access the account. Follow the contact and waiting procedure before taking any further action.”

**Guardian-share warning (future):**

“Anyone who obtains enough valid shares and the encrypted recovery package may be able to recover it before the planned date. The check-in system coordinates people; it does not cryptographically prevent early access. Only accept this role if you understand and agree to that responsibility.”
