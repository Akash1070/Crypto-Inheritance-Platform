# Heirkey (working name) — Antigravity Build Pack

Open-source, zero-knowledge crypto inheritance for non-technical wallet holders.

> **Read this first, honestly:** AI coding agents are good at building the app around crypto, and unreliable at inventing crypto. This pack is built around that fact. The agent only *assembles* audited libraries inside strict rules; humans and an external auditor must review the crypto before any real user's secrets are stored. **No real user data or real funds until Gate G3 in `docs/07-PROJECT-PLAN.md` is passed.**

## What is in this pack

| File | Purpose |
|---|---|
| `AGENTS.md` | Always-on instructions for Antigravity (also read by Cursor, Claude Code, Codex) |
| `.agents/rules/` | Standing rules: security invariants, engineering standards, process |
| `.agents/workflows/` | Slash-command workflows: `/build-milestone`, `/security-review`, `/pre-release-gate` |
| `.agents/skills/` | On-demand skills: crypto change review, threat-model update, dependency vetting |
| `docs/01-VISION-AND-STRATEGY.md` | Market, competitors, positioning, top-pick decisions |
| `docs/02-PRD.md` | Product requirements, personas, user stories, acceptance criteria |
| `docs/03-TRD.md` | Technical requirements, stack, repo layout, data model, APIs |
| `docs/04-SECURITY-ARCHITECTURE.md` | The cryptographic protocol (the heart of the product) |
| `docs/05-THREAT-MODEL.md` | Attackers, attack scenarios, mitigations, residual risk |
| `docs/06-DESIGN.md` | UX principles, flows, copy, design system |
| `docs/07-PROJECT-PLAN.md` | Milestones, gates, timeline, budget, risks (the "PM" file) |
| `docs/08-CODE-AUDIT-PLAN.md` | Internal + AI + external audit process and checklists |
| `docs/09-TEST-STRATEGY.md` | Test pyramid, crypto test vectors, fuzzing, chaos tests |
| `docs/10-LEGAL-AND-COMPLIANCE.md` | Legal posture, privacy, India/EU notes (not legal advice) |
| `docs/11-OPEN-SOURCE-AND-RELEASE.md` | Licenses, reproducible builds, signing, bug bounty |
| `docs/12-INCIDENT-RESPONSE.md` | What to do when (not if) something goes wrong |
| `docs/13-RECOMMENDED-REPOS-AND-SKILLS.md` | GitHub repos and skills to add, with trust notes |
| `docs/14-ADR-LOG.md` | Decisions made and why (agent must append here) |
| `SECURITY.md` | Public vulnerability disclosure policy template |
| `prompts/` | Copy-paste prompts for Antigravity, one per milestone |

## How to use it in Antigravity

1. Create an empty Git repo, copy this whole folder into it, open it as the Antigravity workspace.
2. Antigravity reads `AGENTS.md` and `.agents/rules/` automatically. (Older builds used `.agent/` without the "s". If rules do not seem to load, rename the folder.) Rule and workflow files must stay under 12,000 characters each; they do.
3. Open `prompts/00-kickoff.md`, paste it into the Agent Manager, use **Planning mode**, and read the plan before approving.
4. Then run one milestone at a time with `prompts/01...07`. After each: review the diff yourself, run `/security-review`, commit, tag.
5. Never ask the agent to "build everything". One milestone, one branch, one review.
6. Install the extra skills listed in `docs/13-RECOMMENDED-REPOS-AND-SKILLS.md` (clone into `.agents/skills/`). Read each skill's SKILL.md first. Third-party skills are instructions your agent will obey, so treat them like code you run.

## Top-pick decisions (details in the docs)

1. **Do not store anything the platform can read.** Server sees only ciphertext.
2. **No single party can release a vault.** Heir share + server-escrowed share are both needed (and a guardian share in Fortress mode).
3. **Do not invent crypto.** Only vetted libraries, wrapped in one small package (`packages/crypto-core`).
4. **Prefer teaching users to store instructions, not raw seed phrases**, and offer on-chain-native inheritance (Safe module, Bitcoin timelock descriptors) in v2 instead of rebuilding it.
5. **Check-in only with a passkey.** Email links must never prove the owner is alive (grieving family often has the dead person's inbox).
6. **Ship the offline Heir Kit** so heirs can recover even if Heirkey disappears.
