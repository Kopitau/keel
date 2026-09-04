---
id: ISS-077
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/reviewloop.ts (ownerFeatureOf, 现象); tests/chg016-audit-round2.test.ts"
feature: "F7"
fingerprint: "review-iss-feature-empty"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-077 评审回路开的问题单不归功能、「现象」只是标题复读

## 现象

zhaoxi 评审开的 ISS 全部 `feature` 为空，`## 现象` 等于标题；`gate status` 的 open_issues 无法按功能归属。

## 影响

问题单不能回到它所属功能的工作里；现象没有信息。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

`fileFindings` 只填标题；pack 没有功能作用域可用。

## 修复

有 `ac` 时按验收标准反查所属功能（最新计划 `req:` 含该 REQ 的功能）填 `feature:`；finding 的 `body` 填进「现象」。

## 为何未被更早发现

0.9.x 的评审是按功能派的，作用域隐含在会话里；方案级评审之后没有人补这一层。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-010/AC-8 an ISS opened by the review loop is named by its fingerprint, owned by the criterion's feature, and carries the finding body as 现象）。
