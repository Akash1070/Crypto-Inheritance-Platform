import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

interface MarkdownPage {
  slug: string;
  title: string;
  summary: string;
  path: string;
  content: string;
  related: { title: string; url: string }[];
}

const CANONICAL_BASE = 'https://cip.network';

export const MARKDOWN_PAGES: Record<string, MarkdownPage> = {
  index: {
    slug: 'index',
    title: 'Crypto Inheritance Platform (CIP) — Sovereign Estate Continuity',
    summary: 'Open-source, zero-knowledge, non-custodial crypto inheritance protocol combining verifiable Shamir secret sharing, FIDO2 WebAuthn passkeys, and isolated Nitro enclaves.',
    path: '/',
    related: [
      { title: 'Protocol Specification', url: `${CANONICAL_BASE}/protocol` },
      { title: 'Security Architecture', url: `${CANONICAL_BASE}/security` },
      { title: 'Offline CLI Tooling', url: `${CANONICAL_BASE}/cli` },
      { title: 'Frequently Asked Questions', url: `${CANONICAL_BASE}/faq` }
    ],
    content: `## Autonomous Crypto Inheritance Without Custodial Risk

The Crypto Inheritance Platform (CIP) is an open-source protocol engineered to prevent permanent loss of digital assets (Bitcoin, Ethereum, private keys, estate instructions) due to owner incapacitation or death.

Unlike centralized custodians or on-chain dead-man contracts, CIP enforces strict zero-knowledge:
- **No Private Keys on Web/API Servers:** Secrets are encrypted and split cold using the audited \`cip\` CLI on an air-gapped machine.
- **2-of-2 Verifiable Secret Split:** Master vault key is split into Heir share $H$ and Escrow share $S$ with BLAKE2b commitments over GF(256).
- **FIDO2 Passkeys Exclusively:** Liveness check-ins and heir claims require hardware biometric assertions (Touch ID, Windows Hello, YubiKey). No SMS or passwords.
- **Isolated Nitro Enclave:** Escrow share $S$ is sealed to an isolated enclave key and released only after a 30-day unchallenged heir claim window and multi-clock Roughtime attestation.

### Core Metrics & Security Guarantees
- **KAT Test Coverage:** 100% Client-Side Cryptographic Known-Answer Tests
- **Challenge Window:** 30 days mandatory with 72-hour multi-channel alerting
- **Plaintext Secrets Stored:** 0`
  },
  protocol: {
    slug: 'protocol',
    title: 'CIP Protocol Specification & Mathematical Foundations',
    summary: 'Detailed specification of Galois Field GF(256) Shamir secret sharing, BLAKE2b polynomial commitments, and X25519 sealed box cryptographic architecture.',
    path: '/protocol',
    related: [
      { title: 'Home', url: `${CANONICAL_BASE}/` },
      { title: 'Security Model', url: `${CANONICAL_BASE}/security` },
      { title: 'CLI Quickstart', url: `${CANONICAL_BASE}/cli` }
    ],
    content: `## Mathematical Foundations

CIP implements Verifiable Shamir Secret Sharing (VSSS) over $\\text{GF}(256)$ with polynomial commitments.

### 1. Key Generation & Splitting
1. Generate 256-bit symmetric vault key $VK \\leftarrow \\{0,1\\}^{256}$.
2. Encrypt plaintext estate bundle $M$ using XChaCha20-Poly1305 with random 24-byte nonce:
   $$\\text{Ciphertext} = \\text{XChaCha20-Poly1305}_{VK}(M, \\text{AAD})$$
3. Construct random polynomial $P(x) = VK + a_1 x$ over $\\text{GF}(256)$.
4. Evaluate shares:
   - $H = P(1)$ (Heir Share)
   - $S = P(2)$ (Escrow Server Share)
5. Generate BLAKE2b commitments to guarantee neither share can be swapped:
   $$C_H = \\text{BLAKE2b}(H \\parallel \\text{salt}_H)$$
   $$C_S = \\text{BLAKE2b}(S \\parallel \\text{salt}_S)$$

### 2. Sealing & Transmission
- Heir Share $H$ is sealed to Heir's public key $PK_H$ via X25519 sealed box: $\\text{Sealed}_H = \\text{BoxSeal}_{PK_H}(H)$.
- Escrow Share $S$ is sealed to Enclave's public key $PK_{\\text{enclave}}$: $\\text{Sealed}_S = \\text{BoxSeal}_{PK_{\\text{enclave}}}(S)$.

### 3. Architecture Decision Records (ADRs)
- **ADR-0001 (Two-Tier Secret Separation):** Web and API tiers must never touch plaintext seed phrases or shares.
- **ADR-0002 (Zero Homemade Cryptography):** libsodium-wrappers-sumo and @noble/hashes exclusively.
- **ADR-0003 (Passkeys Only):** WebAuthn FIDO2 resident keys for all liveness events.
- **ADR-0004 (Isolated Enclave Release):** AWS Nitro Enclave / Confidential VM with multi-clock Roughtime anchors.`
  },
  security: {
    slug: 'security',
    title: 'Security Architecture & Threat Model Runbook',
    summary: 'Exhaustive threat modeling against rogue cloud operators, state-level Lazarus APT adversaries, premature heir claims, and clock warping.',
    path: '/security',
    related: [
      { title: 'Protocol Details', url: `${CANONICAL_BASE}/protocol` },
      { title: 'FAQ', url: `${CANONICAL_BASE}/faq` }
    ],
    content: `## Threat Model & Invariant Protections

Real generational wealth depends on CIP. Security invariants are non-negotiable.

### Threat Defense Matrix

1. **Rogue Cloud Provider / Malicious DB Admin**
   - *Attack:* Hostile database administrator dumps all rows in Postgres.
   - *Mitigation:* The database stores only $\\text{Sealed}_S$ (encrypted to the Nitro Enclave's hardware-bound X25519 key). The API and DB lack decryption keys.

2. **Premature or Malicious Heir Collusion**
   - *Attack:* Rogue heir attempts to trigger estate release while owner is alive.
   - *Mitigation:* A claim can only be initiated when the vault is PENDING. Once initiated, a mandatory 30-day challenge window begins. The owner is notified across multiple rails every 72 hours. A single biometric passkey assertion by the owner instantly restores the vault to ACTIVE and burns the claim.

3. **Hypervisor Clock-Warp Attack**
   - *Attack:* Cloud admin fast-forwards the operating system clock by 30 days to simulate elapsed challenge time.
   - *Mitigation:* The release-signer enclave compares local system RTC with signed cryptographic Roughtime attestations across independent global time anchors.

### Responsible Vulnerability Disclosure
We maintain a formal Coordinated Vulnerability Disclosure process. Independent security researchers who privately discover and report valid issues receive public attribution, safe harbor protections, and coordinated CVE registration.`
  },
  cli: {
    slug: 'cli',
    title: 'Offline CLI Tooling & Air-Gapped Vault Initialization',
    summary: 'Guide to initializing, encrypting, and reconstructing CIP vault packages offline using the audited cip command-line tool.',
    path: '/cli',
    related: [
      { title: 'Protocol Spec', url: `${CANONICAL_BASE}/protocol` },
      { title: 'Source Code', url: 'https://github.com/aethel-network/crypto-inheritance-platform' }
    ],
    content: `## Air-Gapped CLI Tooling (\`cip\`)

The \`cip\` CLI is a self-contained, auditable CLI designed to run on air-gapped computers or Tails OS.

### Installation
\`\`\`bash
npm install -g @cip/cli
# Or run standalone binary from GitHub Releases:
curl -LO https://github.com/aethel-network/crypto-inheritance-platform/releases/latest/download/cip-linux-x64
chmod +x cip-linux-x64
\`\`\`

### 1. Initialize an Encrypted Vault
\`\`\`bash
cip init-vault \\
  --secret "24 word BIP-39 mnemonic seed phrase here" \\
  --heir-pubkey <HEIR_X25519_KEY> \\
  --enclave-pubkey <ENCLAVE_X25519_KEY> \\
  --out cip-vault-bundle.json
\`\`\`

### 2. Verify Bundle Integrity Offline
\`\`\`bash
cip verify-bundle --bundle cip-vault-bundle.json
\`\`\`

### 3. Heir Reconstruction Ceremony
Once the challenge window has elapsed and the enclave releases $\\text{Sealed}_H(S)$:
\`\`\`bash
cip reconstruct \\
  --heir-privkey <HEIR_PRIVATE_KEY> \\
  --bundle cip-vault-bundle.json \\
  --released-share <SEALED_H_OF_S>
\`\`\``
  },
  faq: {
    slug: 'faq',
    title: 'Frequently Asked Questions (FAQ) — Sovereign Crypto Inheritance',
    summary: 'Answers to essential questions regarding seed phrase security, non-custodial operations, passkey backup, and estate execution.',
    path: '/faq',
    related: [
      { title: 'Home', url: `${CANONICAL_BASE}/` },
      { title: 'Security Architecture', url: `${CANONICAL_BASE}/security` }
    ],
    content: `## Frequently Asked Questions

### 1. Does the CIP team, servers, or cloud host have access to my crypto or seed phrase?
**No.** All secrets are split on your own air-gapped computer before anything is sent over the network. The server only receives encrypted blobs and sealed shares. We mathematically cannot access your funds.

### 2. What happens if I lose my hardware passkey?
During registration, CIP generates an offline 24-word high-entropy Emergency Kit. Additionally, CIP enforces enrolling at least two independent hardware authenticators (e.g. primary YubiKey + secondary backup key or laptop biometric).

### 3. How does the 30-day challenge window work?
If you miss all check-in deadlines and the grace period elapses, an authorized heir can file a claim using their passkey. This immediately begins a 30-day challenge window. Red alert notices are broadcast every 72 hours across email, SMS, and trusted contacts. Tapping your passkey even once instantly cancels the claim.

### 4. Is CIP open-source and verifiable?
**Yes.** The entire codebase is licensed under the MIT License on GitHub. Builds are deterministic and reproducible in Docker, allowing independent auditing of PCR0 enclave measurements and web assets.`
  },
  terms: {
    slug: 'terms',
    title: 'Terms of Service — Non-Custodial Protocol Usage',
    summary: 'Terms governing use of the open-source Crypto Inheritance Platform, zero-warranty non-custodial software disclaimer.',
    path: '/terms',
    related: [
      { title: 'Privacy Policy', url: `${CANONICAL_BASE}/privacy` },
      { title: 'Home', url: `${CANONICAL_BASE}/` }
    ],
    content: `## Terms of Service

### 1. Non-Custodial Software
CIP is an open-source protocol and non-custodial software tool. CIP does not take custody of digital assets, does not hold private keys, and does not provide legal or financial advice.

### 2. User Responsibility
Users are solely responsible for:
- Maintaining secure custody of heir keys, authenticators, and emergency recovery kits.
- Executing vault creation and seed phrase entry strictly on air-gapped computers.
- Regularly performing liveness check-ins to prevent premature claim eligibility.

### 3. Disclaimer of Warranties
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`
  },
  privacy: {
    slug: 'privacy',
    title: 'Privacy Policy — Zero-Knowledge Estate Data Handling',
    summary: 'Explanation of zero-knowledge architecture, blind HMAC email indexing, and strict absence of tracking or surveillance.',
    path: '/privacy',
    related: [
      { title: 'Terms of Service', url: `${CANONICAL_BASE}/terms` },
      { title: 'Security', url: `${CANONICAL_BASE}/security` }
    ],
    content: `## Privacy Policy

### 1. Zero-Knowledge Invariant
We believe privacy is a fundamental human right. CIP is designed so that the operators cannot read your estate data, seed phrases, or private communications.

### 2. Blind HMAC Indexing
Email addresses stored for notification purposes are encrypted at rest with AES-256-GCM. Lookups are executed via blind HMAC indices using a server-side pepper, preventing plain-text database indexing.

### 3. No Tracking & No Third-Party Telemetry
- No third-party analytics (Google Analytics, Mixpanel, etc.) are embedded.
- No tracking cookies or advertising pixels.
- Sessions rely strictly on cryptographically signed \`__Host-\` cookies.`
  }
};

