---
id: DEC-156
title: C-139 技能验收 v1 = 协议机检 + 发现层；五家 live 实点另开
status: proposed
date: 2026-08-24
features: [F16, F23]
research: []
research_exemption: 把已确认 C-139 拆成本仓现在能做和明确做不到的两截，避免再静默顺延。
adr: false
source_id: C-139
---

# DEC-156 C-139 技能验收 v1 范围

## 问题

C-139：「技能=无歧义测试+五平台触发实测」。W4/W5 只做了 PATH/inspect + description 机检，未向用户报告做不到。P2-1 要求给可行方案或明说做不到。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 现在付费五家 live 点技能 | 字面满足 | 本机 dsh/pi 未装；四家 CLI 调模型要配额；评审禁止假装实点 |
| B v1 机检：SKILL.md 有步骤/命令；流程 REQ 用模板测试覆盖；发现层沿用 W5。live 五家列为后续 | 可进 CI；不注水 | 不是「未读过的模型执行一遍」 |
| C 宣布 C-139 做不到 | 诚实 | 10 条流程 REQ 继续零覆盖 |

## 推荐理由

推荐 B，本波按 B 落地。A 的阻塞写在 ISS-013（wontfix until CLIs+quota）。C 会再欠 P0-3 的覆盖。

## 用户决定原话

（proposed。用户指示「修 P2」视为授权按推荐 B 实施；若要改成 A 或 C 再否决本 DEC。）

## 影响

`tests/p2-rework.test.ts` 为流程 REQ 与技能协议的守卫。
