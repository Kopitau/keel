---
name: k-evidence
description: Use when starting k-evidence, claiming work is done, running gate verify, checking tree hashes, or building the REQ-to-test trace. Do not treat a chat claim as completion.
---

# k-evidence

F6. Done = command + exit + tree hash, not a sentence (C-33).

## Commands

```
node tools/gate/gate.ts verify
node tools/gate/gate.ts trace
node tools/gate/gate.ts check --quick   # 4 checks, seconds; what the hook runs
node tools/gate/gate.ts check           # 8 checks; before claiming done, review, merge
node tools/gate/gate.ts hash <file>     # body hash — what an APR binds
```

`verify` reruns tests (and `tsc --noEmit` when present) and writes `keel/evidence/verify.json`. That directory is **excluded** from the tree hash so the JSON cannot invalidate itself.

Stale evidence (hash mismatch or non-zero exit) fails `X-evidence` / `G-done` / `G-merge` in the full check; `--quick` never judges evidence, so a dirty daily tree stays green (CHG-011). Re-run verify before claiming done, before the plan-level review and before merge; do not edit the JSON by hand. On the local tier the gate also accepts an approved APR whose `evidence_*` snapshot names the current tree (DEC-187) — that is how a merged feature stays proven after its worktree is deleted. `test_command` is a shape: launcher prefix + pytest / `vitest run` / jest / `node --test` + marker or report arguments; `-k`, paths and name patterns are refused (DEC-188).

## Tests

Black-box names carry `REQ-nnn/AC-i`; trace is per acceptance criterion (C-32, DEC-168). Deleting or skipping a test is no longer machine-checked (CHG-011): note the reason in the worklog — X-trace and the plan-level review will see the hole. Core new tests: red then green (C-35). No coverage or mutation gates (C-36).
