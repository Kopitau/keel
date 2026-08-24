# 交接 — CHG-008 自动评审回路已实施

- date: 2026-08-24
- harness: Grok Build
- model: grok-4.6
- session: CHG-008 impl

## 做了什么 / 为什么

实施 CHG-008：声称完成必须走评审回路（G-done）。`gate loop pack|ingest|status`；blocking 无复现命令不得开 ISS；清零必须实跑复现且被拒；3 轮熔断；攻击面镜头强制异构、禁止静默同源。清单在 `keel/review/*.md`。k-review / k-impl / k-accept 已改。

## 当前功能与阶段

- 阶段：`CHG-007`（config.wave 未改）
- 开场：`node tools/gate/gate.ts status`

## 下一步

1. 人类批准 CHG-008（kopit）。
2. 远端 URL；APR-001 仍 draft。

## 未决问题

- CHG-008 仍 proposed（实现已落地）
- 远端 URL
- APR-001 draft

## 该读文件

1. 本文件
2. `keel/changes/CHG-008-auto-review-loop.md`
3. `tests/chg008-review.test.ts`
4. `tools/gate/reviewloop.ts`
5. `.agents/skills/k-review/SKILL.md`
