---
name: k-log
description: Use when starting k-log, filing an ISS, recording friction, tagging a lesson candidate, or registering OSS reuse. Do not interrupt implementation to write essays.
---

# k-log

F10 + F13 + F15. Cheap now, structured later.

## Issues

Trivial: one worklog line. Promote to ISS when it changes behavior, fails a gate, needs investigation, may recur, caused rework, or came from review (C-57).

`node tools/gate/gate.ts new iss <title>` — repro command, root cause, fix, why-not-caught, defense + why not a stronger one (C-58/C-59).

An open `iss-v2` record needs a symptom, impact, runnable repro, fingerprint, and pending defense. If there is no runnable repro, do not fix or open the ISS: collect data in the worklog. Keep root cause and fix empty until diagnosed; write the regression first and stop after three unsuccessful repair rounds (C-58/C-60).

Closing requires root cause, fix (or the explicit wontfix action), why it escaped, closure choice with rationale, and a `defense_pointer` to an existing repository file. A repeated fingerprint names `recurrence_of`, explains `prior_defense_failure`, and records a stronger `defense_escalation`. On the third occurrence in one feature, append `#经验候选 same fingerprint <fingerprint> ...` for F13 (C-61/C-62).

## Friction (F13)

Worklog line: `#经验候选 <type> <one sentence>`. Types: user correction / same fingerprint / defense failed / review pattern / knowledge gap (C-76). Do not stop the current task. Same fingerprint ×3 in one feature forces promotion (C-78). Formal LES only after a retro (C-79). Tags are read by machine now: `gate status` counts pending ones, and retro disposes each by appending `→ …` on the tag line.

## OSS (F15)

Direct dependency or copied code → `gate new oss`. Exact version or commit, license, reuse point, local diff, 28-day review plan (C-88/C-90). Transitive deps are not required (C-89).
