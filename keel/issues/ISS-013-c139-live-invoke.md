---
id: ISS-013
status: wontfix
defense_kind: "显式不修"
defense_pointer: "keel/decisions/DEC-156-C-139-skill-acceptance-v1.md; tests/p2-rework.test.ts"
feature: f16-platforms
fingerprint: "five-harness-live-skill-invoke"
date: 2026-08-24
---

# ISS-013 五家 harness live 点技能（C-139 剩余）

## 现象

C-139 要求五平台触发实测。本机 dsh/pi 未装；付费对话实点未做。

## 闭环选择与理由

**显式不修**：v1 用技能协议机检 + 发现层（DEC-156 proposed）。live 实点等 CLI 齐、用户同意花配额。不假装已经点过。
