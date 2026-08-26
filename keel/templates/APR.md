---
id: APR-000
status: draft
date: YYYY-MM-DD
approver: ""
delegated: ""
scope: ""
artifacts:
  - path: ""
    version: ""
    content_sha256: ""
---

# APR-000 标题

## 范围

（需求基线 / 方案+统一规划 / 变更单 / 功能验收 / 合并）

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 提交纪律（C-107 / DEC-166）

审批的**判断**必须来自用户本人（对话确认，原话可溯）。**提交动作**允许两条路径：

1. **人类亲手**：人类 git 身份、非 agent 环境提交，`delegated` 留空。
2. **记录在案的委托**：用户明确指示 agent 提交时，先把原话写进 `delegated: "「原话」(YYYY-MM-DD)"`，再 `gate approve` + 提交。agent 环境下 `gate approve` 与 pre-commit 都会拒绝无委托记录的审批；X-apr 事后按提交尾注复核。

任何情况下 agent 的 **git 身份**（identities.agents）都不许出现在审批提交上。
