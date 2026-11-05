# 10 — Legal and Compliance Notes

**Not legal advice.** This is a checklist of questions to take to qualified counsel (India first; plus any market you launch in). Re-verify everything; laws change.

## 1. What Heirkey is not
Not a custodian, not a will, not a trust, not an exchange, not a financial adviser. Say so plainly in the product and terms. A Legacy Pack is **information and access instructions**; it does not by itself transfer legal title.

## 2. Legal questions to resolve
1. **Wills and succession:** How should users combine Heirkey with a valid will naming heirs and mentioning digital assets (Indian Succession Act context; other jurisdictions differ)? Provide an educational template pointing to a lawyer, not a generated will.
2. **Nominee/executor rules** for crypto in India and other target countries.
3. **Does release of access instructions to a named heir create liability for us** if funds are lost, taken by wrong person, or released early? Draft terms and disclaimers; consider insurance.
4. **Regulatory classification:** non-custodial, no ability to move funds. Get a written opinion on whether VDA/virtual asset service provider, money transmitter, or similar regimes apply in target markets (India, EU MiCA, US state/federal).
5. **Taxation:** inform users that inherited VDAs may be taxable and to consult a tax adviser. We do not compute tax.
6. **Compelled disclosure:** how to respond to subpoenas/court orders; we can only produce ciphertext and metadata. Prepare policy and a transparency report.
7. **Contract capacity and consent:** users must be adults; age gating; heirs who are minors (guardian rules).
8. **Dispute handling:** two people claim to be an heir; owner's family disputes. Our rule: release follows the owner's cryptographic configuration only; we do not adjudicate inheritance. State in terms.
9. **Continuity:** legal instrument making a trustee/escrow agent responsible for continuity release if the company ends (see doc 04 §6.5).
10. **Open-source licensing and trademark:** choose licenses (doc 11); trademark the name once chosen; check "Heirkey" availability (working name only).

## 3. Privacy and data protection
- India DPDP Act 2023 and rules; EU/UK GDPR if EU users; others as needed. Questions: data fiduciary/controller duties, consent, notice, retention, breach notification timelines, data principal rights, cross-border transfer, children.
- Data minimisation by design: collect email (encrypted at rest), optional phone, heir contact email (encrypted), timestamps. Nothing about wallet contents.
- Heirs are third parties who did not sign up: lawful basis and notice for contacting them; minimise content; allow them to decline/opt out.
- Retention: delete ciphertext and metadata on account deletion (except legally required logs); define after release retention (e.g. 90 days then delete).
- Subprocessors list public (cloud, email provider). Prefer providers offering data-processing terms.
- Breach policy: plan for notifying users and regulators within required windows (doc 12).

## 4. Terms of Service key clauses (for counsel to draft)
Not custody; no guarantee of access; user responsibility for passkeys/Emergency Kit; no recovery by us; limitation of liability; acceptable use; dispute resolution; release mechanics and timing; no responsibility for heirs' actions; changes to terms; termination and data deletion; open-source components governed by their licenses.

## 5. Marketing claims discipline
Avoid "unhackable", "100% secure", "guaranteed". Use verifiable claims: "Heirkey cannot read your pack", "audited by X (link)", "open source". Cite sources for statistics (e.g. the "$140B locked" figure is an estimate).

## 6. Security disclosure and safe harbour
`SECURITY.md` + legal safe-harbour language for good-faith researchers (counsel to review).

## 7. Corporate/structural
Entity choice, IP assignment (all contributors sign a CLA/DCO), liability insulation, insurance (cyber/E&O), possible non-profit foundation for stewardship of the open-source code and continuity role.

## 8. Pre-launch legal checklist
- [ ] Counsel engaged and scope agreed
- [ ] ToS, Privacy Policy, Cookie notice (likely none needed if no tracking)
- [ ] Regulatory opinion in each launch jurisdiction
- [ ] DPDP/GDPR compliance review, DPA templates
- [ ] Continuity trustee arrangement
- [ ] Insurance quote
- [ ] Trademark search
- [ ] Contributor policy (DCO/CLA)
