---
id: ISS-071
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/trace.ts (claimPlanFiles, draftClaimedReqs); check.ts (xTrace); tests/chg016-audit-round2.test.ts"
feature: "F17"
fingerprint: "x-trace-reads-every-plan-version"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-071 追溯把未批准的计划草稿当成已认领范围，草稿引用新需求就报红、提交被拒

## 现象

zhaoxi 在 F2 工作树里为 CHG-002 起草了需求 v2 与九份 plan v3（引用还没进基线的 REQ-017～019）。X-trace 把每个已完成功能目录下的所有计划版本都算作认领范围，于是报「uncovered acceptance criteria: REQ-017, REQ-018, REQ-019」FAIL；X-trace 不可豁免，提交钩子拒绝。43 个文件（需求 v2、总览 v3、9 份计划、十几条决策与调研）从 9 月 4 日早上起没提交过；Codex 又吞掉了 git 输出，agent 一整天以为树是干净的。

## 影响

一天的重基线工作只在磁盘上；任何「变更在飞行中」的项目都无法提交草稿。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

`claimedFeatures` 读 `plan/` 下所有 `.md` 的 `req:` 并取并集；`uncoveredClaimed` 对当前需求里找不到的 REQ 一律记 missing → FAIL。

## 修复

`claimPlanFiles`：有 APR 绑定的版本里取最高的那一份作为认领范围（都没绑定时才取并集）；当前基线里不存在的 REQ 由 `draftClaimedReqs` 单列，X-trace 记 WARN「plan cites requirements outside the current baseline」，不再 FAIL；脚手架的 REQ-000 仍按 ISS-044 报红。

## 为何未被更早发现

keel 自己从未在一个功能已完成、下一版计划仍是草稿时跑过门禁；第一次出现在试点的第二个变更单。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-006/AC-11 a draft plan version citing unbaselined requirements only warns）。
