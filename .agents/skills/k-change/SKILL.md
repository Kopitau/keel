---
name: k-change
description: Use when starting k-change, changing confirmed requirements or the unified plan, filing a CHG, or adding a feature mid-implementation. Do not edit a frozen vN file in place.
---

# k-change

F11. Current requirements and confirmed plans are immutable (C-63/C-24).

## First

`node tools/gate/gate.ts status`. Read the current `requirements/INDEX.md` and `plan/INDEX.md`.

## Procedure

1. `node tools/gate/gate.ts new chg <title>`.
2. Fill: motive → add/modify/delete per item → impact (use `gate trace`) → who must re-test.
3. User approves (APR, human identity).
4. Write a **new complete** `requirements/vN+1.md` and/or `plan/overview-vN+1.md` and feature `plan/vN+1.md`. Front matter: replaces, change id, summary. Never patch the old file (C-24/C-66).
5. `node tools/gate/gate.ts index`.
6. Mark affected DECs for review; invalidate evidence (`gate verify` will rewrite). Tree-hash mismatch is expected until re-verify (C-65/C-33).

Pure wording with **unchanged acceptance meaning** may be a clarification version (C-67). If the GWT meaning moved, it is not a clarification.

Emergency edits still need a CHG, even a short one (C-66). Mid-project new features: CHG with a plan supplement, do not reopen the whole plan (C-23).
