---
id: ISS-033
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/r5-rework.test.ts (ISS-033); tools/gate/reviewloop.ts recordClear"
feature: f07-review
fingerprint: "4c099b2afe22e68b"
date: 2026-08-25
---

# ISS-033 loop clear 拒绝清零时返回 exit 0，与 ingest 不一致

## 现象

复现命令：

```
node -e "const s=require('fs').readFileSync('tools/gate/reviewloop.ts','utf8');const i=s.indexOf('still_open=');process.exit(i>0&&s.slice(Math.max(0,i-80),i).includes('return ok')?0:1)"
```

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

**回归测试**：复现命令仍成功时 `gate loop clear` 必须 exit 1。

落地：拒绝清零走 `fail(...)`，与 ingest 一致。Guard：`tests/r5-rework.test.ts` ISS-033。


`reviewloop.ts:656` 在拒绝清零（问题仍复现）时走 `ok(...)` 返回，退出码为 0。而 `ingest` 拒绝时返回 exit 1。

实测：blocking ISS 的复现命令仍 exit 0（问题未修）→ `clear` 打印 `review loop repairing still_open=ISS-030` 但 `exit=0`。

后果：脚本与 CI 无法检测 clear 的拒绝，只能靠解析文本。与框架自身「退出码必须诚实」的一贯要求（见 ISS-019 修复）不一致。

修法：拒绝路径返回非零；保持与 ingest 一致。
