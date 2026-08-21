# keel

keel is a repo-local process layer: numbered Chinese records, English skills, one stdlib gate, thin platform bridges. It does not orchestrate the model and does not bind a vendor.

## Session start (three jumps)

1. Run `python -X utf8 tools/gate/gate.py status`.
2. Read the handoff path it prints (see CONTEXT.md for the records-dir name).
3. Read the current feature plan + worklog named there.

Then follow its navigation. Read more if you need it. Do **not** bulk-load the records directory.

Until W2 implements real `status`, the stub still prints those paths.

## Map

| Need | Where |
|---|---|
| Terms | `CONTEXT.md` |
| Config | records dir `/config.json` |
| Skills (W4) | `.agents/skills/k-*/SKILL.md` — catalog below; bodies on demand |
| Design norms | `DESIGN.md` §5 (confirmed). §8–9 are advisory. |
| Gate | `tools/gate/gate.py` (W1 = `status` stub; W2 = checks) |
| Platform limits | `tools/gate/PLATFORM-LIMITS.md` |
| Claude Code bridge | `CLAUDE.md` is exactly `@AGENTS.md` |

## Confirmed rules (do not silently change)

- Only user-confirmed content counts. Uncovered choices: recommend + rationale + alternative, confirm, write a DEC. Do not decide alone (C-03/C-15).
- Confirmed artifacts are immutable. Iterate = new version file + reindex (C-24/C-63).
- Intelligence and the feature come first. Do not save tokens by making either worse (C-69).
- English: this file, skills, field names, script output. Chinese: record bodies, easy to read (C-124/C-09).
- Gate = Python ≥3.11, stdlib only. Authority is CI rerun, not hooks (C-101/C-100).
- Touching a confirmed interface, requirement boundary, unplanned dependency, or test obligation: stop and ask (C-21).
- Done = evidence (command, exit, tree hash), not a claim (C-33). W3 lands verify.
- One feature, one branch, one worktree (C-112). Overlapping files → serialize (C-114).

## Skill catalog (W4; names from DESIGN §9, working list)

User: `k-init` `k-migrate` `k-new` `k-impl` `k-bugfix` `k-change` `k-review` `k-accept` `k-retro` `k-handoff` `k-status`

Model: `k-grill` `k-research` `k-decide` `k-evidence` `k-log`

Until those files exist, implement from `DESIGN.md` §5 and the current feature plan. Do not invent platform-private process commands.

## Enforcement

L0 this file (advisory) → L1 platform hooks → L2 `.githooks/` → **L3 CI rerun of gate (authority)** → L4 human APR.

This repo is **local tier** until remotes exist: hooks + run gate before merge + hash APR files. Label: deters mistakes, not malice (C-48/C-111).

## Do not

- Auto-inject records into context (C-120).
- Rewrite confirmed files in place.
- Skip research by “remembering” a stack (C-12).
- Submit APR commits with an agent git identity (C-107).
