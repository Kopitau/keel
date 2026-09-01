---
id: CHG-012
status: approved
date: 2026-08-29
requirements_from: v5.md
requirements_to: v6.md
research: [RES-908]
---

# CHG-012 Cursor 客户端登记为兼容档平台

## 动机

用户 2026-08-29："能不能让cursor也兼容"；agent 调研（RES-908）后给出三个方案，用户选"A 不是cursor cli是cursor客户端"——目标是 Cursor 桌面客户端，不是它的 `agent` CLI。

调研结论：Cursor 客户端原生读根 `AGENTS.md`（含子目录嵌套）并从 `.agents/skills/` 递归发现 `SKILL.md`（前言只要求 `name` + `description`），与 REQ-016 的仓库契约完全一致——技能与根指令一个字都不用改。缺的只是登记与证据：平台清单、发现表、探测、限额说明、冒烟义务。

## 新增

1. `platforms.compatible` 加 `cursor`（本仓 config、模板 config、`keel init` 写出的 config）。
2. `tools/gate/triggers.ts`：探测表加 `cursor`（bin `cursor`，兼容档；`cursor --version` 即客户端版本），发现表加 `cursor → AGENTS.md + .agents/skills`。
3. `keel/review/headless.md` 加 `## cursor`：本机以客户端为准，无 headless 复审配方；其 CLI 名为 `agent`，与 Grok Build 的 `agent` 同名，未安装、未实测；用它做异构复审时家族由 `--model` 决定。
4. `tools/gate/platform-limits.md` 加一行：Cursor 对 AGENTS.md 无文档化上限（2026-08-29 查）。
5. 黑盒测试 `tests/chg012-cursor.test.ts`（REQ-016/AC-1 的 Cursor 行）；`tests/w5-smoke` 的平台计数 6 → 7。
6. F16 功能计划 v3（规划补充，C-23）；`RELEASE-0.9.1.md`，版本 0.9.0 → 0.9.1。

## 修改

- REQ-016：描述"五家零适配"→"六家"；AC-1 的契约清单加 Cursor；AC-8 冒烟清单加 Cursor 客户端；边界"Pi 为兼容档"→"Pi、Cursor 为兼容档，冒烟即可（Cursor 以客户端为准，CLI 未纳入）"。其余 27 条 REQ 与 v5 逐字相同。

## 删除

无。

## 影响评估

- 需求：只动 REQ-016（AC-1、AC-8、描述、边界），验收语义方向不变（同一契约多一家）。
- 决策：不出 DEC——登记一家兼容平台可逆、无权衡；DEC-170（Codex 元数据）不受影响，Cursor 忽略 `agents/openai.yaml`。被否的方案 B（给 User skills 加 `disable-model-invocation: true`）记在 RES-908：会让 agent 自己装不了 k-impl / k-retro / k-handoff，与 DEC-183 冲突。
- 规划：overview-v4 不动；F16 出计划 v3 作为规划补充（C-23）。
- 测试义务：REQ-016/AC-1（machine-doc）加 Cursor 行；AC-8 的真实冒烟仍是人工证据（在装了 Cursor 的机器上一次，记入 F16 worklog）。
- 证据：本仓 `gate verify` 重跑；消费项目经 0.9.1 `keel update` 获得探测与配置模板。

## 批准

待用户点头 → APR-006 绑定本文件与 `keel/requirements/v6.md` 正文哈希；人类身份或记录在案的委托提交（C-107/DEC-166）。
