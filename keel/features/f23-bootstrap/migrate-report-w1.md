# 迁移报告 — keel 自举 W1（2026-08-21）

通俗说明。四件事：映射了什么、没映射什么、冲突、待确认（C-133）。

本仓是框架自己迁自己（F23），不是给外部 Trellis 项目做 F22。源目录没有 `.trellis/` 或 `docs/superpowers/`。

## 1. 映射了什么 → 哪里

| 源 | 去向 | 编号 |
|---|---|---|
| `docs/features.md` F1–F23 | `keel/requirements/v1.md` REQ-001–023 + `keel/features/<slug>/` | F↔REQ 见需求书文末与 `id-map.json` |
| `docs/decisions.md` C-01–C-142 | `keel/decisions/DEC-NNN-C-NN.md` | C-01=DEC-001 … C-142=DEC-142 |
| `docs/research/R1`–`R7`（含 R3a/R3b） | `keel/research/RES-001`–`RES-008` 包装文件 | 正文仍在原文，包装只引用 |
| `docs/research/SUMMARY.md` | OVERVIEW / 本报告导航 | 不成 RES |
| `DESIGN.md` §3–§5、§8 | `keel/plan/overview-v1.md` + 23 份 `plan/v1.md` | 规范原文仍在 DESIGN.md |
| `docs/handoff.md`（设计阶段） | `keel/handoff.md`（实施阶段活文件） | 源只打标记，不删 |
| `docs/` 非结构化挖掘 | 见第 2 节 | C-136 |

源文件只加 `keel-migrated` 标记，不删不改正文（C-132）。

**自举例外（C-142）**：这些记录视为 keel 项目第一批正式账本（confirmed），不是对外迁移的「未确认初稿」。APR 重确认仍须人类身份提交（草稿在 `keel/approvals/APR-001.md`）。

## 2. 没映射什么、为什么

| 源 | 原因 |
|---|---|
| 无 `.trellis/`、无 Superpowers 计划/spec | 本设计仓没用那两套流程目录；映射表仍落在 `keel/templates/migrate/` 供日后 k-migrate |
| `docs/requirements.md` R-01–R-21 | 旧访谈，已被 features.md 取代。只在需求书附录作存疑对照，不生成第二套 REQ |
| `docs/research/` 报告全文 | 引用不复制，避免两份正文漂移（C-69） |
| `artifacts/` | 临时数据，不是流程工件 |
| Trellis `task.py` 等运行时 | AGPL-3.0-only 且门禁模型不同；不复制代码 |
| Superpowers 14 个技能正文 | 换框架，不搬技能 |

## 3. 冲突项

| 项 | 说明 | 处理 |
|---|---|---|
| `docs/features.md` 仍写「正式名称待后续确认」 | C-99 已确认名称为 keel | 不改源（不重写历史）。以 C-99 / CONTEXT.md 为准 |
| 旧 R-15「每个任务实施计划都要人工批」 | F4 已收束为「方案+统一规划一次确认」 | 以 C-19/C-24 为准；附录标明 |
| N3「本轮不写实现」 | 实施轮已开始 | N3 是设计轮边界，不再阻止写代码 |
| DESIGN §8/9 非确认项 vs 用户要开工 W1 | 采用为工作顺序并写进总览 adoption 行 | 若改波次会先告知 |
| F22 C-131 初稿不成基线 vs F23 C-142 本轮即账本 | 仅限本仓自举走 C-142；对外项目仍走 C-131 | 映射表与本报告都写了这条 |

## 4. 待确认清单

1. 人类 git 身份（写进 config.identities.humans，用于 APR 提交）。
2. GitHub / Gitee 远端 URL（配完才升档）。
3. 是否删除或归档 `docs/` 设计原稿——现在只打标记，删除须你另点头（C-132）。
4. §8/9 是否在 W6 后升为确认决策。

无 Trellis/Superpowers 双框架并存问题（本仓从未装它们的技能/钩子）。
