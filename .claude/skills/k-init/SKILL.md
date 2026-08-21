---
name: k-init
description: Use when starting k-init, initializing a new keel project, scaffolding keel records, or asking the first config questions. Do not use to change an existing confirmed baseline.
---

# k-init

Scaffold a consumer project so keel records, gate, and the AGENTS map exist. Facts from the repo: do not ask. Decisions: batch 3–5 questions with a recommended answer each (C-02/C-03).

## First

`node tools/gate/gate.ts status` if this is already a keel repo. If `keel/config.json` exists, stop and use k-change / k-impl instead.

## Copy (do not invent a second layout)

From a keel tag or this repository, copy only:

- `AGENTS.md` `CLAUDE.md` `CONTEXT.md`
- `keel/templates/` `keel/config.json` (then edit)
- `tools/gate/` `.githooks/` `.gitattributes`
- `.agents/skills/` then `node tools/gate/gate.ts sync`

Windows/macOS/Linux: copy skills, never symlink (DEC-147). Gate is Node ≥22.18.0, run `.ts` directly (DEC-149/150).

## Questions (one round)

1. Project name? Recommend the directory name.
2. Enforcement tier: `github` / `gitee` / `local`? Recommend based on whether a GitHub remote exists. Local = deters mistakes, not malice.
3. Active test profile: `python-cli` / `ds-ml` / `ts-js` / `other`? Recommend from the repo's existing tests.
4. Human git name + email for APR (C-107)?
5. Keep the five primary platforms (C-96)?

Write answers into `keel/config.json`. Then:

```
git init   # if needed
git config core.hooksPath .githooks
node tools/gate/gate.ts index
node tools/gate/gate.ts check --quick
```

## Done

Config parses; INDEX files have a unique `current:`; `gate check --quick` passes. Do not confirm a requirements baseline here — that is k-new / k-grill.
