---
name: k-init
description: Use when starting k-init, initializing a new keel project, scaffolding keel records, or asking the first config questions. Do not use to change an existing confirmed baseline.
---

# k-init

Scaffold a consumer project so records, gate and the AGENTS map exist. Prefer `keel init` (DEC-157). Inspect facts first; use AGENTS.md's clarification boundary for genuinely missing choices.

## First

`node tools/gate/gate.ts status` if this is already a keel repo. If `keel/config.json` exists, do not initialize again; continue the actual task with the existing configuration.

## Copy (do not invent a second layout)

`keel init` copies these eight groups from the installer package (never symlink, DEC-147):

- `AGENTS.md` `CLAUDE.md` `CONTEXT.md`
- `keel/templates/` (config.json is **written clean**, not copied from the framework repo)
- `tools/gate/` `.githooks/` `.gitattributes`
- `.agents/skills/` then `gate sync`

It sets hook exec bits. Gate is Node ≥22.18.0, run `.ts` directly (DEC-149/150).

## Configuration (inspect first; ask only for material missing choices)

Use the repository name, remote, known git identity and existing platform choices when available. A remote alone does not prove branch protection. Ask only for a needed unresolved choice; do not make these facts a mandatory questionnaire. Never invent an approver. Local = deters mistakes, not malice.

Set the test profile from the actual project's test command when known; otherwise leave `profiles.active` unset until it is known. Do not wait for a separate planning ceremony. Non-interactive:

```
keel init --name <dir> --tier local --human "Name <email>"
```

Then:

```
git config core.hooksPath .githooks
node tools/gate/gate.ts check --quick
```

## Done

Config parses; `check --quick` is green with G-req/G-plan SKIP on a vacuum project (DEC-158). Do not invent a confirmed baseline. If the user's task also includes implementation, continue after scaffolding.
