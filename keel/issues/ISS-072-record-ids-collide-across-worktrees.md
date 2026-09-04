---
id: ISS-072
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/ids.ts (listNumbersEverywhere, duplicateRecordIds); indexgen.ts; tests/chg016-audit-round2.test.ts"
feature: "F19"
fingerprint: "ids-allocated-per-tree-only"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-072 并行工作树各自分配记录编号，合并时 DEC / APR / ISS 三组编号相撞

## 现象

zhaoxi 主干与 F6 分支各自开了 DEC-021、APR-006、ISS-032；合并时三组碰撞，agent 停下问用户，用户答「C」后重编了一份已批准的审批单并重绑哈希（zhaoxi DEC-033）。

## 影响

一次 C-21 停机、已批准工件被改号重绑；任何两条并行分支都会复现。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

`nextNumber` 只扫当前树的记录目录。

## 修复

取号时并入所有工作树磁盘目录（含未提交文件）与所有 `keel/*` 分支树（`git ls-tree`）的最大号；`gate index` 遇到同号两份文件直接报错。

## 为何未被更早发现

keel 自身只有一条主干在开发；C-112「一功能一工作树」第一次被真正并行使用是在 zhaoxi。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-019/AC-7 gate new allocates ids across keel/* branches and other worktrees, and gate index refuses duplicates）。
