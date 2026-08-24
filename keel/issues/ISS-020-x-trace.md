---
id: ISS-020
status: closed
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: "tests/r2-rework.test.ts; tools/gate/trace.ts uncoveredClaimed"
feature: f17-gate
fingerprint: "trace-per-req-not-per-criterion"
date: 2026-08-24
source: 第二轮独立复审（C-42），复现命令由复审者实跑
severity: 重要
---

# ISS-020 X-trace 仍是逐需求对账，未落实 C-32 的「按验收标准逐条对账」

## 现象

`trace.ts` 已新增 `countCriteria()` 统计每条需求下的 GWT 验收标准条数，但 `xTrace()` 的判据只是「该 REQ 在 tests/ 下有 ≥1 处命中」，**算出来的条数不参与裁决**。C-32 的确认原话是「按验收标准逐条对账」。当前状态：一条需求哪怕有 5 条验收标准、只被 1 个测试提及一次，也判通过。

复现命令：

```bash
node tools/gate/gate.ts trace | tail -2      # uncovered: 0 / 24（逐需求口径）
grep -n "countCriteria" tools/gate/*.ts      # 只在 trace.ts 定义与调用，check.ts 的 xTrace 未使用
```

## 根因

ISS-003 修复时先解决了「追溯根本不进门禁」这一更严重的问题，粒度下沉只做了统计部分未接入裁决。

## 修复

`xTrace()` 改为逐验收标准对账：测试标记需能定位到具体验收标准（如 `REQ-012/AC-2` 或 GWT 序号），验收范围内任一条验收标准零命中即 FAIL。若某类验收标准确实无法机检（如需真人操作），须引用 DEC 说明并计入豁免清单，不得静默算作已覆盖。

## 为何未被更早发现

ISS-003 的 guard 测试只断言「claimed REQ 零命中时 FAIL」，未断言粒度。

## 闭环选择与理由

**门禁逻辑修订 + 回归测试**：claimed REQ 的每条 Given 须有 `REQ-nnn/AC-i` 标记。只覆盖 AC-1、缺 AC-2 → FAIL。
