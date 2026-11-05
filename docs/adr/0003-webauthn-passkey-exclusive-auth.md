# ADR-0003: WebAuthn Passkey Exclusive Authentication (No Passwords or SMS)

## Status
Accepted

## Context
Standard authentication mechanisms in web applications (passwords, email magic links, SMS OTPs) introduce fatal security vulnerabilities when applied to an inheritance platform:
1. **Passwords:** Vulnerable to credential stuffing, phishing, brute force, and credential reuse across breaches.
2. **SMS OTPs:** Highly susceptible to SIM-swapping, SS7 interception, and social engineering against mobile carriers.
3. **Email Links as Liveness:** In estate and inheritance scenarios, a deceased owner's smartphone or email inbox is frequently accessed by surviving family members, executors, or caregivers. **Email clicks can never prove liveness**, as an authorized or unauthorized party with access to the owner's laptop can click "I am alive" to perpetually prevent the legitimate heirs from recovering assets.

## Decision
We enforce **FIDO2 / WebAuthn Hardware Passkeys exclusively** for owner and heir authentication:

### 1. Phishing-Resistant Resident Keys
- Passkeys are cryptographically bound to the application's origin (domain name). DNS spoofing or lookalike phishing domains cannot obtain or replay the challenge signature.
- Hardware authenticator (YubiKey, Apple Touch ID/Face ID, Windows Hello, Android Biometrics) signs a fresh cryptographic server challenge.

### 2. Minimum Two Registered Passkeys
- To prevent permanent account lockouts due to device loss, the platform enforces registering a minimum of **two distinct passkeys** during onboarding (e.g., Primary Laptop/Phone + Backup YubiKey / Hardware Token).

### 3. WebAuthn PRF (Pseudo-Random Function) Extension
- Where supported by the client browser/OS authenticator, the WebAuthn PRF extension is used to derive client-side symmetric wrapping keys for local session data without exposing the underlying master secret to JavaScript.

### 4. Step-Up Authentication for High-Risk Actions
- Adding/removing heirs, modifying grace periods, unpausing a vault, or cancelling an heir's claim requires a fresh biometric/passkey assertion within 5 minutes.

### 5. Email as Notification Only
- Email and SMS are strictly communication channels for notifications and escalation alerts. They possess **zero authority** to prove liveness, approve transactions, or execute estate release.

## Consequences
- Total immunity against phishing, credential stuffing, and SIM-swapping attacks.
- Prevents false-liveness claims from family members reading the deceased's inbox.
- Eliminates password storage, hashing database overhead, and password reset attack vectors.

