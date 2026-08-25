---
name: k-review
description: Use when starting k-review, independently reviewing a feature diff, or checking correctness against requirements and the feature plan. Do not use if you wrote the implementation in this context.
---

# k-review

F7 + REQ-027/028. Fresh context only. You report; you do not patch (C-39/C-41). Claiming done must trigger this loop; do not skip to k-accept.

## Input (give the reviewer only these)

- Diff
- Feature `plan/vN.md` and its test obligations
- REQ entries in scope
- Evidence JSON from `gate verify`
- Worklog **summary**, not the implementation chat (C-39)

Pack with `gate loop pack --feature <slug> --implementer <h> --reviewer <h>`. Gate writes the five keys; extra fields, chat-shaped text, or oversized blobs are refused (C-39).

## Lens (DEC-160) — by changed paths, not by implementer claim

| Paths | Lens | Checklist |
|---|---|---|
| `tools/gate`, `tools/cli`, `.githooks`, `bin`, workflows, approvals, `tests/`, `keel/evidence/`, `keel/config.json`, `keel/test-baseline.json`, `keel/review/`, `package.json`, `.agents/skills/`, `.claude/skills/` | **attack** | `keel/review/attack-surface.md` — try bypasses in a temp copy; keep the repro command |
| `tools/` other, `samples/` | **robustness** | `keel/review/robustness.md` — actually run dirty/empty/fail-midway cases |
| records, docs | **requirements** | `keel/review/requirements.md` — AC coverage + obvious error paths |

Mixed paths → strictest lens. Attack-lens changes **require a different harness** than the implementer. If you cannot invoke one, **stop and say so**; do not silently same-harness (DEC-159). No native subagent (e.g. Pi): open a **new** session with the pack; do not improvise a platform-private API (C-30).

## Axes (all lenses)

1. **Spec** — every acceptance criterion has a real test (not a tautology). Flag skipped/deleted tests without ISS/DEC (C-34).
2. **Engineering** — only issues that affect correctness or meeting the requirement. No nitpicking (C-41).

Label blocking vs advisory.

## Land findings

`gate loop pack` first. Blocking **with** a repro command → `gate loop ingest findings.json --reviewer <h>` (opens ISS via `gate new iss`). Empty findings without a pack **must not** mark the loop passed (ISS-023).
Blocking **without** a repro command → deferred to the feature worklog as `待核实`; **must not** open an ISS (C-58).

## Re-review (new clean context, C-42)

After a fix, a **new** reviewer runs each ISS repro command via `gate loop clear`. The attack/failure must now be **refused** (nonzero exit). Record runs in evidence (`review.repro_runs`). "Looks fixed" is not clearance.

Same fingerprint still open after **3** repair rounds → fuse; stop the loop and report (`keel/review/fuse-report.md`).

New attack discovered → `gate loop append-attack <bullet>` so the next reviewer sees it.

`gate loop status` must read `passed` before k-accept.
