---
id: ISS-012
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/w3-verify.test.ts; tests/w4-skills.test.ts; tests/w6-pilot.test.ts"
feature: f17-gate
fingerprint: "tests-protect-vulnerabilities"
date: 2026-08-24
---

# ISS-012 测试把漏洞写成合格断言且部分非 hermetic（P1-9）

## 闭环选择与理由

P0 已把「无证据也通过」改成负面。本波：技能目录与 catalog 对账（不再 `length===16` 自指）；bypass 测试改为提交带 `Keel-Precommit: skipped` 的 hermetic 仓库。
