---
id: APR-012
status: approved
date: 2026-09-15
approver: "kopit <wwillmee@gmail.com>"
delegated: "「那你本地合并提交吧，然后再上传到 GitHub」(2026-09-15)"
scope: "本地合并已完成的 keel 改动并推送到既有 GitHub 仓库；不授权发布发行版、强推、修改可见性或改其他项目"
approval_kind: merge-and-push
artifacts:
  - path: keel/features/f25-spec-governance/merge-scope-2026-09-15.md
    version: v1
    content_sha256: 2913fc45ba68709d40dac5bd035c074518e3c3645b4368c3259bd8d69fac245c
evidence_tree_hash: 1873f7c22b207295004479753a10b3aee954c488
evidence_commit: bbd9f720fd09d523b234861f1dd436c5e3910a87
evidence_command: "/opt/homebrew/Cellar/node@24/24.18.0/bin/node --test --test-reporter=spec --test-reporter-destination=stdout --test-reporter=junit --test-reporter-destination=keel/evidence/junit.xml"
evidence_exit_code: 0
evidence_passed: 338
evidence_failed: 0
evidence_skipped: 0
evidence_recorded_at: 2026-09-15T00:22:43.394Z
---

# APR-012 merge-and-github-delivery

## 范围

仅记录用户对当前已完成改动的本地合并、提交与 GitHub 推送授权。实际默认分支和本轮范围见绑定的合并说明；生成需求/计划全文的状态不因此改为 confirmed，远端 CI 结果仍须实际查询。

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 证据快照（DEC-187）

`gate approve` 时只有当前内容树、命令、退出码、JUnit 哈希与计数及执行者均通过对账的 `keel/evidence/verify.json` 才会被快照为 `evidence_tree_hash / evidence_commit / evidence_command / evidence_exit_code / evidence_passed / evidence_failed / evidence_skipped / evidence_recorded_at`。dirty 不否定已验证内容。local 档合并、工作树删除后可按原规则核对快照；github 档以 CI 复算为准。证据快照不改变本 APR 的授权种类，也不自动证明人工验收。

## 提交纪律（DEC-190）

审批的**判断**必须来自用户本人：把用户的原话（含日期）写进前言 `delegated: "「原话」(2026-09-15)"`，`approver:` 写批准人（`gate approve` 默认取 `identities.humans[0]`，可用 `--approver` 指定）。然后 `gate approve APR-nnn` 绑定哈希并提交——**谁提交都可以**（agent 用自己的 git 身份即可）。没有原话时 `gate approve` 拒绝、pre-commit 拒绝、X-apr FAIL。
