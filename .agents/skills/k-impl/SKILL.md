---
name: k-impl
description: Use when starting k-impl, implementing a confirmed feature, claiming a feature branch, or entering the autonomous implementation zone. Do not use before the unified plan is confirmed.
---

# k-impl

Autonomous implementation of one confirmed feature (C-20/C-21). Work unit = feature, not a task ticket.

## First

```
node tools/gate/gate.ts status
node tools/gate/gate.ts worktree add Fnn
```

Read that feature’s `plan/vN.md` and `worklog.md`. Read the coupling table in the current overview.

## Loop

1. Append the worklog as you go (decomposition, progress, non-obvious choices). Do not rewrite history (C-20).
2. Stay inside the planned file set. Overlap with another claimed feature → serialize (C-114).
3. Core logic: tests before code. Auxiliary: tests before you call it done (C-31).
4. Mark tests with `REQ-nnn` in the test name (C-32).
5. `node tools/gate/gate.ts check --quick` often; `verify` before you claim done (C-33).

## Stop and ask (C-21)

Confirmed interface or data contract; requirement boundary; unplanned major dependency; confirmed test obligation.

Internal small adjustments: log an implementation decision in the worklog (C-17/C-22). Cross-feature or interface change: k-change, do not silently edit the plan.

## Done

`gate verify` green on this tree; worklog current; no undocumented interface drift. Then k-review, then k-accept. Merge is separate (C-44).
