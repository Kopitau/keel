---
name: k-new
description: Use when starting k-new, opening a new feature through interview research design and unified plan, or the user wants the main keel flow from requirements to a confirmed plan. Do not start coding in this skill.
---

# k-new

Dispatcher for F1→F2→F3→F4. Implementation is k-impl after the user confirms the bundled plan (C-19).

## First

`node tools/gate/gate.ts status`. Read `keel/OVERVIEW.md` and `keel/plan/INDEX.md`.

## Sequence

1. **k-grill** — requirements interview. No design until REQ entries have acceptance criteria and open branches sit in `未决问题` (C-05). Baseline = one user nod; large work gets a fresh-context pass first (C-06).
2. **k-research** — pick a depth, write RES files, link OSS when choosing a library (C-08/C-11).
3. **k-decide** — one DEC per choice, user quote in the file, same round (C-13/C-15).
4. **Unified plan** — `keel/plan/overview-vN.md` (~100 lines: feature list, coupling table, order) + `keel/features/<slug>/plan/vN.md` (30–60 lines). Freeze on confirm. Iterate = new version + reindex (C-24).
5. Confirm **plan + technical baseline together once**. Record APR (human identity, C-107). Then k-impl.

## Stop

Do not write production code, do not skip research by memory (C-12), do not confirm DECs yourself.
