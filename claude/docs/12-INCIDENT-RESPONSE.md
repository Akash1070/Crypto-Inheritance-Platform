# 12 — Incident Response

Assume a serious incident will happen. The goal is containment, honesty, and protecting users' secrets and funds.

## 1. Severity
| Sev | Examples | Response |
|---|---|---|
| SEV0 | Evidence of early release, plaintext exposure, `release-signer`/KMS compromise, malicious JS served | Immediate all-hands, freeze releases, user notice within hours |
| SEV1 | Auth bypass, state-machine bug that could release early, dependency compromise in prod, DB breach | Within 1 h |
| SEV2 | Availability outage, check-in/reminder failures | Within 4 h |
| SEV3 | Minor vulnerabilities, non-sensitive leaks | Next business day |

## 2. Roles
Incident Commander (Akash initially), Security lead, Comms lead, Scribe. Maintain an on-call list and out-of-band contact method (not dependent on company email).

## 3. Kill switches (build these, rehearse them)
1. **Global release freeze:** disables `release-signer` decrypts (KMS key disabled), keeps everything else running. Fails closed.
2. **Web bundle freeze/rollback** to last verified hash; takedown of the active CDN object.
3. **Auth freeze** on step-up/claims.
4. **Notification kill** to stop mass-mailing in a phishing scenario.
Each has a documented, tested procedure and needs two approvers except the release freeze, which any on-call can trigger.

## 4. Playbooks
### A. Suspected malicious web bundle
Freeze/rollback bundle → compare hash to signed release → rotate deploy credentials and CI tokens → forensic copy → publish notice: advise users not to enter data until all-clear; users who logged in during window should rotate VK ("Rotate keys" feature) and re-create passkeys if instructed → postmortem.

### B. Release-signer or KMS anomaly
Release freeze → disable KMS key versions as needed → review decrypt logs → identify any released vaults → notify those owners/heirs → rotate escrow keys and re-wrap escrow shares (requires owner clients; plan "rotate escrow key" flow) → external forensic review.

### C. Database breach
Confirm only ciphertext/metadata exposed → rotate secrets → notify users and regulators per law (DPDP/GDPR windows) → warn of phishing → assess metadata exposure (emails, relationships).

### D. Dependency compromise
Freeze deploys → identify affected versions via SBOM → pin/replace → rebuild → verify hashes → check runtime for IOCs → notify.

### E. Fraudulent claim attempt
Alert owner on all channels → extend challenge window by policy → preserve evidence → block abusive heir identity → review logs for pattern.

### F. Platform shutdown (planned or forced)
Notify all users 90+ days ahead → ensure continuity escrow releases/exports → provide data export → publish final open-source release and recovery docs.

## 5. Communication
Be early, factual, and plain. Template: what happened, who is affected, what we do, what you should do, when next update. Never blame users. Publish postmortem within 14 days.

## 6. Evidence and forensics
Immutable logs (WORM storage), time-synced; preserve disks/snapshots; chain of custody; engage external forensic firm for SEV0/SEV1; coordinate with law enforcement as counsel advises.

## 7. Drills
Quarterly tabletop; yearly full drill including killing release-signer and rebuilding from scratch; test that the Heir Kit path still works.

## 8. Metrics
Time to detect, time to contain, time to notify, number of affected vaults, follow-up actions closed.
