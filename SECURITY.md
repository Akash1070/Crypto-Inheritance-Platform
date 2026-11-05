# Security Policy

## Vulnerability Disclosure Policy

Security is the primary foundation of the Crypto Inheritance Platform. We take all vulnerability reports seriously and operate a coordinated vulnerability disclosure process.

### Scope
The following components are in scope:
- Cryptographic Protocol & Core (`packages/crypto-core`)
- Offline Recovery CLI (`packages/cli`)
- State Machine & Event Chaining (`packages/protocol`)
- Enclave Release Signer (`apps/release-signer`)
- Coordination API (`apps/api`)
- Web Coordination Client (`apps/web`)

### Out of Scope
- Denial of Service attacks targeting high bandwidth volume.
- Social engineering against community members.
- Issues related to out-of-date or modified local clients.

### Reporting a Vulnerability
**Do NOT report security vulnerabilities through public GitHub issues.**

Please report security issues via encrypted email or GitHub Private Security Advisory:
- **Email:** security@crypto-inheritance-platform.org
- **PGP Key ID:** 0xCIP_SECURITY_KEY (see official repository releases)

Please include:
1. Detailed description of the vulnerability.
2. Step-by-step reproduction instructions or proof-of-concept.
3. Potential impact assessment.
4. Suggested mitigation or fix (if available).

### Response SLA
- Initial acknowledgement within **24 hours**.
- Triage assessment and severity classification within **72 hours**.
- Coordinated remediation timeline based on CVSS severity rating.

