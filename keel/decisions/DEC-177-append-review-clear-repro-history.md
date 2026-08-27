---
id: DEC-177
title: gate loop clear 追加复现运行历史
status: confirmed
date: 2026-08-27
features: [F7]
research: []
adr: false
source_id: "ISS-036"
---

# DEC-177 gate loop clear 追加复现运行历史

## 问题

重复执行 `gate loop clear` 时，已有 `repro_runs` 是只保留上一次结果，还是追加每轮执行历史？

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A. 追加每轮执行结果 | 审计链完整，不会被重复 clear 抹平 | 证据会增长，并需记录轮次或时间来区分批次 |
| B. 没有新 blocking 时保留旧值但不追加 | 实现简单、幂等 | 看不到后续 clear 做过哪些复验 |

## 推荐理由

推荐 A，与追加式记录和证据不可抹除的原则一致。

## 用户决定原话

> 6A

## 影响

- `recordClear` 不再用本轮数组覆盖历史 `repro_runs`；每轮结果追加并带可区分的轮次或时间信息。
- 没有执行任何复现命令时不得把历史写成空数组。
- ISS-036 按追加语义补回归测试后才能关闭。
