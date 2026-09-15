# Spec governance and offline atlas

This is an incremental extension of existing requirements, plans and evidence, not another specification database. Commands run with Node ≥22.18.0 and builtins only.

## Declare sources

In the relevant feature plan, use exact repository-relative paths:

```yaml
implementation: ["src/query.ts", "src/store.ts"]
related: ["docs/storage.md"]
```

Use JSON-quoted inline lists for paths with spaces or commas. Globs, directories, function selectors and symlinks are not supported. Multiple files per feature and multiple governing features per file are allowed. `related` content changes are advisory context; a missing reference still reports an integrity problem. For an APR-bound plan, a newer unbound version is shown as a draft and does not replace its governed scope. Adopting a frozen plan therefore follows the normal version/authorization rules.

Optional `## 原始意图` / `## 工作解释` headings (or `raw source` / `expanded spec`) distinguish a source quotation/reference from the agent's interpretation. `## 技术实现` holds the selected mechanism. Headings inside fenced code do not delimit layers. Old flat documents remain readable; absent source layers are not invented. Interpretation is not approval, and frozen acceptance semantics cannot be edited freely.

## Inspect and resolve drift

```sh
node tools/gate/gate.ts drift
node tools/gate/gate.ts drift --json
node tools/gate/gate.ts drift --check
```

The default query is read-only and exits 0 with an explicit report. `--check` exits 1 for source problems or pending reviews of adopted features; unadopted features remain `unmapped`, not silently aligned. `status` gives a compact summary. Existing check/APR integrity and evidence rules remain in force; this does not add a ninth check or weaken them.

| State | Meaning |
|---|---|
| unmapped | No implementation mapping and no prior review; unknown, not verified |
| unreviewed | Mapping exists, but no explicit content review baseline |
| aligned | Current spec and implementation match the last recorded review; not a semantic verdict |
| spec-changed / code-changed / both-changed | One or both sides changed since review; editing both does not auto-clear |
| missing / invalid | Broken path/mapping, removed reviewed feature or damaged source/review record |

Inspect intent → requirement → mapping → implementation and the actual tests/evidence. Fix the wrong layer; use a new version/CHG when changing frozen semantics. For a behavior-preserving refactor, explain why the existing promise still holds. A rename requires updating the actual mapping; there is no guessed rename or function ownership.

Only after reviewing, use the fingerprint printed for that exact feature:

```sh
node tools/gate/gate.ts drift review F25 --expect <fingerprint> --reason "What changed and why the requirement still holds" --evidence keel/evidence/verify.json
```

The evidence may instead be a repository-local review/report path. The command verifies that it exists and records its normalized hash; it does not execute it or certify its truth. The reason, actor (Git identity), time, commit, evidence reference and normalized content hashes are appended to `<records_dir>/drift/Fnn.json`. The actor is a recorded identity, not proof of human approval. Historical entries remain available. The record is separate from verify JSON and should be committed with the reviewed work when commit is in scope. Never hand-edit it to clear warnings.

Stale fingerprints, invalid records, missing paths and unmapped features are rejected. Reviews never stage, commit, amend or modify requirements. Removing a reviewed feature or all its mappings is not a retirement shortcut: restore the feature or record its successor through the normal change process. Deliberate retirement currently needs an explicit reviewed repository change to its historical records; no bulk retire command exists.

Hashes compare current content against the last review; they do not reconstruct transient changes that were later reverted, prove semantic correctness, or authenticate authors. The comparison is file-granular; shared large files may produce conservative noise. Evidence changing later is reported separately and must be inspected. These limitations are intentional; no function parser or Git-history engine is bundled.

## Generate the atlas

```sh
node tools/gate/gate.ts atlas
node tools/gate/gate.ts atlas --out reports/spec-atlas.html
node tools/gate/gate.ts atlas --json
```

Default output: `<records_dir>/evidence/atlas.html`. Open it locally in a browser. It is a generated, read-only snapshot with a generation timestamp and overall evidence freshness. Search by REQ, feature or path; select a feature to reveal requirements and implementation/related links, then select a requirement or file for detail. A source file can show multiple governing features. A `#F25` fragment opens that feature.

Requirements not referenced by any selected feature plan remain visible and searchable as unmapped requirements, with their own source and detail; no feature or implementation edge is fabricated. The header distinguishes the code tree from HEAD and identifies uncommitted code at export time.

The page embeds data, styles and interaction code, uses no external resources, and treats record bodies as plain text. Source links are relative to the repository; an HTML copy remains readable elsewhere but does not carry source files. Regenerate after changes. The exporter only overwrites a file bearing its own generated marker, rejects source-file overlap and does not follow symlinks.

Test names, summary presence, content review and actual verification are distinct. The view shows manual/proxy conditions and missing mappings explicitly. A successful verify does not turn every displayed acceptance criterion into an individually executed/pass result, and no view or review record establishes user acceptance.
