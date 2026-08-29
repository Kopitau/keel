---
id: APR-004
status: approved
date: 2026-08-29
approver: "kopit <wwillmee@gmail.com>"
delegated: "「批准 以我的身份提交」(2026-08-29)"
scope: "变更单"
artifacts:
  - path: "keel/changes/CHG-011-lighten-keel-22-gates-to-8-quick-only-ho.md"
    version: "v1"
    content_sha256: pending
  - path: "keel/decisions/DEC-183-lighten-keel-keep-8-gates-quick-only-hoo.md"
    version: "v1"
    content_sha256: pending
---

# APR-004 CHG-011 keel 减重

## 范围

变更单 CHG-011（门禁 22 → 8、预提交只跑秒级检查、冻结只管语义、记录三合一、方案级评审、测试按功能、自主实施回路）及其依据 DEC-183。需求 v5 与规划 overview-v4 按 k-change 在本批准后作为完整新版写出（v4 / overview-v3 冻结不改）。

## 工件与哈希

哈希绑规范性内容（UTF-8 / 无 BOM / LF，DEC-144）：错字修订不作废，语义变才重批（C-106）。

## 用户点头原话

- 2026-08-29 对 CHG-011 概要："批准 以我的身份提交。"（同一段话里补充了自主实施回路的意图，已逐字记入 DEC-183。）
- 追问"一个会话一个切片就停"是否与自主回路冲突："不冲突啊，通过一个功能就压缩或者分割worklog不就好了么"——写入 CHG-011「新增」第一条。

## 提交纪律（C-107 / DEC-166）

记录在案的委托：用户明确指示"以我的身份提交"，原话在 `delegated:`；提交以 kopit 的 git 身份完成，agent 环境由尾注如实记录。首次提交（f0e750c）误按 APR-005 编号操作、审批未执行，本次修正后 amend。
