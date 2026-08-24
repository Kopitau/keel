---
id: DEC-158
title: G-req / G-plan 改条件判定：真空项目 SKIP，有实施活动无基线才 FAIL
status: confirmed
date: 2026-08-24
features: [F17]
research: [RES-902]
adr: false
source_id: C-158
change: CHG-007
requirements: [REQ-026]
---

# DEC-158 空项目的门禁语义

## 问题

用户追问「G-req / G-plan 为什么会 fail」时暴露的不一致：框架里其他门禁遇到「还没有东西可查」时是 SKIP（G-done「no completion claims」、G-retro「no feature summaries yet」、X-trace「no claimed-done features」），唯独 G-req / G-plan 一律 FAIL。新装项目一上来就是红的。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 维持 FAIL | fail-closed，与三轮返工的方向一致 | **警报疲劳**：人被训练成「红是正常的」，真出问题时反而不当回事 |
| B 一律改 SKIP | 新项目干净 | **退回 fail-open**：agent 可以永远不写需求，门禁永远安静 —— 正是花三轮才堵掉的模式 |
| **C 条件判定**（选定） | 消除警报疲劳且**比现状更严** | 需要一个「实施活动」的客观判据 |

## 推荐理由

C 同时满足两个方向：真空项目不报红（消除疲劳），一旦动手却无基线立刻报红（比现状更严 —— 现状只要有需求书就 PASS，不管你是否在无规划的情况下就开始写代码）。判据必须是**客观痕迹**（features 目录内容 / worklog / summary），不能靠 agent 自述，否则又回到自述即通过。

## 用户决定原话

「纳入」（2026-08-24，在追问 G-req/G-plan 失败原因、复审者提出条件判定方案后）

## 影响

- G-req：无实施活动且无需求基线 → SKIP（提示「尚未开始，跑 k-new 建立需求基线」）；有实施活动却无基线 → FAIL；有基线但含未消解 `[NEEDS-CLARIFICATION]` → 仍 FAIL（C-05 不变）。
- G-plan：同样条件化；有实施活动却无当前规划、或规划缺「接口与耦合」表 → FAIL（C-24/C-38 不变）。
- 本改动**只放宽「真空项目」这一种情形**，其余判定一律不放宽。
- guard 要求：三条负面测试 ——（1）真空项目 → SKIP；（2）建一个 feature 目录后无基线 → FAIL；（3）有基线但带 NEEDS-CLARIFICATION → 仍 FAIL。
