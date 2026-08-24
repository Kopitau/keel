---
id: ISS-006
status: closed
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: "tests/p1-rework.test.ts; tools/gate/evidence.ts evidenceGaps; check.ts G-done/G-merge/G-retro"
feature: f17-gate
fingerprint: "gate-criteria-incomplete"
date: 2026-08-24
---

# ISS-006 G-done/G-merge/G-retro 判据不全且证据字段未对账（P1-2/P1-3）

## 现象

G-done 只看树哈希；伪造 verify.json + 树哈希即可 PASS。junit.xml / report_hash / counts / dirty 未读。

## 闭环选择与理由

**门禁 + 回归测试**：`evidenceGaps` 交叉核对 junit；G-merge 加追溯与 open ISS；G-retro 加 OVERVIEW 时间与销项。