export function renderMarkdownPage(page: MarkdownPage): string {
  const parts: string[] = [
    `# ${page.title}\n`,
    `> ${page.summary}\n`,
    `Canonical: ${CANONICAL_BASE}${page.path}`,
    `Last updated: 2026-11-05\n`,
    page.content,
    '\n## Related',
    ...page.related.map((r) => `- [${r.title}](${r.url})`)
  ];

  return parts.join('\n');
}

export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}

function prefersMarkdown(acceptHeader: string | undefined): boolean {
  if (!acceptHeader || acceptHeader.trim() === '' || acceptHeader === '*/*') {
    return false;
  }

  // Parse comma-separated accept entries with q-values
  const entries = acceptHeader.split(',').map((part) => {
    const [mime, ...params] = part.trim().split(';');
    let q = 1.0;
    for (const param of params) {
      const [k, v] = param.trim().split('=');
      if (k === 'q' && v) {
        const parsedQ = parseFloat(v);
        if (!isNaN(parsedQ)) q = parsedQ;
      }
    }
    return { mime: (mime ?? '').trim().toLowerCase(), q };
  });

  const mdEntry = entries.find((e) => e.mime === 'text/markdown');
  const htmlEntry = entries.find((e) => e.mime === 'text/html');

  if (!mdEntry) return false;
  if (!htmlEntry) return mdEntry.q > 0;
  return mdEntry.q > htmlEntry.q;
}

