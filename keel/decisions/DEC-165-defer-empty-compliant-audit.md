---
id: DEC-165
title: 其余五项「空即合规」检查暂不审计
status: superseded
superseded_by: DEC-183
superseded_date: 2026-08-29
date: 2026-08-26
features: [F17]
research: [RES-903]
adr: false
source_id: ""
---

# DEC-165 其余五项「空即合规」检查暂不审计

## 问题

ISS-037 的根因模式（用"文件存在"代理"阶段已开始"）在 G-plan / G-done / G-retro / X-owners / X-full 五项检查上同样存在。是否现在逐项复核它们的 SKIP 判据？

## 用户决定原话

> 3 先不用

## 影响

暂不审计，本条即"显式不修"的留档（C-59 最低档，防止后续被当作遗漏重新提出）。**重估触发条件**：任一消费项目再次出现"早期阶段廉价绿灯"型事故，或首次 CI 运行暴露这五项中任何一项的静默行为。线索保留在 RES-903「剩余不确定性」。

## 复核（2026-08-29，CHG-011 / DEC-183）

「空即合规」五项检查（X-oss / X-knowledge / X-decisions / X-ids / X-types 等）已整体删除，暂缓审计的对象不复存在。 状态改为 superseded → DEC-183（CHG-011，APR-004）。
