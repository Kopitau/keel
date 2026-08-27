---
id: DEC-180
title: REQ-025 唯一归属 F23，F16 仅作关联
status: confirmed
date: 2026-08-27
features: [F7, F16, F23]
research: []
adr: false
source_id: "REQ-025"
---

# DEC-180 REQ-025 唯一归属 F23，F16 仅作关联

## 问题

requirements v4 需要让每条 REQ 都有一个唯一负责功能。REQ-025 同时写成 `F16 / F23`，而 REQ-027/028 又没有出现在附录映射里，导致规划、追溯和验收不知道该由谁负责。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A. REQ-025 归 F23，F16 只关联；REQ-027/028 归 F7 | 安装/升级属于框架自举的交付责任，平台适配仍可被追溯；评审扩展统一归 F7 | F23 会拥有 REQ-023 与 REQ-025 两条需求 |
| B. REQ-025 归 F16，F23 只关联 | 全局 CLI 看起来集中在平台桥接功能 | 升级、迁移和自举的主要责任被拆散，和现有 F23 计划不一致 |

## 推荐理由

推荐 A。F16 负责平台接入与技能镜像，F23 负责 keel 管理自身、安装和升级边界；因此 F23 更适合作为 REQ-025 的唯一 owner。REQ-027/028 是 F7 的自动评审扩展，应由 F7 统一负责。

## 用户决定原话

> 2 A

## 影响

- requirements v4 中 REQ-025 的 `feature` 只写 `F23`，另用 `related_features: [F16]` 表示协作关系。
- REQ-027 与 REQ-028 的唯一 owner 都是 F7。
- 文末映射必须覆盖全部 28 条 REQ，并明确“每条 REQ 恰有一个 owner；一个 F 可以拥有多条 REQ”，不再声称 REQ 与 F 一一对应。
- 后续计划与 trace 以 owner 承担验收责任；related feature 只表示接口或实现耦合，不重复计算责任。

## 后果与复审条款

非 ADR；若将来拆分安装器为独立功能，应通过新 CHG/DEC 调整 owner，不回写本文件。
