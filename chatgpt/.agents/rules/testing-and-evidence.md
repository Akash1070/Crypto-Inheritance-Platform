---
trigger: always_on
description: Testing, audit evidence, and release-quality requirements.
---
# Testing and evidence rules

- Every security-sensitive behavior needs negative tests and abuse-case tests.
- Never use real wallet secrets in tests, fixtures, snapshots, screenshots, logs, or CI.
- Report exact commands and outcomes; distinguish skipped tests from passed tests.
- Automated scanners are evidence, not proof of security.
- No Critical/High findings at production release.
- AI review is not an independent penetration test or cryptographic audit.
- Do not deploy or publish unless explicitly authorized by the human owner after reviewing release evidence.
