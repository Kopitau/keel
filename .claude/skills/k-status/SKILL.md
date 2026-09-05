---
name: k-status
description: Use when checking repository status or recovering navigation after context loss. Do not treat computed frontier features as an instruction to start them.
---

# k-status

Run `node tools/gate/gate.ts status` (or `tools/gate/gate.sh status` / `gate.ps1 status`). Node ≥22.18.0 is required.

At session start, read its handoff path and the current task's plan + worklog/summary. Read `keel/OVERVIEW.md` only when that broader context is relevant. Reuse already-loaded context during an ongoing turn.

Explain the status against the user's actual request: completed features, current checks and genuine blockers. A missing baseline, draft APR, frontier or missing summary is structural information, not automatic permission to initialize, re-ask, start old work or claim completion.

If the handoff and status differ, inspect the affected records/code and correct stale navigation. Do not bulk-load `keel/` or use status to replace the task.
