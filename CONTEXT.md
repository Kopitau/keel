# CONTEXT.md — keel terms

A small glossary, read on demand. The records dir in this repo is `keel/`; consumer projects use `config.json.records_dir`. AGENTS.md contains the working contract; this glossary does not add another workflow.

| Term | Meaning |
|---|---|
| requirement / REQ | The user's needed behavior, acceptance and boundaries; numbered entries in `requirements/vN.md`. Do not invent user intent. |
| feature | A useful observable capability, not a quota of files or steps. A small change may stay in an existing feature. |
| plan | The in-scope implementation and test obligations. `plan/INDEX.md` points to the current overview. |
| DEC | A durable consequential trade-off. Ordinary implementation choices do not need a DEC. |
| RES | Retrievable research for a significant choice. A small source check can be in the worklog. |
| CHG | Why frozen semantics change and what is affected; new versions preserve the old ones. |
| authorization | The user's permission to perform specified work; persists until changed/revoked. Does not mean the unseen result was accepted. |
| APR | A scoped record of actual user words, approver and artifact body hashes. Distinguish implementation authorization, confirmation, acceptance and merge. |
| ISS | A meaningful tracked issue. Formal review blockers require the loop's verifiable evidence; ordinary diagnosis may also use concrete code/log evidence. |
| worklog | Append-only useful process/evidence notes, not a transcript. Trivial choices need no note. |
| summary | A living feature outcome with evidence and limits. Preserves the useful conclusions of a worklog; not proof by itself. |
| handoff | The active goal, prior authorization, next action and relevant paths. Portable without requiring a platform's session files. |
| OVERVIEW | A living project picture, consulted when broader context helps. |
| three jumps | At session start/context loss: status → handoff → relevant plan + worklog/summary. Not repeated each turn. |
| frontier | Features without summary/claim whose recorded blockers have summaries. Structural navigation, not authority to start work or proof that blockers function. |
| gate | `tools/gate/gate.ts`: Node ≥22.18.0, direct TypeScript, Node builtins only at runtime. |
| evidence tree | Normalized code/config tree used to bind verification. Records are excluded except configuration; changing only records does not stale code evidence. |
| normalized hash | UTF-8, no BOM, LF; approval SHA-256 hashes the body. Do not hash raw disk bytes. |
| GWT | Given/When/Then; a checklist is sufficient for simple acceptance. |
| black-box acceptance | Assert promised behavior through its public seam (CLI, route or module API), not internal implementation choices; test name `REQ-nnn/AC-i`. |
| machine-doc | A runnable document/protocol invariant. It does not prove a human or model followed the instructions. |
| regression | A test for an actual defect. Red/green evidence is useful when feasible; mutation machinery is not mandatory. |
| proxy | `[proxy:<release condition>]` stands in for missing real-environment evidence. WARN is not PASS. |
| seam | The public interface through which a requirement can be observed. Prefer the highest useful stable seam, not an artificial lower-level substitute. |
| evidence snapshot | Tool-written APR `evidence_*` fields used by local-tier gates when applicable. Never hand-edit verification data. |
| enforcement tier | `github`, `gitee` or `local`, from config. This repo is configured `github`; that alone does not prove remote protection or CI ran. |
| drift | An approved artifact differs from its bound body. Version a semantic change; cite the APR for a genuine typo correction. |
| host / harness | Editor environment / executing agent tool. Host identity is not proof of approval. |
| historical design | Frozen DESIGN / old versions / superseded DECs explain past choices. They are not an additional current checklist. |

Use terms for clarity, not word-policing. Do not add a second ADR directory, a second platform-specific gate, or a separate lesson database just to rename existing records.
