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
node tools/gate/gate.ts check
node tools/gate/gate.ts hash <file>
```

`verify` reruns tests (and `tsc --noEmit` when present) and writes `keel/evidence/verify.json`. That directory is **excluded** from the tree hash so the JSON cannot invalidate itself.

Stale evidence (hash mismatch or non-zero exit) fails `X-evidence` / `G-done` / `G-merge`. Re-run verify; do not edit the JSON by hand.

## Tests

Names contain `REQ-nnn`. Trace is per acceptance criterion (C-32). Skip/delete a test only with an ISS or DEC reference (C-34). Core new tests: red then green (C-35). No coverage or mutation gates in v1 (C-36).
