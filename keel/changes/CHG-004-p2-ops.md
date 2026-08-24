---
id: CHG-004
status: approved
date: 2026-08-24
requirements_from: v2.md
requirements_to: v2.md
---

# CHG-004 P2：状态波次、index 大小写、中文 slug、C-139 v1 范围

## 动机

REWORK P2。不改需求正文。C-139 按 DEC-156 推荐 B 落地可机检部分；live 五家实点明确不做。

## 新增

- `config.wave`；`asciiSlug` 无英文时用标题哈希
- `X-casefold` 读 git index；`X-owners`（local skip）
- 流程 REQ 模板测试；DEC-148 golden digest
- DEC-155 / DEC-156 proposed；LES-001~003

## 修改

- master/main 尾注 Feature: trunk；Agent 用 identities.agents

## 删除

无。

## 批准

2026-08-24 用户原话：「CHG-002～006 批准」。提交身份 kopit <wwillmee@gmail.com>（C-107）。
