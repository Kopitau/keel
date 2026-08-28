---
id: ISS-036
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/chg010-review-loop.test.ts"
feature: f07-review
fingerprint: "redundant-clear-wipes-audit"
date: 2026-08-25
source: 第六轮独立复审（C-42），复现命令由复审者实跑
severity: 重要
requirements: [REQ-027]
---

# ISS-036 重复调用 clear 会清空 repro_runs 审计记录

## 现象

`clear` 成功后再次调用（此时 `blocking_iss` 已空），`runs` 构造为空数组并**覆盖**证据里原有的 `repro_runs`——「到底跑了哪些复现命令、返回什么」的记录被抹平。

实测：
```
第一次 clear → repro_runs: [{{"iss":"ISS-035","command":"exit 1","exit_code":1,"refused":true}}]
再跑一次     → repro_runs: []
```

不绕过门禁（status 仍为 passed），但销毁审计证据——而证据完整性是本框架的立身之本。

复现命令：

```bash
# 一条已修的 blocking ISS（复现命令会失败）
node tools/gate/gate.ts loop clear     # 成功；证据里 repro_runs 有内容
node tools/gate/gate.ts loop clear     # 幂等调用；证据里 repro_runs 变成 []
```

## 根因

`recordClear` 每次都从当前 `blocking_iss` 重建 `runs` 并整体覆盖，没有区分「本次没有要跑的」与「本次跑了但结果为空」。

## 修复

二选一：① 幂等调用不覆盖已有的 `repro_runs`（无新执行则保留旧记录）；② 追加而非覆盖，保留每轮执行历史。

推荐 ②，与框架「追加式记录、不重写历史」的一贯做法一致（C-20）。

## 为何未被更早发现

ISS-031 的 guard 只验证「review 段存在且能挺过 verify」，未验证其**内容不被后续调用抹平**。

## 闭环选择与理由

**回归测试**：断言「clear 成功后再次 clear，`repro_runs` 内容不丢失」。

本条**保持 open**（区别于 ISS-034/035）：它不是自述天花板，而是一个有廉价修法的普通缺陷，留作待办。用户可随时按需处理或转为 wontfix。

## 关闭证据

2026-08-28：按 DEC-177/182 实施追加语义。`recordClear` 新运行记录包含轮次、ISO 时间与当前 tree hash；重复 clear 无新命令时保留已有历史；`evidenceGaps` 只用每个 ISS 的最新运行判定是否已拒绝，早期漏洞态仍保留供审计。黑盒 `tests/chg010-review-loop.test.ts` 实跑同一探针的“未修复退出 0 → 修复后非 0 → 重复 clear → verify → 改树 stale → 再 verify”，2/2 通过；相关评审/证据回归 44/44 通过。
