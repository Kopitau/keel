# keel 0.9.1 release notes

发布日期：2026-08-29。补丁版（正式版前只走 0.9.x，用户 2026-08-29 约定）。变更单 CHG-012（RES-908）与 CHG-013（DEC-184）。

## 破坏点

- 评审回路去掉视角分类与异构规则（CHG-013 / DEC-184）：`gate loop append-attack` 子命令删除；`ingest` / `clear` 不再要求 reviewer 与 implementer 异构；`disposition.md` 前言不再有 `lens` / `paths`（旧字段被忽略）；`evidence.review` 不再有 `lens` / `heterogeneous_*`；`keel/review/attack-surface.md` 删除；config 的 `optional.heterogeneous_review` 不再读取。

## 变化

- **Cursor 客户端登记为兼容档**：Cursor 原生读根 `AGENTS.md` 并从 `.agents/skills/` 发现 `SKILL.md`，技能与根指令零改动；`platforms.compatible` 加 `cursor`，`gate triggers` 探测 `cursor --version`，发现表加 `cursor → AGENTS.md + .agents/skills`；`keel/review/headless.md` 说明 Cursor 的 CLI `agent` 与 Grok Build 的 `agent` 同名、未纳入复审配方。
- **评审 = 空白上下文子代理**：评审者只须未参与实现，同一 harness 即可；两轴（spec / 工程）+ 按 C-31 分级的鲁棒性 / 需求清单；跨 harness 配方（`headless.md`）保留为可选。
- `keel --version`（`-v` / `version`）打印安装器版本。
- 评审回路（0.9.0 后补）：pack 必须绑定范围（`--base`，同规划继承，空范围拒绝）；G-done 的 passed 须有回路写下的历史行；探针在所有平台经 `sh -c` 执行，无法执行的探针使回路停在 `in_review`；G-req 的正文哈希 WARN 按绑定 APR 逐条放行。

## 消费项目要做的事

1. `keel update`，看预览后输入 `y`。
2. 若要把 Cursor 列入自己的平台清单：`keel/config.json` 的 `platforms.compatible` 加 `"cursor"`（update 不改 config 内容）。
