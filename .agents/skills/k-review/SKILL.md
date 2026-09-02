---
name: k-review
description: Use when starting k-review — the whole confirmed plan is implemented and the plan-level review loop must run — or when re-reviewing after a repair round. Fresh context only. Do not use if you wrote the implementation in this context.
---

# k-review

F7 + REQ-027/028 (CHG-011/013/015). One loop per plan, after every feature of the plan is implemented — a finished feature does not trigger a review. The reviewer is a **fresh-context subagent that never saw the implementation chat**; the same harness is fine, a different one is optional (DEC-184). You report; you do not patch (C-39/C-41).

## What the reviewer answers (REQ-028, DEC-191)

Three questions, from the pack and the code. Read, check the evidence, run the project's test command **at most once** (skip it when the pack's evidence is fresh for this tree). `keel/review/checklist.md` is the whole list.

1. **Standards and maintainability** — conventional, as simple as it can be, easy for someone else to change. Duplicate implementations, needless abstraction or complexity, changes outside the plan, stack traces where a plain error was due all count. Style and naming taste do not.
2. **Implemented** — the diff does what the plan's obligations and the REQ entries say, and nothing the plan forbids.
3. **Functional tests written and passing** — every acceptance criterion in scope has a real black-box test (`REQ-nnn/AC-i` in the name, input only what the requirement names, assertion only what the AC promises); `feature_coverage` in the evidence lists black-box / proxy / missing per feature; skipped or deleted tests carry a worklog reason (C-34).

**Blocking** is only: a function not implemented or contradicting its requirement; an AC with no black-box test or a failing one; code plainly unmaintainable. Everything else is advisory. Only what affects correctness or meeting the requirement (C-41). No edge-case fuzzing, no probe scripts, no mutation runs, no re-running the suite round after round.

## Products (only these two; both append-only)

- `keel/review/findings.md` — what each round found and where it went (ISS / 待核实 / advisory).
- `keel/review/disposition.md` — state in the front matter, one history row per event. G-done reads it: passed → PASS, repairing / in_review → WARN, fused → FAIL; absent while the plan is still being implemented → PASS. A `passed` front matter counts only with the pack + verdict rows the loop wrote (ISS-056), and once every feature has its summary the pass must be on the current tree (ISS-055).

`keel/review/pack.json` is the hashed reviewer input (gitignored). `checklist.md` and `headless.md` are long-lived knowledge, not review products.

## Loop

1. `node tools/gate/gate.ts loop pack --base <rev> --implementer <h> --reviewer <id>` — `--base` is the commit or tree the plan started from; a re-pack of the same plan inherits it, and the tree of the last passed review is the fallback; with none of those the pack refuses, as it does for an empty range (ISS-055). Five keys only: diff (deleted files by name only, 2 context lines; lockfiles as name + hash + lines, DEC-189), plan (the current overview; the feature `plan/vN.md` obligations it maps are part of it), reqs (REQ entries in scope), evidence (JSON from `gate verify`, including `feature_coverage`), worklog_summary (digest, never the chat). Extra fields, chat-shaped text or oversized blobs are refused (C-39). A `warn: pack field … > reviewer budget` line means one reviewer cannot read it whole — narrow `--base` or split the scope (`review.pack_budget` in config).
2. Spawn the reviewer: a subagent with a clean context on this harness, given only the pack and `keel/review/checklist.md`; on a platform without subagents, a fresh sequential session with only the pack (C-30). A cross-harness run per `keel/review/headless.md` is optional — if you choose one and it fails, stop; never report a review that did not happen. Get back `Finding[]`.
3. `node tools/gate/gate.ts loop ingest findings.json --reviewer <id>` — the file must be a JSON array of `Finding` objects (shape below); anything else is rejected whole, archived under `keel/review/raw/`, and goes back to a **fresh** reviewer — the implementer never rewrites reviewer output (DEC-189). A blocking finding opens an ISS (`gate new iss`) only when its evidence holds on this tree: `repro` is a test or check command that **fails now (nonzero, with a test failure in its output) and passes once fixed**, or `ac` alone names a criterion that `gate trace` shows has no black-box test. A `repro` that passes, or fails without a test failure, or an `ac` that is already covered → 待核实 in findings.md, no ISS (C-58/DEC-191); a command that cannot execute at all holds the loop `in_review` until a round supplies one that runs (ISS-054); advisory → findings.md.
4. Implementer repairs; then `node tools/gate/gate.ts loop clear --implementer <h> --reviewer <id>` from a **new** reviewer context: every ISS `repro` is rerun and must now pass (exit 0); an `ac`-only ISS clears when the trace shows a black-box test for it. Runs are appended to disposition.md and to evidence (`review.repro_runs`). "Looks fixed" is not clearance (C-42).
5. Same fingerprint still open after 3 rounds → fused: the loop stops, the report is appended to disposition.md, the user decides (C-60). A recurrence (`recurrence_of` on the ISS or the finding) counts against the root of its chain, so renaming the fingerprint does not restart the count (DEC-189).
6. `node tools/gate/gate.ts loop status` = passed → k-accept.

## Finding

`title`, `blocking`, `repro` (a test or check command: fails on this tree, passes when fixed), `impact`, `fingerprint`; optional `ac` (`REQ-nnn/AC-i` the finding fails), `kind` (`unimplemented` | `test-missing` | `test-failing` | `unmaintainable`), `body`, `pending_defense`, `recurrence_of`. Label blocking vs advisory; never invent a repro or an impact.
