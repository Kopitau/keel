---
id: ISS-008
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/p1-rework.test.ts liveClarifications; tools/gate/check.ts"
feature: f01-requirements-interview
fingerprint: "gwt-line-skips-clarification"
date: 2026-08-24
---

# ISS-008 - Given 行豁免使验收标准里的澄清标记隐形（P1-5）

## 现象

liveClarifications 跳过所有 `- Given` 行。需求验收全是 GWT。

## 闭环选择与理由

只豁免反引号字面量，以及「标 [NEEDS-CLARIFICATION」文档句（v2 自指，不改冻结文件）。活标记在 Given 行上仍计数。
