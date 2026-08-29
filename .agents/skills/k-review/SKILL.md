---
name: k-review
description: Use when starting k-review — the whole confirmed plan is implemented and the plan-level review loop must run — or when re-reviewing after a repair round. Fresh context only. Do not use if you wrote the implementation in this context.
---

# k-review

F7 + REQ-027/028 (CHG-011). One loop per plan, after every feature of the plan is implemented — a finished feature does not trigger a review. You report; you do not patch (C-39/C-41).

## Products (only these two; both append-only)

- `keel/review/findings.md` — what each round found and where it went (ISS / 待核实 / advisory).
- `keel/review/disposition.md` — state in the front matter, one history row per event. G-done reads it: passed → PASS, repairing / in_review → WARN, fused → FAIL; absent while the plan is still being implemented → PASS. A `passed` front matter counts only with the pack + verdict rows the loop wrote (ISS-056), and once every feature has its summary the pass must be on the current tree (ISS-055).

`keel/review/pack.json` is the hashed reviewer input (gitignored). The checklists (`attack-surface.md`, `robustness.md`, `requirements.md`) and `headless.md` are long-lived knowledge, not review products.

## Loop

1. `node tools/gate/gate.ts loop pack --base <rev> --implementer <h> --reviewer <other-h>` — `--base` is the commit or tree the plan started from; a re-pack of the same plan inherits it, and the tree of the last passed review is the fallback; with none of those the pack refuses, as it does for an empty range (ISS-055). Five keys only: diff (deleted files by name only, 2 context lines), plan (the current overview; the feature `plan/vN.md` obligations it maps are part of it), reqs (REQ entries in scope), evidence (JSON from `gate verify`), worklog_summary (digest, never the chat). Extra fields, chat-shaped text or oversized blobs are refused (C-39).
2. Run the reviewer in a **new** context: a subagent that has not seen this chat, or a headless session per `keel/review/headless.md` (no native subagent → a fresh sequential session with only the pack, C-30). Give it the pack and the lens checklist; get back `Finding[]`.
3. `node tools/gate/gate.ts loop ingest findings.json --reviewer <h>` — blocking **with** a probe command that exits 0 on the unfixed tree → ISS (`gate new iss`); blocking without a command, without impact, or whose probe ran and exited nonzero → 待核实 in findings.md, no ISS (C-58/DEC-182); a probe that could not execute at all holds the loop `in_review` until a round supplies one that runs (ISS-054); advisory → findings.md. Probes run through `sh -c` on every OS.
4. Implementer repairs; then `node tools/gate/gate.ts loop clear --implementer <h> --reviewer <h>` from a **new** reviewer context: every ISS probe is rerun and must now exit nonzero; runs are appended to disposition.md and to evidence (`review.repro_runs`). "Looks fixed" is not clearance (C-42).
5. Same fingerprint still open after 3 rounds → fused: the loop stops, the report is appended to disposition.md, the user decides (C-60).
6. `node tools/gate/gate.ts loop status` = passed → k-accept.

## Lens (DEC-160) — by changed paths, never by the implementer's claim

| Paths | Lens | Checklist |
|---|---|---|
| `tools/gate`, `tools/cli`, `.githooks`, `bin`, workflows, approvals, `tests/`, `keel/evidence/`, `keel/config.json`, `keel/review/`, `package.json`, `.agents/skills/`, `.claude/skills/` | **attack** | `keel/review/attack-surface.md` — try bypasses in a temp copy; keep the probe command |
| `tools/` other, `samples/` | **robustness** | `keel/review/robustness.md` — actually run dirty/empty/fail-midway cases |
| records, docs | **requirements** | `keel/review/requirements.md` — AC coverage + obvious error paths |

Mixed paths → strictest lens. Attack lens **requires a different provider family** than the implementer; same-harness fallback is forbidden — if you cannot invoke one, stop and say so (DEC-159).

## Finding

`title`, `blocking`, `repro` (attack probe: exits 0 while the hole exists), `impact`, `fingerprint`; optional `body`, `pending_defense`. Two axes: spec (every AC has a real black-box test, not a tautology; deleted or skipped tests need an ISS/DEC) and engineering (only what affects correctness or the requirement, C-41). Label blocking vs advisory; never invent a repro or an impact.

New attack discovered → `node tools/gate/gate.ts loop append-attack <bullet>`.
