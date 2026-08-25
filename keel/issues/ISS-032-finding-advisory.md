---
id: ISS-032
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/r5-rework.test.ts (ISS-032); tools/gate/reviewloop.ts fileFindings"
feature: f07-review
fingerprint: "e145fa47546fbdf5"
date: 2026-08-25
---

# ISS-032 非阻断 finding 被静默丢弃，评审无 advisory 通道

## 现象

复现命令：

```
node -e "const s=require('fs').readFileSync('tools/gate/reviewloop.ts','utf8');process.exit(/advisory/i.test(s)?1:0)"
```

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

**回归测试**：`blocking: false` 的 finding 必须写入 worklog「待办（advisory）」并在 ingest/status 计数，不得消失。

落地：`fileFindings` 增加 advisory 分支。Guard：`tests/r5-rework.test.ts` ISS-032。


`fileFindings`（reviewloop.ts:235-275）只有两条分支：`f.blocking && f.repro` → 立 ISS；`f.blocking`（无 repro）→ 记 worklog「待核实」。**`blocking: false` 的 finding 两条都不进，直接消失，不报错不留痕。**

后果：评审者只有两个选择——虚报严重度把 advisory 标成 blocking，或者眼看发现被吞掉。C-42 规定 advisory 应「进待办不阻塞」，当前没有这个通道。

本次评审即遇到此问题：复审者的三条「重要但非阻断」发现，若如实标 blocking:false 会全部消失，故只能按回路语义（完成前必须处理）标为 blocking。

修法：增加 advisory 分支，写入待办或 worklog 并在 loop status 中计数；或在 ingest 时对 blocking:false 的 finding 明确报错要求归类，不得静默丢弃。
