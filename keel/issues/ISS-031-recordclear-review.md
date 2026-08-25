---
id: ISS-031
status: closed
defense_kind: "契约测试"
defense_pointer: "tests/r5-rework.test.ts (ISS-031); tools/gate/reviewloop.ts recordClear"
feature: f07-review
fingerprint: "2e46fbdf85679e97"
date: 2026-08-25
---

# ISS-031 recordClear 在证据不存在时静默跳过写入，review 段因命令顺序丢失

## 现象

复现命令：

```
node -e "const s=require('fs').readFileSync('tools/gate/reviewloop.ts','utf8');process.exit(s.includes('if (ev) writeEvidence')?0:1)"
```

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

**契约测试**：无 `verify.json` 时跑 `recordClear`，证据必须含 `review` 段。

落地：`recordClear` 在证据缺失时写入占位 Evidence 再挂 review，不得 `if (ev)` 静默跳过。Guard：`tests/r5-rework.test.ts` ISS-031。


`reviewloop.ts:646` 为 `if (ev) writeEvidence(ctx, attachReview(ev, review));` —— 证据文件不存在时**静默跳过**，不报错也不留痕。

实测：按 `loop clear → gate verify` 顺序走，最终证据里没有 `review` 段（`'review' in evidence === false`）。按 `verify → clear` 顺序才有。

后果：审计证据里丢失「谁评审、什么视角、跑了哪些复现命令、异构是否满足」。门禁本身不受影响（它读 state.json），但 CHG-008 明文要求「清零判定的执行结果须写进证据 JSON」未达成。

现有测试 `ISS-026 verify preserves the evidence review field` 只覆盖「预置 review 后 verify 不抹掉」，**未覆盖「正常流程会写入」**。

修法：证据不存在时应报错或先生成证据，不得静默跳过；补一条「clear 之后证据必含 review 段」的测试。
