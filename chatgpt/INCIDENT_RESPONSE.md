# Security Incident Response Plan

## 1. Objectives

Contain harm, preserve evidence, communicate accurately, and avoid making a breach worse through rushed key or account operations. Never ask a user to send a seed phrase to support.

## 2. Severity classes

- **SEV-1:** evidence or credible suspicion of recovery-secret exposure, unauthorized access to many plans, compromised release/build pipeline, malicious production deploy, or integrity failure that can trigger false handover events.
- **SEV-2:** targeted account takeover, guardian/quorum manipulation, material personal-data exposure, or service compromise with limited scope.
- **SEV-3:** limited operational incident without evidence of sensitive data exposure or integrity compromise.

## 3. First response checklist

1. Declare incident commander and open a restricted incident channel.
2. Preserve logs, deployment hashes, CI artifacts, DB audit records, and relevant network evidence.
3. Stop the affected feature or deployment using a pre-tested kill switch; do not delete evidence.
4. Disable compromised credentials and tokens; rotate infrastructure secrets from a clean environment.
5. Determine what data was actually accessible, not merely what the system intended to store.
6. If any future recovery material may be compromised, assume all related copies/shares are compromised. Advise owners to rotate by generating a new DEK, re-encrypting, and redistributing shares using verified tools. Never claim remote deletion revokes copied shares.
7. Preserve the owner cancellation and export paths where safe; do not disable them without a documented reason.
8. Notify affected users and authorities as required by applicable law and contractual commitments.
9. Publish a factual status update that separates confirmed facts from unknowns.
10. Complete root-cause analysis and corrective actions before re-enabling the affected feature.

## 4. Suspected key exposure

- Do not request the user's seed phrase or key for investigation.
- Do not ask the user to paste secrets into a support tool, form, email, or ticket.
- Provide a verified, independently sourced wallet-vendor recovery guide where appropriate.
- Recommend moving assets only through the user's own trusted wallet process and after independent verification; do not generate a destination address or transaction for them.
- Treat potentially exposed shares and ciphertext as compromised according to the protocol's rotation plan.
- Do not say funds are safe until the owner has completed an independently verified recovery/rotation process.

## 5. Communications

Incident notices must state: what happened, when it was detected, what data was affected, what is not known, actions taken, what the user should do, how to verify official communication, and how to report suspicious contact. Use the canonical domain and publish signed or otherwise verifiable advisories where feasible.

## 6. Tabletop exercises

Run at least twice yearly and before Phase 2 launch:
- malicious dependency shipped in frontend;
- production API accidentally logs a secret-like test payload;
- guardian account takeover;
- owner falsely flagged overdue during notification outage;
- database backup corruption;
- signing key / release artifact compromise;
- suspected compromise of one or more recovery shares.

## 7. Post-incident

Publish a redacted postmortem, identify systemic causes, add regression tests, update threat model and docs, and track actions to closure. Do not blame the user for being deceived by a product or process weakness.
