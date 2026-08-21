---
name: k-status
description: Use when starting k-status, beginning a session, printing keel status, or deciding what to read next. Do not dump the records directory into context.
---

# k-status

Session start. Status is a script, zero model tokens (C-25).

## Procedure

1. `node tools/gate/gate.ts status` (or `tools/gate/gate.sh status` / `gate.ps1 status`).
2. Read the `handoff:` path it prints.
3. Read `keel/OVERVIEW.md`.
4. Read the current feature `plan/vN.md` + `worklog.md`.
5. Follow its navigation. Read more if needed. Never bulk-load `keel/` (C-120).

If Node is below 22.18.0 the launcher must error, not continue (DEC-150).

Use k-impl / k-bugfix / k-new only after this three-jump.
