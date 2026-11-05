# Open Crypto Inheritance — Security-First Project Pack

> Working title only. This repository is a product and engineering blueprint, not a claim that the system is already safe for real funds.

## The product in one sentence

An open-source, non-custodial inheritance coordination system that helps self-custody wallet holders document what they own, appoint trusted people, prove they are still active, and prepare a recoverable handover without giving the platform access to wallet keys.

## The most important product decision

**The web application must not collect, process, transmit, log, or store seed phrases, private keys, wallet passwords, hardware-wallet PINs, or usable key shares.**

The first release is an inheritance-planning and coordination product. A later, separately reviewed offline recovery tool may create an encrypted recovery package and threshold shares. Do not collapse these two releases into one rushed implementation.

A compromised website can steal data typed into its forms. “Client-side encryption” does not make a live, remotely served JavaScript application safe from a malicious deployment, compromised dependency, injected script, browser extension, or XSS. High-value cryptographic operations need an offline, verifiable client and an independently reviewed protocol.

## Start here

1. Read [`DESIGN.md`](DESIGN.md), [`PRD.md`](PRD.md), [`TRD.md`](TRD.md), and [`SECURITY_THREAT_MODEL.md`](SECURITY_THREAT_MODEL.md).
2. Read [`CRYPTOGRAPHIC_DESIGN.md`](CRYPTOGRAPHIC_DESIGN.md) before proposing any cryptographic implementation.
3. Open the repository in Antigravity. It should discover `AGENTS.md`, `.agents/rules/`, and `.agents/skills/` automatically.
4. Paste [`prompts/00_INSPECT_AND_PLAN.md`](prompts/00_INSPECT_AND_PLAN.md) first. Do not start by asking the agent to “build the whole app.”
5. Treat every `OPEN`, `TBD`, `RESEARCH REQUIRED`, and `SECURITY GATE` item as unresolved. The coding agent must not silently make a security decision.

## Planned releases

| Release | Scope | Secret handling |
|---|---|---|
| Phase 0 | Research, threat model, protocol spike, UX validation | No secrets |
| MVP / Phase 1 | Wallet inventory, heir instructions, guardians, check-ins, notifications, emergency cancellation, export | No seed/private-key/share input or upload |
| Phase 2 | Offline recovery tool, encrypted package format, tested threshold-share workflow | Secrets only in the offline tool; independent review required |
| Later | Optional chain-specific smart-account or timelock integrations | Separate threat model, contract audit, opt-in only |

## Non-negotiable invariants

- The service is not a custodian and never signs, broadcasts, or initiates transfers.
- The production web backend never receives plaintext recovery material or usable decryption keys.
- A missed check-in is not proof of death. The product must say “owner unresponsive / check-in overdue,” never assert a death determination.
- Guardian quorum and check-in logic coordinate people; they do not create a cryptographic time lock. Anyone holding enough shares and the encrypted package can reconstruct the secret at any time.
- No single admin, support agent, database operator, guardian, or email account can recover the user's wallet.
- Users must be able to export their plan and recovery materials in documented, versioned, open formats and recover without the hosted service.
- The app must clearly explain that losing too many shares or the encrypted package can make recovery impossible.
- Never claim “unhackable,” “100% secure,” “zero risk,” or that any amount of crypto is definitively “locked forever” without defensible sourcing and definitions.

## Directory map

```text
AGENTS.md                         Always-on instructions for Antigravity
DESIGN.md                         Product and system design
PRD.md                            Product requirements
TRD.md                            Technical requirements and architecture
PM_PLAN.md                        Product plan, milestones, gates, metrics
SECURITY_THREAT_MODEL.md          Assets, actors, trust boundaries, abuse cases
CRYPTOGRAPHIC_DESIGN.md           Cryptographic protocol constraints and open decisions
DATA_MODEL_AND_API.md             Data boundaries, schema concepts, API requirements
UX_AND_RECOVERY_FLOWS.md          Setup, check-in, missed-check-in, recovery flows
TEST_AND_VERIFICATION_PLAN.md     Test strategy and security properties
CODE_AUDIT_AND_RELEASE_GATE.md    Audit procedure and release blockers
INCIDENT_RESPONSE.md              Security incident and disclosure runbook
OPEN_SOURCE_GOVERNANCE.md         Repository operations and contribution policy
REFERENCES_AND_TOOLS.md           Standards, repositories, and tooling references
prompts/                          Ordered prompts to use with the coding agent
.agents/rules/                    Persistent architectural/security rules
.agents/skills/                   Focused Agent Skills in SKILL.md format
```

## Important limitations

This pack is not a cryptographic audit, legal opinion, estate-planning opinion, custody license assessment, or guarantee against loss. Before handling real recovery secrets or real funds, obtain independent cryptographic review, application penetration testing, privacy/legal review for each launch jurisdiction, and witnessed end-to-end recovery drills.

The commonly repeated **$140B** figure has a traceable historical source: January 2021 reporting attributed to Chainalysis an estimate that roughly 20% of the then-existing Bitcoin supply was lost or stranded, valued at about $140B at that time. That is a dated Bitcoin estimate—not a current measure of all crypto permanently inaccessible, and not a measure of losses caused specifically by death. Treat it as historical context only; any current market claim needs a dated primary source, a clear definition, and methodology.
