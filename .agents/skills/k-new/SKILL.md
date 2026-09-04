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
2. **k-research** — pick a depth, write RES files, register a chosen library in the RES `oss:` field (C-08/C-11).
3. **k-decide** — one DEC per choice, user quote in the file, same round (C-13/C-15).
4. **Unified plan** — `keel/plan/overview-vN.md` (~100 lines: feature list, coupling table, order) + `keel/features/<slug>/plan/vN.md` (30–60 lines). Each feature plan's front matter names its requirements — `req: [REQ-nnn, …]` — replacing the scaffold's `REQ-000`; X-trace binds the completion claim through that line (ISS-044). Freeze on confirm. Iterate = new version + reindex (C-24).
5. Confirm **plan + technical baseline together once**. Record APR with the user's verbatim words (`delegated:`, DEC-190) and commit it yourself. **This round ends here**: report the approval and stop — starting implementation is the user's next decision unless they already asked for it (CHG-016). Once they do, k-impl runs the autonomous loop; humans return only for C-21, a fused review, or acceptance (DEC-183). When many items wait for the user at once, write one `keel/decisions/BRIEF-<date>-<slug>.md` from `keel/templates/BRIEF.md` (background / options and cost / recommendation / impact per item) instead of a bare list; the answers still go verbatim into each REQ and DEC.

## Stop

Do not write production code, do not skip research by memory (C-12), do not confirm DECs yourself.
