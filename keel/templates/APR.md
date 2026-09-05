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

（区分实施范围授权、工件确认、功能验收、合并。只绑定用户原话覆盖的范围；授权不等于对未展示结果的验收，同一授权无需重复申请。）

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 证据快照（DEC-187）

`gate approve` 时若盘上有与当前树一致、退出码 0 的 `keel/evidence/verify.json`，会把 `evidence_tree_hash / evidence_commit / evidence_command / evidence_exit_code / evidence_passed / evidence_failed / evidence_skipped / evidence_recorded_at` 写进本文件前言。local 档合并、工作树删除后，G-done / G-merge / X-evidence 以该快照为证据（树必须仍一致）；github 档以 CI 复算为准。

## 提交纪律（DEC-190）

审批的**判断**必须来自用户本人：把用户的原话（含日期）写进前言 `delegated: "「原话」(YYYY-MM-DD)"`，`approver:` 写批准人（`gate approve` 默认取 `identities.humans[0]`，可用 `--approver` 指定）。然后 `gate approve APR-nnn` 绑定哈希并提交——**谁提交都可以**（agent 用自己的 git 身份即可）。没有原话时 `gate approve` 拒绝、pre-commit 拒绝、X-apr FAIL。
