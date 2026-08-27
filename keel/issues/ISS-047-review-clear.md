---
id: ISS-047
status: closed
defense_kind: "决策修订"
defense_pointer: "keel/decisions/DEC-182-review-repro-exit-code-contract.md"
feature: "F7"
fingerprint: "v4-review-clear-fixed-predicate-schema"
date: 2026-08-27
---

# ISS-047 review clear 依赖的『已修复谓词』没有可机读的打开态契约

## 现象

复现命令：

```
node -e "const fs=require('node:fs');const s=fs.readFileSync('keel/requirements/v4.md','utf8');const bad=!s.includes('问题可复现时退出')||!s.includes('在问题被修复或攻击被拒时退出非')||!s.includes('时开 blocking ISS')||!s.includes('表示问题仍可复现、不得 clear');process.exit(bad?0:1)"
```

## 根因

需求只写了“已修复谓词”，但没有把现行 gate 的退出码约定提升为用户确认的接口。

## 修复

DEC-182 选择攻击探针协议；REQ-010 与 REQ-027 明确 ingest 在漏洞态要求退出 0，clear 在修复/拒绝态要求同一命令退出非 0。

## 为何未被更早发现

前两轮复核只确认“必须不再复现”，没有追问机器如何从同一命令的结果得出该结论。

## 闭环选择与理由

选择决策修订：这是跨项目长期依赖的 review-loop 接口，须由 DEC 固定；后续实现阶段再补 ingest/clear 黑盒守卫。

可能复发的不许只留档。


同一复现命令在不同项目中可能以 0 表示漏洞存在，也可能以非 0 表示断言失败；『原问题不再复现』本身不是自动程序可判的协议。当前 AC 因而既不能保证每个 open ISS 都实际带有 clear 所需谓词，也无法让 verification:auto 客观判断 clear 是否正确，容易把仍可复现的问题清零或让问题永远无法清零。应在 finding→ISS 的打开协议中增加结构化 fixed predicate（至少规定漏洞态和修复态的可观察结果/退出码），并让 ingest 在缺失时拒绝自动开 ISS。
