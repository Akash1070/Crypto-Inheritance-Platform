# Contributing

Thanks for helping improve this project. Security and recovery correctness take priority over feature velocity.

## Before opening a pull request

- Read `AGENTS.md`, `SECURITY_THREAT_MODEL.md`, and the relevant design documents.
- Open an issue for architecture, authentication, authorization, cryptography, key-handling, or state-machine changes before implementing them.
- Keep pull requests focused and include tests, security impact, and rollback notes.
- Never use real seed phrases, private keys, live guardian shares, production exports, or personal information in tests or screenshots.
- Do not add a dependency without explaining why it is needed and reviewing maintenance, license, security history, and transitive dependencies.

## Security-sensitive changes

Changes to auth, roles, check-in states, cancellation, migrations, crypto, release automation, and deployment require additional human review. Agent-generated approval is not sufficient.

## Reporting vulnerabilities

Follow `SECURITY.md`; do not publish exploit details in an issue.
