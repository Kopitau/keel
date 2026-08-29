---
name: k-review
description: Use when starting k-review — the whole confirmed plan is implemented and the plan-level review loop must run — or when re-reviewing after a repair round. Fresh context only. Do not use if you wrote the implementation in this context.
---

# k-review

F7 + REQ-027/028 (CHG-011/013). One loop per plan, after every feature of the plan is implemented — a finished feature does not trigger a review. The reviewer is a **fresh-context subagent that never saw the implementation chat**; the same harness is fine, a different one is optional (DEC-184). You report; you do not patch (C-39/C-41).

## Products (only these two; both append-only)

- `keel/review/findings.md` — what each round found and where it went (ISS / 待核实 / advisory).
- `keel/review/disposition.md` — state in the front matter, one history row per event. G-done reads it: passed → PASS, repairing / in_review → WARN, fused → FAIL; absent while the plan is still being implemented → PASS. A `passed` front matter counts only with the pack + verdict rows the loop wrote (ISS-056), and once every feature has its summary the pass must be on the current tree (ISS-055).

`keel/review/pack.json` is the hashed reviewer input (gitignored). The checklists (`robustness.md`, `requirements.md`) and `headless.md` are long-lived knowledge, not review products.

## Loop

1. `node tools/gate/gate.ts loop pack --base <rev> --implementer <h> --reviewer <id>` — `--base` is the commit or tree the plan started from; a re-pack of the same plan inherits it, and the tree of the last passed review is the fallback; with none of those the pack refuses, as it does for an empty range (ISS-055). Five keys only: diff (deleted files by name only, 2 context lines), plan (the current overview; the feature `plan/vN.md` obligations it maps are part of it), reqs (REQ entries in scope), evidence (JSON from `gate verify`), worklog_summary (digest, never the chat). Extra fields, chat-shaped text or oversized blobs are refused (C-39).
2. Spawn the reviewer: a subagent with a clean context on this harness, given only the pack and the checks below; on a platform without subagents, a fresh sequential session with only the pack (C-30). A cross-harness run per `keel/review/headless.md` is optional — if you choose one and it fails, stop; never report a review that did not happen. Get back `Finding[]`.
3. `node tools/gate/gate.ts loop ingest findings.json --reviewer <id>` — blocking **with** a probe command that exits 0 on the unfixed tree → ISS (`gate new iss`); blocking without a command, without impact, or whose probe ran and exited nonzero → 待核实 in findings.md, no ISS (C-58/DEC-182); a probe that could not execute at all holds the loop `in_review` until a round supplies one that runs (ISS-054); advisory → findings.md. Probes run through `sh -c` on every OS.
4. Implementer repairs; then `node tools/gate/gate.ts loop clear --implementer <h> --reviewer <id>` from a **new** reviewer context: every ISS probe is rerun and must now exit nonzero; runs are appended to disposition.md and to evidence (`review.repro_runs`). "Looks fixed" is not clearance (C-42).
5. Same fingerprint still open after 3 rounds → fused: the loop stops, the report is appended to disposition.md, the user decides (C-60).
6. `node tools/gate/gate.ts loop status` = passed → k-accept.

## What the reviewer checks (REQ-028)

Two axes on every change:

- **Spec** — every acceptance criterion the plan names has a real black-box test (named `REQ-nnn/AC-i`, exercising behaviour — not a tautology, not a text grep where behaviour was promised); deleted or skipped tests carry a worklog reason; the diff does what the plan says and nothing the plan forbids.
- **Engineering** — only what affects correctness or meeting the requirement (C-41). No style, no nitpicks.

Then by code level (C-31):

- **Core code** → `keel/review/robustness.md`: actually run the failure cases — empty / oversized / non-ASCII / extreme inputs, missing dependencies, dirty data, reruns, failure midway that leaves half-written state.
- **Auxiliary code and records** → `keel/review/requirements.md`: requirements coverage and obvious error paths only.

No attack-surface lens: keel's own gate code is reviewed with the same two axes plus robustness, by the same kind of fresh subagent (DEC-184). A new failure mode you found the hard way → append it to `keel/review/robustness.md`.

## Finding

`title`, `blocking`, `repro` (probe: exits 0 while the defect is present), `impact`, `fingerprint`; optional `body`, `pending_defense`. Label blocking vs advisory; never invent a repro or an impact.
