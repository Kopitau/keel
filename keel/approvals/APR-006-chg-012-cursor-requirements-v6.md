---
id: APR-006
status: draft
date: 2026-08-29
approver: ""
delegated: ""
scope: "变更单 ×2 + 需求基线"
artifacts:
  - path: "keel/changes/CHG-012-cursor-client-as-compatible-harness.md"
    version: "v1"
    content_sha256: pending
  - path: "keel/changes/CHG-013-review-no-attack-lens-no-mandatory-heterogeneity.md"
    version: "v1"
    content_sha256: pending
  - path: "keel/requirements/v6.md"
    version: "v6"
    content_sha256: pending
---

# APR-006 CHG-012 Cursor 客户端 + CHG-013 评审去攻击面 + 需求 v6

## 范围

变更单 CHG-012（Cursor 客户端登记为兼容档）、CHG-013（评审去掉攻击面视角、不强制异构，DEC-184）与由二者产生的需求 v6（改 REQ-016、REQ-007、REQ-027、REQ-028；其余 24 条与 v5 逐字相同）。

## 工件与哈希

哈希绑正文（前言之外的规范化正文，CHG-011）：元数据不作废，错字修正记理由放行，语义变才重批（C-106）。

## 用户点头原话

- 2026-08-29 用户："能不能让cursor也兼容" → agent 给出 A / B / C 三案 → 用户："A 不是cursor cli是cursor客户端"。
- 2026-08-29 用户："attack review 为什么还是这个？不是主要是功能测试和代码和功能测试审核么？" → "需要 去掉attack面，同时审核不应该强制要求使用不同的cli。只需要运行空白的子代理就可以了"（DEC-184）。
- 提交委托的原话待补：用户尚未说"以我的身份提交"；补上后填入 `delegated:` 再 `gate approve`。

## 提交纪律（C-107 / DEC-166）

人类亲手提交，或记录在案的委托（`delegated:` 里有原话）；agent 的 git 身份不得出现在本提交上。
