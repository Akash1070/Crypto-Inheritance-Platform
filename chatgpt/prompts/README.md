# Antigravity Prompt Sequence

Use these prompts in order. Start with `00_INSPECT_AND_PLAN.md`, not the build prompt. Each prompt is designed to keep the agent from silently crossing a security boundary.

1. `00_INSPECT_AND_PLAN.md` — inspect the repo and report gaps; no code changes.
2. `01_FINALIZE_ARCHITECTURE.md` — create architecture, ADRs, and a phased implementation plan; no secret handling.
3. `02_BUILD_MVP_IN_SLICES.md` — implement only the no-secret coordination MVP in small vertical slices.
4. `03_SECURITY_REVIEW.md` — run an evidence-based security review and fix verified issues.
5. `04_RELEASE_READINESS.md` — produce release evidence and a go/no-go report.
6. `05_PHASE_2_CRYPTO_SPIKE_ONLY.md` — research and prototype crypto choices with synthetic vectors; do not integrate into production until separate review.

After each phase, inspect the diff yourself. Do not allow the agent to auto-deploy or to use production credentials.