export const markdownRoutes: FastifyPluginAsync = async (app) => {
  // Handler for /api/md/_catalog
  app.get('/api/md/_catalog', async () => {
    return Object.values(MARKDOWN_PAGES).map((p) => {
      const body = renderMarkdownPage(p);
      return {
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        path: p.path,
        canonicalUrl: `${CANONICAL_BASE}${p.path}`,
        markdownUrl: `${CANONICAL_BASE}/api/md/${p.slug}`,
        estimatedTokens: estimateTokens(body)
      };
    });
  });

  // Handler for direct markdown API: GET /api/md/:slug
  app.get('/api/md/:slug', async (req: FastifyRequest<{ Params: { slug: string } }>, reply: FastifyReply) => {
    const slug = req.params.slug.replace(/\.md$/, '');
    const page = MARKDOWN_PAGES[slug];

    if (!page) {
      reply.status(404).type('text/markdown; charset=utf-8').send('# 404 Not Found\n\nRoute does not exist in CIP documentation catalog.\n');
      return;
    }

    const md = renderMarkdownPage(page);
    reply
      .type('text/markdown; charset=utf-8')
      .header('Vary', 'Accept')
      .header('X-Markdown-Tokens', String(estimateTokens(md)))
      .header('Link', `<${CANONICAL_BASE}${page.path}>; rel="canonical"`)
      .header('X-Robots-Tag', 'noindex, follow')
      .send(md);
  });

  // Middleware / Route for .md suffix and content negotiation on root routes:
  // e.g. GET /protocol.md, GET /security.md, GET /cli.md, GET /faq.md
  for (const [key, page] of Object.entries(MARKDOWN_PAGES)) {
    const paths = key === 'index' ? ['/index.md'] : [`/${key}.md`, `/${key}`];

    for (const routePath of paths) {
      app.get(routePath, async (req: FastifyRequest, reply: FastifyReply) => {
        const isMdPath = req.url.endsWith('.md');
        const wantsMd = prefersMarkdown(req.headers['accept']);

        if (isMdPath || wantsMd) {
          const md = renderMarkdownPage(page);
          reply
            .type('text/markdown; charset=utf-8')
            .header('Vary', 'Accept')
            .header('X-Markdown-Tokens', String(estimateTokens(md)))
            .header('Link', `<${CANONICAL_BASE}${page.path}>; rel="canonical"`)
            .header('X-Robots-Tag', 'noindex, follow')
            .send(md);
          return;
        }

        // If client accepts HTML or general browser, redirect to frontend origin
        const webOrigin = process.env['CIP_WEB_ORIGIN'] || 'http://localhost:5173';
        reply.status(302).redirect(`${webOrigin}${page.path}`);
      });
    }
  }
};
