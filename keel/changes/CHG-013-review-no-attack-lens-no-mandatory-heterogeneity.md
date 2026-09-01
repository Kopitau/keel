---
id: CHG-013
status: approved
date: 2026-08-29
requirements_from: v5.md
requirements_to: v6.md
decisions: [DEC-184]
---

# CHG-013 评审去掉攻击面视角、不强制异构：空白上下文子代理即可

## 动机

用户 2026-08-29（看到方案级评审仍按 attack 视角并强制异构）："attack review 为什么还是这个？不是主要是功能测试和代码和功能测试审核么？" → "需要 去掉attack面，同时审核不应该强制要求使用不同的cli。只需要运行空白的子代理就可以了"（DEC-184 逐字记录）。

## 新增

- DEC-184。
- `keel/review/robustness.md` 增补边界输入一节（原攻击面清单里仍有价值的失败模式并入）。

## 修改

- REQ-027：描述去掉"强制异构"；AC-3 改为"任何改动由未参与实现的空白上下文子代理评审，同一 harness 即可，跨 harness 配方可选"，verification 由 manual 改 auto（回路记录 reviewer / pack 哈希 / tree hash）。
- REQ-007 边界：评审者=空白上下文子代理，同源即可；异构可选不强制（C-40/DEC-184）。
- REQ-028 重写：两把尺（核心代码→鲁棒性清单；辅助代码与记录→需求达成度），AC 由 5 条减为 3 条，不再有攻击面一档与 attack-surface.md 追加义务。
- `reviewloop.ts`：删除 lens 分类、异构判定、`paths` 状态字段与 `loop append-attack`；`evidence.review` 去掉 lens / heterogeneous 字段；disposition 前言不再有 lens / paths。
- k-review 技能重写为两轴 + 分级清单；`headless.md` 头部改为"跨 harness 可选"；config / 模板 / `keel init` 去掉 `optional.heterogeneous_review`。

## 删除

- `keel/review/attack-surface.md`（历史见 git）。
- DEC-159 / DEC-160 → superseded（DEC-184）。
- 测试：lens 分类与异构守卫（chg008 的攻击视角用例、r4 的 ISS-024 / ISS-028 视角用例、ISS-029）。

## 影响评估

- 需求：REQ-007（边界）、REQ-027（描述、AC-3）、REQ-028（整条）；与 CHG-012 同批进入 v6。
- 决策：DEC-159/160 superseded；DEC-178 复核保留。
- 规划：overview-v4 不重开（C-23）；其「评审时机」段里"门禁/证据/审批类改动强制异构 headless"一句由 DEC-184 取代，F7 计划 v4 作为规划补充。
- 问题：ISS-024 / ISS-028（视角分类防线）、ISS-029（f07 计划与 DEC-159/160 对齐）加备注，防线随机制退役。
- 测试义务：REQ-028/AC-1..3 与 REQ-027/AC-3 改为新黑盒；REQ-016/AC-7（各家 headless 配方）保留为可选知识的协议检查。
- 消费项目：0.9.1 `keel update` 得到新 gate；旧 disposition 前言里的 lens / paths 字段被忽略。

## 批准

待用户点头 → APR-006 同批绑定本文件、CHG-012 与 `keel/requirements/v6.md` 正文哈希；人类身份或记录在案的委托提交（C-107/DEC-166）。
