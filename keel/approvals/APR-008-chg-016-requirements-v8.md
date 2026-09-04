---
id: APR-008
status: draft
date: 2026-09-04
approver: ""
delegated: ""
scope: "变更单 CHG-016 + 需求基线 v8"
artifacts:
  - path: "keel/changes/CHG-016-second-pilot-audit.md"
    version: "v1"
    content_sha256: pending
  - path: "keel/requirements/v8.md"
    version: "v8"
    content_sha256: pending
---

# APR-008 CHG-016（第二轮试点审计）+ 需求 v8

## 范围

- CHG-016：草稿计划只警告、跨工作树编号、AGENTS.md 随更新、本地补丁可见、新项目门禁口径、证据只算代码（DEC-192）、方案级变更在主干（DEC-193）、决策简报、评审范围不含框架文件、版本 0.11.0。
- 需求 v8：REQ-004 / 006 / 009 / 010 / 011 / 012 / 019 / 025 / 026 / 028 各加验收条目；其余与 v7 相同。

## 用户原话

> 「你先再扫一遍zhaoxi和taotie文件夹，通过查阅agent对话和有关文件看这段时间框架还有没有需要优化的地方。」(2026-09-04)
> 「11 不用 12 不用 13不用 14需要15同意 16不用 17可以 18同意 \nC1 A C2A C3 不管 C4 A C5 B」(2026-09-04)

第二句批准了改法（CHG-016 据此 approved）。**对需求 v8 文本本身的批准原话尚待用户给出**——填入前言 `delegated:` 后再 `gate approve APR-008`；届时 v8 状态改 confirmed、`requirements/INDEX.md` current → v8.md。

## 工件与哈希

哈希绑正文（CHG-011）；`gate approve APR-008` 自动回填。

## 提交纪律（DEC-190）

审批的判断来自用户原话（前言 `delegated:`）；谁执行 `gate approve`、谁提交都可以。
