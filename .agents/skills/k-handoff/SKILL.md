---
name: k-handoff
description: Use when starting k-handoff, ending a session, context is nearly full, or writing keel/handoff.md so another harness can continue. Do not rely on platform chat transcripts.
---

# k-handoff

F12. Records are the only handoff medium (C-73).

## Write `keel/handoff.md` (C-70)

1. What / why
2. Current feature and phase
3. Next steps
4. Open questions
5. Files to read

Update at session end or when context will compact. If you skip it, a later agent rebuilds from worklogs (C-75).

## Journal

`keel/journal/<developer>/YYYY-MM-DD-nn.md` for process. Handoff stays short.

For a cross-harness recovery drill, the journal records the new harness name and version, date, the three-jump paths read, the next step recovered, the execution transcript, and the bound tree hash (C-73). This is manual evidence; a platform chat export is not a substitute.

## Next session

They run `node tools/gate/gate.ts status` (prints this path) then read OVERVIEW then the current feature plan + worklog (C-27/C-72). Do not bulk-load `keel/`.
