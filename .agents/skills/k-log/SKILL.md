---
name: k-log
description: Use when starting k-log, filing an ISS, recording friction, tagging a lesson candidate, or registering open-source reuse. Do not interrupt implementation to write essays.
---

# k-log

F10 + F13 + F15. Cheap now, structured later. Record shapes are skill rules, not gate checks (CHG-011).

## Issues (F10)

Trivial: one worklog line. Promote to ISS when it changes behavior, fails a gate, needs investigation, may recur, caused rework, or came from review (C-57).

`node tools/gate/gate.ts new iss <title>` — symptom, impact, runnable repro command, fingerprint, pending defense. No runnable repro → do not fix and do not open a blocking ISS: collect data in the worklog. Root cause and fix stay empty until diagnosed; regression test first; stop after three failed repair rounds (C-58/C-60).

Closing: root cause, fix (or explicit wontfix + reason), why it escaped, closure choice, and a `defense_pointer` to a file that exists (C-59/C-62). A repeated fingerprint names `recurrence_of`, explains why the prior defense failed, and escalates one level (C-61); `gate loop clear` reads that field and counts the whole chain against one fuse (DEC-189).

## Friction (F13)

One worklog line: `#经验候选 <type> <one sentence>` — types: user correction / same fingerprint / defense failed / review pattern / knowledge gap (C-76). Do not stop the task. Same fingerprint ×3 in one feature → candidate (C-78). The retro verifies it and appends on the same line `→ 经验：<phenomenon / lesson / bounds>` or `→ 弃 <reason>`; a confirmed lesson may also become a DEC line. No LES files, no machine reader (CHG-011). User-level notes go to `~/.keel/knowledge/` by hand, sanitized (C-82/C-83).

## Open-source reuse (F15)

Direct dependency or copied code → the `oss:` field of the RES that chose it: name, exact version or commit, license, reuse point, local diff, review plan (C-88/C-90). No `keel/oss/` files (CHG-011). Transitive deps are not registered (C-89).

An upstream review is read-only: date, upstream URL, old/new version or commit, diff, one conclusion (unchanged / watch / recommend research / recommend change). An update goes through CHG; never bump automatically (C-90).

GPL/AGPL borrowing or modification needs a user DEC **before reuse**, recording license impact, options, and the user's words verbatim (C-92).
