---
name: k-handoff
description: Use when starting k-handoff, ending a session, context is nearly full, or a feature just finished and keel/handoff.md must point the next context at the right files. Do not rely on platform chat transcripts.
---

# k-handoff

F12. Records are the only handoff medium (C-73). The worklog is the process record; the handoff is a pointer (CHG-011).

## Write `keel/handoff.md` — at most 10 lines

- Next step (one line, imperative).
- Files to read, repository paths only: current overview, the feature plan + worklog (or its summary), open ISS if any.
- One line of blocking questions, if any.

Nothing else: no narrative, no history — that lives in `worklog.md` / `summary.md`. Rewrite the file in place each time; it is a pointer, not a record.

## When

Context nearly full, session end, or a feature finished (after compressing its worklog into `summary.md`). If you skip it, the next agent rebuilds from the worklogs (C-75).

## Cross-harness recovery (C-73)

A new harness runs `node tools/gate/gate.ts status`, reads the handoff path it prints, then the current feature plan + worklog (or summary); never a platform session file. Record the drill as manual evidence in the feature worklog: harness name and version, date, the three paths read, the next step recovered, the tree hash.

## Next session

`gate status` → handoff → plan + worklog (C-27/C-72). Do not bulk-load `keel/` (C-120).
