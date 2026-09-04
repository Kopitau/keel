---
id: DEC-192
title: 证据的树哈希只算代码：记录目录（除 config.json）不进树哈希、不算脏
status: confirmed
date: 2026-09-04
features: [F6, F17]
research: []
research_exemption: "对 C-33 边界的取舍；证据是 zhaoxi 一天重跑 verify 十二次以上的实测（每次记录改动都让树哈希过期）"
adr: true
source_id: "REQ-006"
change: CHG-016
---

# DEC-192 证据的树哈希只算代码

## 问题

C-33「完成 = 证据绑定树哈希」把记录目录也算进树：改一条调研、一句决策、一行工作日志，树哈希就变，G-done / X-evidence 报「stale tree_hash」，agent 只能重跑全量测试。zhaoxi 9 月 3 日为此重跑十二次以上，每次 30 秒测试加 30 秒轮询。

## 选项对比

| 选项 | 内容 | 代价 |
|---|---|---|
| **A 只算代码** | 树哈希与「脏」都不看记录目录；只有记录目录里的 `config.json`（测试命令）算 | 需求 / 计划变了而代码没变时，证据仍"新鲜"——但 X-trace 是实时算的，验收覆盖照样查得出 |
| B 维持现状 | 每次记录改动都重跑 | 摩擦持续 |

## 用户决定原话

> C1 A
（2026-09-04，对「记录改动要不要让证据过期」的答复。）

## 影响

- `gitWriteTree` 把整个记录目录从临时索引里去掉，再把 `config.json` 加回；`gitDirty` 同样只看代码与 `config.json`。ISS-070 的认领标记例外随之被覆盖（它在记录目录里）。
- 评审回路的「通过时的树」也不再因记录移动；「方案在评审通过后才完成」改由处置表里的 `plan_complete` 标记判断（ISS-055 语义保留）。
- 破坏点：既有 verify.json 的树哈希与新算法不同，升级后主干重跑一次 verify。
