---
name: k-log
description: Use when starting k-log, filing an ISS, recording friction, tagging a lesson candidate, or registering OSS reuse. Do not interrupt implementation to write essays.
---

# k-log

F10 + F13 + F15. Cheap now, structured later.

## Issues

Trivial: one worklog line. Promote to ISS when it changes behavior, fails a gate, needs investigation, may recur, caused rework, or came from review (C-57).

`node tools/gate/gate.ts new iss <title>` — repro command, root cause, fix, why-not-caught, defense + why not a stronger one (C-58/C-59).

## Friction (F13)

Worklog line: `#经验候选 <type> <one sentence>`. Types: user correction / same fingerprint / defense failed / review pattern / knowledge gap (C-76). Do not stop the current task. Same fingerprint ×3 in one feature forces promotion (C-78). Formal LES only after a retro (C-79).

## OSS (F15)

Direct dependency or copied code → `gate new oss`. Exact version or commit, license, reuse point, local diff, 28-day review plan (C-88/C-90). Transitive deps are not required (C-89).
