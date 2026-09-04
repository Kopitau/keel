---
id: ISS-073
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/cli/update.js (mergedAgentsMd); AGENTS.md markers; tests/chg016-audit-round2.test.ts"
feature: "F23"
fingerprint: "agents-md-not-managed"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-073 keel update 不管项目根的 AGENTS.md，试点的规则文件停在初始化那天

## 现象

zhaoxi 的 AGENTS.md 是 8 月 25 日初始化时抄来的，此后经历 0.9.2/0.9.3/0.10.0 三次更新都没变：agent 至今说「六门」、不知道 DEC-183 自主回路，18 次收尾只有 2 次给了下一步。

## 影响

消费项目的 agent 按过期规则工作；发布说明里的新规则到不了它们的根文件。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

AGENTS.md 是 `keel init` 复制的，但不在更新器的管理清单里——因为项目会在里面写自己的规则，整文件覆盖不可接受。

## 修复

keel 的 AGENTS.md 用 `<!-- keel:begin -->` / `<!-- keel:end -->` 围起；更新器只替换标记之间的段落，标记外的项目文本原样保留；没有标记的旧文件不动，预览里给一行提示。

## 为何未被更早发现

keel 自己的 AGENTS.md 就是源文件，从不需要被更新。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-025/AC-11 keel update rewrites only the keel section of AGENTS.md）。
