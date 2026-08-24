---
id: ISS-009
status: closed
defense_kind: "门禁检查"
defense_pointer: "tests/p1-rework.test.ts; tools/gate/check.ts gResearch"
feature: f02-research
fingerprint: "research-pointer-not-on-disk"
date: 2026-08-24
---

# ISS-009 G-调研不校验 RES 文件存在（P1-6）

## 闭环选择与理由

adr 决策的 research: 列表逐条 existsSync。缺文件 FAIL。
