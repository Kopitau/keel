---
id: ISS-017
status: wontfix
defense_kind: "显式不修"
defense_pointer: "keel/lessons/LES-003-tdd-and-ci-need-remote.md"
feature: f06-evidence
fingerprint: "tests-written-after-code"
date: 2026-08-24
---

# ISS-017 W1–W6 测试均为事后补，违反 C-31/C-35（P2-4）

## 闭环选择与理由

**显式不修历史**：无法给已经落地的波次补红灯证据。C-35 核心新测试先红后绿从本波起遵守（P0/P1/P2 先写负面测试）。不把「曾经事后补」改写成当时就 TDD。
