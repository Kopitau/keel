---
id: DEC-167
title: 审批路径触发提交时守卫（代替字面上的全量 check）
status: confirmed
date: 2026-08-26
features: [F17, F18]
research: [RES-903]
adr: false
source_id: ""
---

# DEC-167 审批路径触发提交时守卫

## 问题

本地档下 quick 跳过的七项检查（含 X-apr）从未自动运行，C-107 的唯一机器守卫是纸面的。已向用户提案「staged 命中 `keel/approvals/` 时强制跑全量 check」，用户确认（「A 做吧」涵盖两问）。

## 实施偏差披露（必须写明）

**字面上的"全量 check"在 pre-commit 时点结构性不可行**：G-done / X-evidence 要求工作区干净且证据树哈希与当前树一致，而提交进行中必然有 staged 变更 → 每次审批提交都会被自己挡死。

因此落地为**语义等价但更强**的形式：`gate hook pre-commit-apr`——在提交时点直接校验**正在落地的这条审批提交**（staged 的 APR 内容 + 即将使用的 git 身份 + 当前 harness 环境），这是事后跑 X-apr 也做不到的（X-apr 只能看历史）。X-apr 本身照常在 `gate verify` / 全量 check / 未来 CI 时运行，构成事后复核层。

## 用户决定原话

> A 做吧

（对应提案原文：「keel/approvals/ 变更触发全量 check——做不做？（建议做，几秒的代价换 X-apr 从纸面变现实）」。落地形式与提案字面的差异见上节，语义——审批提交必被机器校验——不变且更早。）

## 影响

`.githooks/pre-commit`：staged 命中 `keel/approvals/` → `gate hook pre-commit-apr`，拒绝两类：agent git 身份的审批提交；agent 环境且 APR 无 `delegated:` 记录。判据与 [[DEC-166]] 共享实现。守卫测试断言 hook 接线与判据行为。
