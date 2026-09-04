---
id: ISS-075
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/check.ts (gMerge anythingBuilt, templatePlans); status.ts (unapproved); tests/chg016-audit-round2.test.ts"
feature: "F17"
fingerprint: "fresh-project-gate-verdicts"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-075 新项目一批准基线，全量门禁就红、状态行提前说开工、模板计划也当作已规划

## 现象

taotie 批准 APR-001 后 `gate check` 立刻 `FAIL G-merge evidence: verify.json missing`（还没有一行代码），agent 把它写进 handoff「已知坑」；此前 13 条决策还是空模板时 `gate status` 已说「next: start F1 (frontier)」；`req: [REQ-000]` 的模板计划能过快门并进入前沿。

## 影响

教下一个上下文忽略红灯；新上下文被指向开工。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

G-merge 只在「没有任何 approved APR」时跳过，不区分基线审批与合并审批；`hasBaseline/hasPlan` 只看文件存不存在；G-plan 不认识脚手架占位符。

## 修复

G-merge 在没有认领、没有 summary、没有 verify.json 时 SKIP；当前需求 / 总览自称 proposed 且无 APR 绑定（项目有 approvals 目录）时 `next:` 说「finish k-new step 5 (APR)」；带 REQ-000 的计划 G-plan 记 WARN。

## 为何未被更早发现

keel 自己的门禁从一开始就有代码和证据；空项目语义（REQ-026）只覆盖了没有基线的情形。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-026/AC-5 G-merge stays SKIP until something is built; status says the baseline is unapproved; a scaffold plan warns）。
