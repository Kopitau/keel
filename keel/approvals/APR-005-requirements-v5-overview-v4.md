---
id: APR-005
status: approved
date: 2026-08-29
approver: "kopit <wwillmee@gmail.com>"
delegated: "「1 同意 以我的身份提交 2 升级由你去跑」(2026-08-29)"
scope: "需求基线 + 统一规划"
artifacts:
  - path: "keel/requirements/v5.md"
    version: "v5"
    content_sha256: c10a61c69d2e2ae6afa4b338047077f4bc68ec1abf39236cdee3d38cf270354c
  - path: "keel/plan/overview-v4.md"
    version: "v4"
    content_sha256: 83f36a343082ddb3879889182f457e0a8bfa282e4dd842f91cef2116cbfb7027
---

# APR-005 需求 v5 与统一规划 overview-v4 整体确认

## 范围

需求基线 `keel/requirements/v5.md`（CHG-011 的需求落点，28 条 REQ）与统一规划 `keel/plan/overview-v4.md`（CHG-011 的切片 Q1–Q7 与「切片 → 测试义务」表）。两份文件按 k-change 在 APR-004 批准 CHG-011 后作为完整新版写出，经新上下文子代理缺口猎取（40 条，处置写在 v5「未决问题」）与 Codex 异构方案级评审（3 条 ISS 已清）后，由用户整体点头一次。

## 工件与哈希

哈希绑正文（前言之外的规范化正文，CHG-011 / REQ-018 AC-1）：元数据不作废，错字修正记理由放行，语义变才重批（C-106）。

## 用户点头原话

- 2026-08-29，agent 列出 v5「待用户点头的解读」9 条（正文哈希与按 APR 限定的 waiver、quick 四条、小功能判据、summary 时点、G-done 判法、REQ-007 升必需、REQ-026 保留编号、REQ-018/AC-6 等入版、评审后补的三条判据）并请求一次点头：用户答"1 同意 以我的身份提交 2 升级由你去跑"。
- 第 2 项（zhaoxi 升级由 agent 执行）是对 DEC-173 人工确认的一次记录在案的委托，与本审批无关，记在 F23 worklog。

## 提交纪律（C-107 / DEC-166）

记录在案的委托：用户明确指示"以我的身份提交"，原话在 `delegated:`；`gate approve` 与提交以 kopit 的 git 身份完成，agent 环境由尾注如实记录。
