# keel

keel is a repo-local process layer: numbered Chinese records, English skills, one stdlib-free gate, thin platform bridges. It does not orchestrate the model and does not bind a vendor.

## Session start (three jumps)

1. Run `tools/gate/gate.sh status` (macOS/Linux) or `tools/gate/gate.ps1 status` (Windows). Direct: `node tools/gate/gate.ts status`.
2. Read the handoff path it prints (see CONTEXT.md for the records-dir name).
3. Read the current feature plan + worklog named there.

Then follow its navigation. Read more if you need it. Do **not** bulk-load the records directory.

Node **≥22.18.0** is required (DEC-150); launchers refuse older versions. `gate check --quick` (4 checks, seconds) runs in the pre-commit hook; `gate check` (8 checks) before claiming done, review and merge; CI reruns it (C-100).

## Map

| Need | Where |
|---|---|
| Terms | `CONTEXT.md` |
| Config | records dir `/config.json` |
| Skills (W4) | `.agents/skills/k-*/SKILL.md` — catalog below; bodies on demand |
| Design norms | `DESIGN.md` §5 (confirmed). §8–9 are advisory. |
| Gate | `tools/gate/gate.ts` (`status` `check` `new` `index` `trace` `sync` `worktree` `approve` `hash` `verify` `loop` `triggers` `review`) |
| Platform limits | `tools/gate/platform-limits.md` |
| Claude Code bridge | `CLAUDE.md` is exactly `@AGENTS.md` |

## Confirmed rules (do not silently change)

- Only user-confirmed content counts. Uncovered choices: recommend + rationale + alternative, confirm, write a DEC. Do not decide alone (C-03/C-15).
- Confirmed artifacts are immutable. Iterate = new version file + reindex (C-24/C-63).
- Intelligence and the feature come first. Do not save tokens by making either worse (C-69).
- English: this file, skills, field names, script output. Chinese: record bodies, easy to read (C-124/C-09).
- Gate = Node + TypeScript, run `.ts` directly, Node builtins only at runtime (DEC-149/151). Authority is CI rerun, not hooks (C-100).
- Hashes run on normalized text: UTF-8, no BOM, LF (DEC-144). Paths use the runtime API (DEC-145).
- Touching a confirmed interface, requirement boundary, unplanned dependency, or test obligation: stop and ask (C-21).
- Done = evidence (command, exit, tree hash), not a claim (C-33). W3 lands verify.
- One feature, one branch, one worktree (C-112). Overlapping files → serialize (C-114).
- After the plan is confirmed the loop is autonomous (DEC-183): implement → test → record → compress the worklog into `summary.md` → next frontier feature. One plan-level review at the end. Stop only for C-21, a fused review, or acceptance.
- Freezing binds semantics (CHG-011): approvals hash the body; metadata edits are free, a typo fix cites the APR in the worklog, a meaning change is a new version + re-approval.

## Skill catalog (bodies in `.agents/skills/k-*/SKILL.md`; Claude mirror via `gate sync`)

User: `k-init` `k-migrate` `k-new` `k-impl` `k-bugfix` `k-change` `k-review` `k-accept` `k-retro` `k-handoff` `k-status`

Model: `k-grill` `k-research` `k-decide` `k-evidence` `k-log`

Load the matching skill before that work. Do not invent platform-private process commands.

## Enforcement

L0 this file (advisory) → L1 platform hooks → L2 `.githooks/` → **L3 CI rerun of gate (authority)** → L4 human APR.

Tier is `enforcement_tier` in the config (this repo: `github`, CODEOWNERS on). OS matrix: Windows + macOS (dev) + Linux (CI) (DEC-143). Label: deters mistakes, not malice (C-48/C-111).

## Do not

- Auto-inject records into context (C-120).
- Rewrite confirmed files in place.
- Hash raw disk bytes (DEC-144).
- Submit APR commits with an agent git identity; agent-made APR commits need a `delegated:` record of the user's instruction (C-107/DEC-166).
- Add runtime npm dependencies. New **dev** dependencies need a DEC (DEC-154).
