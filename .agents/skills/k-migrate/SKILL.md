---
name: k-migrate
description: Use when starting k-migrate, converting Trellis or Superpowers artifacts into keel records, or mining docs/ for unstructured requirements and rules. Do not delete old framework files.
---

# k-migrate

F22. The semantic mapping is this skill; gate only allocates ids, skeletons and indexes (C-135). There are no mapping templates any more — the tables below are the rules (CHG-011).

## Rules

1. **Read-only source** (C-132). Snapshot source paths and bytes before and after; never delete or rewrite Trellis/Superpowers trees. After a successful mapping add a standalone `keel-migrated` marker only, recorded separately from the unchanged-bytes comparison.
2. **Drafts are not a baseline** (C-131). Every migrated REQ/DEC/plan is `迁移初稿（未确认）` until the user confirms and an APR is hashed.
3. **Do not invent** missing rationale: such DECs are `provisional`, titled `暂定·需补理由`.
4. Deleting the old tree is a later, explicit user confirmation (C-134).

## Trellis (0.6.x layout: `.trellis/{workflow.md,config.yaml,spec/,tasks/<t>/,workspace/<dev>/}`)

| Source | keel draft | Rule |
|---|---|---|
| `tasks/*/prd.md`, spec PRDs | REQ rows in `requirements/vN.md` | one REQ per item; no acceptance → `[NEEDS-CLARIFICATION]`; open forks → 未决问题 |
| `tasks/*/design.md`, `research/*.md`, spec design notes | RES + DEC | decision / why / alternatives present → DEC; no rationale → provisional 暂定·需补理由 |
| completed `tasks/*` | `features/<slug>/summary.md` | compare against the PRD acceptance; missing test evidence is listed, never fabricated |
| in-flight `tasks/*` | `features/<slug>/plan/v1.md` | scope / test obligations / files from implement.md + jsonl; unknown → open item |
| `workspace/<dev>/` journal, session pointers | `keel/handoff.md` (≤10 lines) + worklog lines | pointer only; process stays in the worklog |
| `.trellis/workflow.md` rules, `config.yaml`, `.developer` | compare with `AGENTS.md` / `config.json` | conflicts go to the report for the user; never auto-merge |
| `implement.jsonl` / `check.jsonl` | worklog navigation hints | never a mandatory checklist |
| platform skills / hooks / CLAUDE.md | dual-framework exclusion list | disable Trellis skills and hooks only after confirmation |
| `spec/guides/`, `break-loop` / `update-spec` output | rule candidates, ISS / DEC drafts | stale guides → doubt list |

Not mapped: `task.py`, `add_session.py` and other runtime scripts (AGPL-3.0-only; clean-room only), `trellis channel` / `mem` (N4), the marketplace `tdd` workflow text, `.template-hashes.json` / `.runtime/`.

## Superpowers (`docs/superpowers/{specs,plans}/`, optional `.superpowers/sdd/`)

| Source | keel draft | Rule |
|---|---|---|
| `specs/*-design.md` | REQ material + DEC (+ RES if sources were compared) | goals / non-goals → REQ; decisions without rationale → 暂定·需补理由 |
| `plans/*.md` | `plan/vN.md` or `summary.md` | fully checked plan → summary draft; else plan draft; Files / Interfaces / Run-Expected → touched files + test obligations |
| brainstorm output on disk | REQ material | never migrate what only lived in chat |
| SDD `progress.md`, review packages | worklog hints + review gap list | a ledger is not evidence; F6 still applies |
| root `CLAUDE.md` / `AGENTS.md` injections (incl. the 1% rule), `hooks.json` SessionStart | exclusion list + rule candidates | the forced-trigger rule conflicts with keel's on-demand skills; the user decides |

Not mapped: the Superpowers skill bodies, gitignored SDD workspaces already removed, individual commits (git history is the record).

Preset conflicts for the user: research optional ↔ mandatory (F2); soft gates ↔ CI authority; task ↔ feature as the work unit; one question at a time ↔ batched rounds (C-02); two root instruction files cannot coexist.

## Unstructured docs (C-136)

Scan `docs/`, README and stray root `*.md`; mark source and last-modified date; classify: requirement material → REQ draft; plan / design → plan or DEC draft; rule → AGENTS.md candidate; stale or contradictory → doubt list; unclassifiable → listed as such.

## Procedure

1. Detect source trees; snapshot bytes.
2. Map per the tables; ids via `node tools/gate/gate.ts new`.
3. Write the Chinese migration report `keel/migration-report.md`: front matter (status 迁移初稿（未确认）, source, generated_at, snapshot before / after, marker additions) and the sections 已映射 / 未映射 / 冲突 / 存疑 / 无法归类 / 待确认 (C-133). Never fabricate a reason for an unmapped item.
4. List dual-framework conflicts; do not disable old skills before the user confirms (C-134).
5. `node tools/gate/gate.ts index` then `check --quick`.

## Self-bootstrap exception

keel's own design-round ledger is already confirmed (C-142). Do not relabel those records as unconfirmed drafts.
