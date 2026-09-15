---
id: APR-010
status: approved
date: 2026-09-14
approver: "kopit <wwillmee@gmail.com>"
delegated: "「好根据上述内容进行全面优化。所有优化完成之后需要你调研spexcode这个项目，然后说明有哪些内容可以添加到本框架中」(2026-09-14)"
scope: "实施此前六类框架优化并验证；之后调研 spexcode，只交付建议；不代表新工件确认、功能验收或远端交付"
approval_kind: implementation-scope
artifacts:
  - path: keel/changes/CHG-019-astra-evidence-and-context.md
    version: CHG-019
    content_sha256: c266cd2ef340b7d4aac5b540c01c3730b58ef016f0810993b6a543da9d4ec0bd
---

# APR-010 astra-evidence-scope

## 范围

仅记录本轮用户已经给出的优化与后续调研范围。需求 v10、总览 v6、代码与研究结果保持其实际状态，不在本 APR 绑定，不声称用户已经看过或验收。用户没有授权合并、推送、发布或直接引入 spexcode。

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 证据快照（DEC-187）

工具只在当前内容树及完整报告对账成功时附带实际证据。附带快照仍不把本次范围授权转换为功能验收；缺失或失败不伪造。

## 提交纪律（DEC-190）

审批的**判断**必须来自用户本人：把用户的原话（含日期）写进前言 `delegated: "「原话」(2026-09-14)"`，`approver:` 写批准人（`gate approve` 默认取 `identities.humans[0]`，可用 `--approver` 指定）。然后 `gate approve APR-nnn` 绑定哈希并提交——**谁提交都可以**（agent 用自己的 git 身份即可）。没有原话时 `gate approve` 拒绝、pre-commit 拒绝、X-apr FAIL。
