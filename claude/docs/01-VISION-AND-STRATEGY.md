# 01 — Vision and Strategy

## Problem
A large amount of crypto is permanently unrecoverable (lost keys, forgotten passwords, holders who died without telling anyone). The often-quoted figure is "$140B+"; treat it as a rough, contested estimate, not a precise fact, and do not put a hard number in marketing without a source.

Self-custody is the right default for sovereignty, and it creates a single point of failure: the holder. Existing answers are either too technical (multisig, Miniscript), too custodial (hand your funds over), or too fragile (a note in a drawer).

## Vision
Anyone who holds crypto can, in under 15 minutes and without technical knowledge, make sure the right people can access it after they die or become incapacitated, **without ever trusting Heirkey with their keys**, and without anyone being able to take it early.

## Competitive landscape (honest notes)
Verified via search in Nov 2026 unless marked *verify*. Re-check before publishing anything externally.

| Player | Approach | Strength | Weakness vs. our wedge |
|---|---|---|---|
| Casa Inheritance | Collaborative multisig with waiting window | Strong security, polished | Requires moving funds into Casa's multisig setup; paid; closed source |
| Unchained | 2-of-3 multisig with executor key | Mature, BTC-focused | Bitcoin-only, collaborative custody, higher-touch |
| Vault12 | Mobile Shamir-share distribution | Consumer friendly | Closed source; trust in vendor app |
| Sarcophagus | On-chain dead-man's switch (Ethereum + Arweave, token incentives) | Decentralised | Token economics, complex, users must re-wrap; not non-technical friendly |
| Liana (Wizardsardine) | Bitcoin Miniscript timelock wallet | Trustless, open source | Bitcoin-only, you must use their wallet |
| Safe dead-man's-switch module (blockful, open source) | EVM Safe module transferring ownership after inactivity | Trustless on-chain | EVM + Safe only, developer-oriented |
| Deadhand Protocol | Open-source SSS + dead-man's switch, server-assisted | Closest in spirit | Early, small team, UX for non-technical users unproven (*verify*) |
| Kresus | Paid inheritance service, launched 2026 (*verify*) | Recent entrant | Unknown security model |
| Generic DMS (e.g. Google Inactive Account Manager, Alcazar DMS) | Email release after inactivity | Easy | Not designed for secrets; platform sees data |

**Where nobody wins yet:** non-technical UX + zero-knowledge + open source + no fund migration + multi-chain (anything where the heir needs *information*).

## Positioning (top pick)
**"Legacy Pack": an end-to-end encrypted, release-controlled bundle of everything an heir needs** — where the wallets are, how to open them, which hardware wallet, passphrase hints, exchange accounts, who to call. Works with any wallet on any chain because it transfers *knowledge*, not custody. No migration. No tokens.

Differentiators to protect:
1. Zero-knowledge and open source (verifiable, self-hostable).
2. Two-independent-party release (no single compromise releases a vault).
3. Offline Heir Kit (heirs recover even if Heirkey is gone).
4. Plain-language UX for people who do not know what a seed phrase is.
5. v2: guide users into on-chain-native inheritance where it fits better.

## Strategic decisions
| # | Decision | Reason |
|---|---|---|
| S1 | Information vault first, no custom smart contracts in v1 | Smallest attack surface; contracts need expensive audits |
| S2 | Reuse existing audited on-chain inheritance (Safe module, Liana descriptors) in v2 via integration | Do not rebuild what exists |
| S3 | No token, no custody, no KYC in v1 | Avoids regulatory and incentive risk |
| S4 | Open source from day 1 of public beta | Trust is the product |
| S5 | Paid hosted service, free self-hosting | Sustainable without selling data |
| S6 | Launch only after external audit | A breach here ends the company and hurts users |

## Business model (simple)
- Free: 1 vault, 1 heir, check-in reminders.
- Paid (~$5–15/month or annual; validate pricing): multiple heirs, Fortress mode (guardians), extra channels, priority support.
- Never sell data. There is no data to sell, and that is a feature.

## Success metrics
- Time to complete first vault under 15 min for non-technical testers.
- 90%+ of test heirs complete a dry-run recovery without help.
- Zero critical/high findings open at launch. Zero plaintext secret incidents.
- Dry-run recovery success rate with platform offline: 100% (Heir Kit).

## Honest warning
This is a trust business. One incident can end it. Budget time and money for audits first, features second.
