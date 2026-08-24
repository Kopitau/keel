---
id: DEC-155
title: 本地档单人施工允许 trunk；并行时才强制 worktree
status: confirmed
date: 2026-08-24
features: [F19]
research: []
research_exemption: 落实已确认的 C-112 在单人本地档下的操作边界，不引入新依赖。
adr: false
source_id: ""
---

# DEC-155 本地档单人施工允许 trunk

## 问题

C-112 要求一功能一分支一 worktree。本仓实施 W1–W6 与 P0/P1 全在 master，尾注 Feature: unknown。是没用 F19，还是单人本地档可以不建 worktree？

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 从此一律 worktree | 与 C-112 字面一致 | 无远端、单人、无第二功能并行时纯开销 |
| B 本地档单人允许 trunk；第二功能并行或第二人出现时强制 C-112 | 诚实匹配当前约束 | 需要纪律，不能假装已经在用 worktree |
| C 删除 gate worktree 命令 | 少死代码 | 与已确认 C-112 冲突 |

## 推荐理由

推荐 B。本仓 enforcement_tier=local、无远端、同一时刻一个实施者。prepare-commit-msg 在 master/main 上写 `Feature: trunk`，Agent 取自 identities.agents。

## 用户决定原话

「可以直接在主线写代码，如果是新增大功能，还是推荐开分支」（2026-08-24）

**与推荐方案 B 的差异**：用户为「新增大功能」加了一档**推荐级**（非强制）开分支。
最终语义三档：① 日常改动 / 单人本地档 → 主线直接写；② **新增大功能 → 推荐开分支**（不强制，不拦截，但 skill 与状态输出应提示）；③ 第二功能并行或第二人出现 → 按 C-112 强制一功能一分支一 worktree。

## 影响

已确认。`k-impl` 与 `gate status` 的 `branch_policy` 行提示三档。不拦截日常 trunk。
