---
name: k-migrate
description: Use when starting k-migrate, converting Trellis or Superpowers artifacts into keel records, or mining docs/ for unstructured requirements and rules. Do not delete source files without applicable user authorization.
---

# k-migrate

F22. Apply AGENTS.md's scope and authorization rules. The semantic mapping is this skill; gate only allocates ids, skeletons and indexes (C-135). There are no mapping templates any more — the tables below are the rules (CHG-011).

## Rules

1. **Read-only source by default** (C-132). Snapshot source paths and bytes before and after; do not delete or rewrite source trees unless the user's request explicitly covers it (rules 4–5). For read-only mapping add a standalone `keel-migrated` marker only, outside the unchanged-bytes comparison.
2. **Drafts are not a baseline** (C-131). Every migrated REQ/DEC/plan is `迁移初稿（未确认）` until the user confirms and an APR is hashed.
3. **Do not invent** missing rationale: such DECs are `provisional`, titled `暂定·需补理由`.
4. Deleting the old tree needs explicit user authorization. If the current request already identifies and authorizes that deletion, do not ask again; confirm exact targets and preserve recoverability.
5. **Flattening is still a migration** (CHG-014). When the user chooses to delete the old framework and code outright, write `keel/migration-report.md` anyway (what was dropped, what survives in git history), land the deletion as its own commit — never leave 200 deleted files sitting in the working tree — and disable the old framework's SessionStart injection and skills in that same commit. A dirty tree keeps `gate verify` at `dirty: true` and G-done red for as long as it lives.

## Trellis (0.6.x layout: `.trellis/{workflow.md,config.yaml,spec/,tasks/<t>/,workspace/<dev>/}`)

| Source | keel draft | Rule |
|---|---|---|
| `tasks/*/prd.md`, spec PRDs | REQ rows in `requirements/vN.md` | one REQ per item; no acceptance → `[NEEDS-CLARIFICATION]`; open forks → 未决问题 |
| `tasks/*/design.md`, `research/*.md`, spec design notes | RES + DEC | decision / why / alternatives present → DEC; no rationale → provisional 暂定·需补理由 |
| completed `tasks/*` | `features/<slug>/summary.md` | compare against the PRD acceptance; missing test evidence is listed, never fabricated |
| in-flight `tasks/*` | `features/<slug>/plan/v1.md` | scope / test obligations / files from implement.md + jsonl; unknown → open item |
| `workspace/<dev>/` journal, session pointers | `keel/handoff.md` (short pointer) + worklog lines | pointer only; process stays in the worklog |
| `.trellis/workflow.md` rules, `config.yaml`, `.developer` | compare with `AGENTS.md` / `config.json` | conflicts go to the report for the user; never auto-merge |
| `implement.jsonl` / `check.jsonl` | worklog navigation hints | never a mandatory checklist |
| platform skills / hooks / CLAUDE.md | dual-framework exclusion list | disable Trellis skills and hooks only under applicable user authorization |
| `spec/guides/`, `break-loop` / `update-spec` output | rule candidates, ISS / DEC drafts | stale guides → doubt list |

Not mapped: `task.py`, `add_session.py` and other runtime scripts (AGPL-3.0-only; clean-room only), `trellis channel` / `mem` (N4), the marketplace `tdd` workflow text, `.template-hashes.json` / `.runtime/`.

## Superpowers (`docs/superpowers/{specs,plans}/`, optional `.superpowers/sdd/`)

| Source | keel draft | Rule |
|---|---|---|
| `specs/*-design.md` | REQ material + DEC (+ RES if sources were compared) | goals / non-goals → REQ; decisions without rationale → 暂定·需补理由 |
| `plans/*.md` | `plan/vN.md` or `summary.md` | fully checked plan → summary draft; else plan draft; Files / Interfaces / Run-Expected → touched files + test obligations |
| brainstorm output on disk | REQ material | use available source text with provenance; do not reconstruct unavailable chat |
| SDD `progress.md`, review packages | worklog hints + review gap list | a ledger is not evidence; F6 still applies |
| root `CLAUDE.md` / `AGENTS.md` injections (incl. the 1% rule), `hooks.json` SessionStart | exclusion list + rule candidates | the forced-trigger rule conflicts with keel's on-demand skills; the user decides |

Not mapped: the Superpowers skill bodies, gitignored SDD workspaces already removed, individual commits (git history is the record).

Preset conflicts for the user: only substantive conflicts in scope: evidence authority, required behavior, destructive changes or contradictory active instructions. Question batching, file names and old framework terminology are not reasons to restart an interview.

## Unstructured docs (C-136)

Scan `docs/`, README and stray root `*.md`; mark source and last-modified date; classify: requirement material → REQ draft; plan / design → plan or DEC draft; rule → AGENTS.md candidate; stale or contradictory → doubt list; unclassifiable → listed as such.

## Procedure

1. Detect source trees; snapshot bytes.
2. Map per the tables; ids via `node tools/gate/gate.ts new`.
3. Write the Chinese migration report `keel/migration-report.md`: front matter (status 迁移初稿（未确认）, source, generated_at, snapshot before / after, marker additions) and the sections 已映射 / 未映射 / 冲突 / 存疑 / 无法归类 / 待确认 (C-133). Never fabricate a reason for an unmapped item.
4. List dual-framework conflicts; disable old skills only when the user has authorized that scope; reuse existing authorization.
5. `node tools/gate/gate.ts index` then `check --quick`.

## Self-bootstrap exception

keel's own design-round ledger is already confirmed (C-142). Do not relabel those records as unconfirmed drafts.
