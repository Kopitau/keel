---
id: CHG-003
status: approved
date: 2026-08-24
requirements_from: v2.md
requirements_to: v2.md
---

# CHG-003 P1 返工：补齐门禁判据与检测器

## 动机

REWORK.md P1：G-done/G-merge/G-retro 缺 DESIGN 列出的判据；证据字段未对账；`--no-verify` 检测器被 C-102 抹平；GWT 行豁免后门；G-调研不查文件存在；C-107 不查提交作者；worktree 下 tree hash 为空。需求正文不改。

## 新增

- `Keel-Precommit: ok|skipped` 尾注 + pre-commit stamp
- `X-apr` 查已批准 APR 的 commit author
- `evidenceGaps`：junit.xml / report_hash / counts / dirty / command 对账
- worktree 安全的 `git rev-parse --git-dir`

## 修改

- `liveClarifications` 只豁免反引号字面量和「标 [NEEDS-CLARIFICATION」文档句
- G-research 对 adr 的 RES 指针做 existsSync
- `gate approve` 要求 identities.humans 非空且身份在列
- G-done/G-merge/G-retro 按 C-33/C-45/C-56 补追溯、问题闭环、OVERVIEW 时间

## 删除

无。

## 批准

2026-08-24 用户原话：「CHG-002～006 批准」。提交身份 kopit <wwillmee@gmail.com>（C-107）。
