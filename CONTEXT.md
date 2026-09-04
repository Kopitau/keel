# CONTEXT.md — keel terms

English headwords; Chinese notes allowed. Only terms and banned near-synonyms (C-125). Lazy file: create when a project actually needs it. This copy is the keel repo’s own glossary.

## Terms

| term | 注释 | do not use |
|---|---|---|
| keel | 框架名与可见记录目录 `keel/`（C-99） | kk, trellis-compat, “the framework” when a precise name is needed |
| records dir | 本仓库为 `keel/`。Root instructions must not bulk-load it (C-120). | injecting `keel/` into always-on context |
| AGENTS.md | English root map ≤150 lines, ≤32KiB chain (C-118) | duplicating skill bodies here |
| gate | `tools/gate/gate.ts`, Node+TS, run `.ts` directly, Node builtins only (DEC-149) | a second checker script per platform; Python stdlib gate (superseded C-101) |
| three jumps | status script → handoff → current feature plan+worklog (C-27) | relying on compacted chat memory |
| REQ | requirement id in `keel/requirements/vN.md` | recycling retired numbers |
| DEC | one decision, one file (C-13) | a rolling `decisions.md` dump |
| RES | one research question, one file (C-09) | “we looked around” with no file |
| ISS | issue record with a defense pointer (C-58) | chat-only bug notes |
| CHG | change request; current requirements file is frozen (C-64) | editing `vN.md` in place |
| APR | approval with content hash, the user's verbatim words (`delegated:`) and a named approver; any git identity may commit it (C-106, DEC-190) | an `approved` APR without the user's words; treating the git author as the approval |
| oss field | direct-dependency reuse registered in the `oss:` field of the RES that chose it (C-88, CHG-011) | separate OSS files; undocumented copies of upstream code |
| lesson | one verified line appended to the `#经验候选` worklog line (`→ 经验：…`) or a DEC line (CHG-011); user-level notes in `~/.keel/knowledge/` | LES/KLES files; pasting secrets into user-level notes |
| quick check | `gate check --quick` = G-req, G-plan, X-trace, X-bypass; what the pre-commit hook runs (CHG-011) | running the test suite in a hook |
| body hash | approval hash over normalized text minus the front matter; metadata edits never void an APR (CHG-011) | re-approving for a status flip |
| disposition / findings | the two plan-level review products in `keel/review/` (REQ-027, CHG-011) | state.json / per-feature review files |
| checklist (三问) | `keel/review/checklist.md`: the reviewer's three questions — standards and maintainability, implemented, functional tests written and passing — plus the three blocking kinds; a blocking finding's evidence is a failing test or a criterion with no black-box test (REQ-028 v7, DEC-191) | robustness.md / requirements.md / attack-surface.md, attack probes that exit 0 |
| BRIEF (待表态说明) | `keel/decisions/BRIEF-<date>-*.md` from `keel/templates/BRIEF.md`: one plain-language document for a batch of user decisions (background / options / recommendation / impact); answers go verbatim into each REQ and DEC (CHG-016) | a bare numbered list in chat |
| keel section markers | `<!-- keel:begin -->` … `<!-- keel:end -->` in a project's AGENTS.md: the part `keel update` rewrites; `keel/installed.json` records the installed managed files so a local patch is named before it is overwritten (CHG-016) | AGENTS.md frozen at init |
| autonomous loop | implement → test → record → compress worklog into summary → next frontier feature; humans at C-21, fuse, acceptance (DEC-183) | stopping after every slice to ask |
| worklog | append-only feature implementation log (C-20) | rewriting history in place |
| OVERVIEW | living project picture (C-54) | versioning OVERVIEW as a frozen artifact |
| GWT | Given/When/Then; checklists allowed for simple items (C-07) | vague “should work” acceptance |
| tree hash | `git write-tree`; mismatch invalidates evidence (C-33) | trusting a transcript “tests passed” |
| enforcement tier | `github` / `gitee` / `local` (C-48). This repo starts at `local`. | claiming GitHub protection without remotes |
| W1–W6 | implementation waves from DESIGN §8 (advisory, adopted as working order 2026-08-21) | treating §8 as a confirmed C-record |
| normalized hash | SHA-256 of UTF-8 / no BOM / LF (DEC-144) | hashing raw on-disk bytes |
| strip-types | Node ≥22.18.0 runs `.ts` without a build (DEC-150/151) | tsx / tsc emit as the runtime path |
| black-box acceptance test | 名带 `REQ-nnn/AC-i`；只用需求点名的输入、只断 AC 承诺的结果；唯一能证明 AC 的测试（DEC-168） | 给回归测试挂 AC 名 |
| white-box regression test | 名以 `ISS-`/`DEC-`/`fp:` 开头，针对具体缺陷或分支；提交前突变验证（C-35/DEC-168） | 用它顶验收；名里带 `AC-i` |
| proxy coverage | `[proxy:<解除条件>]`，黑不了的 AC 的替身；X-trace 记 WARN 不记 PASS（DEC-168） | 没有解除条件的替身；把 WARN 当 PASS |
| frontier | 未完成、未认领、且 `blocked_by` 全部已完成的功能；`gate status` 打印（DEC-169） | 用散文"实施顺序"代替机器可查的依赖 |
| seam | 黑盒验收测试挂上去的那一层（CLI / 路由 / 命令 / 模块 API），在功能计划"测试义务"里点名（RES-904 §6） | 测试挂在比计划更低的缝上却不标 proxy |
| evidence snapshot | `gate approve` 写进 APR 前言的 `evidence_*` 八个字段；local 档合并后 G-done / G-merge / X-evidence 回读它（DEC-187） | 把 verify.json 提交进仓库；手写 evidence_* |
| host | 编辑器宿主（Cursor / VS Code）：人与 agent 共用一套终端环境，尾注记 `Host:`，不算 agent（ISS-059） | 把 CURSOR_* 当 agent 标记去触发 DEC-166 |
| drift | 已批准工件正文哈希与 APR 记录不符；X-apr / G-plan / G-req 报 FAIL，错字级修订以 `gate-warn: <check> ref=APR-nnn` 放行（DEC-185） | 原地改冻结件而不出新版本 |

## Banned near-synonyms

- **task ticket** as the work unit → the work unit is a **feature** (C-19).
- **ADR directory** → mark `adr` on a DEC; do not add a second tree (C-16).
- **coverage gate / mutation testing** in v1 → out (C-36).
