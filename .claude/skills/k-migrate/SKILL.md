---
name: k-migrate
description: Use when starting k-migrate, converting Trellis or Superpowers artifacts into keel records, or mining docs/ for unstructured requirements and rules. Do not delete old framework files.
---

# k-migrate

F22. Semantic mapping is this skill; gate only allocates ids, skeletons, indexes, and report templates (C-135).

## First

Read `keel/templates/migrate/trellis.md`, `superpowers.md`, and `unstructured.md`. Run `node tools/gate/gate.ts status`.

## Rules

1. **Read-only source** (C-132). Do not delete or rewrite Trellis/Superpowers trees. After a successful mapping, add a `keel-migrated` marker only.
2. **Drafts are not a baseline** (C-131). Every migrated REQ/DEC/plan is `迁移初稿（未确认）` until the user confirms and an APR is hashed.
3. **Do not invent** missing rationale. Mark those DECs `provisional` with title `暂定·需补理由`.
4. Deletion of the old tree is a later, explicit user confirmation.

## Procedure

1. Detect source trees (`.trellis/`, `docs/superpowers/`, plus `docs/` and root `*.md`).
2. Map per the tables. Use `node tools/gate/gate.ts new` for ids.
3. Mine unstructured docs into REQ / plan / DEC candidates, or a doubt list with path + last modified (C-136). Do not trust stale files blindly.
4. Write a Chinese migration report: mapped / not mapped / conflicts / awaiting confirmation (C-133).
5. List dual-framework conflicts for the user. Do not disable old skills until they confirm (C-134).
6. `node tools/gate/gate.ts index` then `check --quick`.

## Self-bootstrap exception

keel’s own design-round ledger is already confirmed (C-142). Do not relabel those records as unconfirmed drafts.
