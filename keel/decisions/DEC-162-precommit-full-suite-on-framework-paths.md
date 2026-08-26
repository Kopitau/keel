---
id: DEC-162
title: 框架敏感路径入库前强制全量测试
status: confirmed
date: 2026-08-26
features: [F17]
research: [RES-903]
adr: false
source_id: ""
---

# DEC-162 框架敏感路径入库前强制全量测试

## 问题

2026-08-25 一次只改 `keel/config.json` 的提交（执法档 local → github）打破了两条测试，套件红了一整天无人知晓（[[ISS-041]]）。根因：pre-commit 只跑 `check --quick`，`gate check` 不含测试，CI 从未运行——"改配置"全程碰不到测试套件。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 每次提交都跑全量 | 无死角 | 每次提交 +40 秒，违背 C-119 的成本权衡 |
| B 仅框架敏感路径触发全量 | 死角恰好覆盖事故路径；日常提交零增量 | 敏感路径清单需要维护 |
| C 不改，等 CI | 零本地成本 | CI 至今未跑过；等待期内同类事故必然复发 |

## 推荐理由

选 B。事故路径就是框架自身形状的路径——配置、门禁源码、技能、hook。清单：`keel/config.json`、`tools/gate/`、`.agents/skills/`、`.githooks/`（最后一项超出用户确认的三项，属同类，一并纳入并在此披露）。

## 用户决定原话

> 4 可以

（提案原文：「pre-commit 检测到 keel/config.json、tools/gate/**、.agents/skills/** 变更时跑一次全量测试」，代价「改这些文件时提交要等约 40 秒」。）

## 影响

`.githooks/pre-commit`：staged 路径命中清单 → `node --test` 全量，红则拒绝提交。守卫测试断言 hook 文本含触发器（tests/r6-field-guards.test.ts）。C-119 的 quick 权衡对其余路径不变。
