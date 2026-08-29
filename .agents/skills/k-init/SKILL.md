---
name: k-init
description: Use when starting k-init, initializing a new keel project, scaffolding keel records, or asking the first config questions. Do not use to change an existing confirmed baseline.
---

# k-init

Scaffold a consumer project so keel records, gate, and the AGENTS map exist. Prefer the installer: `keel init` (DEC-157). Facts from the repo: do not ask. Decisions: batch questions with a recommended answer each (C-02/C-03).

## First

`node tools/gate/gate.ts status` if this is already a keel repo. If `keel/config.json` exists, stop and use k-change / k-impl instead.

## Copy (do not invent a second layout)

`keel init` copies these eight groups from the installer package (never symlink, DEC-147):

- `AGENTS.md` `CLAUDE.md` `CONTEXT.md`
- `keel/templates/` (config.json is **written clean**, not copied from the framework repo)
- `tools/gate/` `.githooks/` `.gitattributes`
- `.agents/skills/` then `gate sync`

It sets hook exec bits. Gate is Node ≥22.18.0, run `.ts` directly (DEC-149/150).

## Questions (one round; test profile is **not** asked here)

1. Project name? Recommend the directory name.
2. Enforcement tier: `github` / `gitee` / `local`? Recommend based on whether a GitHub remote exists. Local = deters mistakes, not malice.
3. Human git name + email for APR (C-107)?
4. Keep the five primary platforms (C-96)?

`profiles.active` is `unset` until F4 (the unified plan) picks a test profile from the code being implemented. Non-interactive:

```
keel init --name <dir> --tier local --human "Name <email>"
```

Then:

```
git config core.hooksPath .githooks
node tools/gate/gate.ts check --quick
```

## Done

Config parses; `check --quick` is green with G-req/G-plan SKIP on a vacuum project (DEC-158). Do not confirm a requirements baseline here — that is k-new / k-grill.
