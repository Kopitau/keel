---
name: k-handoff
description: Use when ending a session or preserving active work across context loss. Do not let stale records override the current user request.
---

# k-handoff

F12. Repo records provide portable continuity without requiring a platform session file. The live user request and relevant prior authorization remain valid.

## Write `keel/handoff.md`

Keep it short enough to scan, usually about ten lines:

- Current goal and authorized scope, with any still-applicable user decision.
- What was completed and the next in-scope action, or explicitly no remaining implementation.
- Relevant files: current plan, worklog/summary, evidence and open issue if needed.
- The exact blocker or missing decision, only when there is one.

History belongs in the worklog/summary. The handoff is a living pointer; rewrite it when the state materially changes, not for every tool call. The closing reply and handoff must agree on the next action.

If a handoff is missing, the next agent rebuilds from the relevant worklogs and available task context; do not restart completed work or require a new authorization merely because the session changed.

## Recovery

`gate status` → handoff → relevant plan + worklog/summary. `next:` describes structural repository state, not the user's intent or verified completion. Read `OVERVIEW.md` only when broader context is needed; do not bulk-load records.

For an actual cross-harness recovery test, record the harness/version, date, paths read, recovered next step and tree hash in the feature worklog. Do not claim that test from merely checking this text.

End a work-closing reply with `下一步：`, one useful action or no action needed. Do not manufacture a new approval question.
