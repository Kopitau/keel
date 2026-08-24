---
id: LES-003
date: 2026-08-24
features: [F6, F24]
destination: project
source_candidates: [ISS-016, ISS-017]
---

# LES-003 本地档没有 CI 权威；事后补测试补不回红灯证据

## 现象

W1–W6 先实现后测试。无远端，GitHub 矩阵从未跑过。DEC-148 的跨平台风险只在 Windows 上自测。

## 教训

C-31/C-35 从当下开始：核心缺陷先写会失败的测试。跨平台一致性在没有 runner 之前，只能 golden + 规范化哈希，并公开标注 [未在 CI 跑过]。

## 适用边界

local 档、尚未配远端。

## 反例

一旦有 GitHub remote 且 gate-ok 为 required check，这条经验应改写。

## 去向

本项目规则。配远端后关闭 ISS-016 的 wontfix。
