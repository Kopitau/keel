---
id: DEC-175
title: CI 验收拆为本地契约测试与真实运行证据
status: confirmed
date: 2026-08-27
features: [F17, F24]
research: []
adr: false
source_id: "REQ-017"
---

# DEC-175 CI 验收拆为本地契约测试与真实运行证据

## 问题

REQ-017 的 L3 CI 复算应保留为一个只能在远端验证的 AC，还是拆成可在本地验证的 workflow 契约与真实平台运行证据？

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A. 本地验证 workflow 契约；真实 GitHub run 作为发布证据 | 日常可稳定回归，同时不把配置文件存在冒充真实 CI 成功 | 需求与证据分成两层，记录稍多 |
| B. 保留单一 CI-only AC | 文字和结构较少 | 本地永远只能 proxy，CI 未运行时无法验收 |

## 推荐理由

推荐 A。配置契约和真实执行回答的是两个不同问题，应分别留证据。

## 用户决定原话

> 4A

## 影响

- requirements v4 改写 REQ-017/AC-3：本地验收 workflow 确实调用同一 gate，并覆盖 Windows/macOS/Linux × Node 22/24。
- 真实 GitHub Actions 六格运行结果进入发布/平台证据，不由本地测试伪造。
- 首次真实运行前，发布证据仍未完成；但本地 workflow 契约不再因“CI never ran”永久成为 proxy。
