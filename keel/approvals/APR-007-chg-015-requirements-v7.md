---
id: APR-007
status: approved
date: 2026-09-03
approver: "kopit <wwillmee@gmail.com>"
delegated: "「批准V7」(2026-09-03)"
scope: "变更单 CHG-015 + 需求基线 v7"
artifacts:
  - path: "keel/changes/CHG-015-review-three-questions.md"
    version: "v1"
    content_sha256: 619dc0e9ed93b1998317ae25d45f141c332877ab884d15614e068ef38c9d18f0
  - path: "keel/requirements/v7.md"
    version: "v7"
    content_sha256: 7485bb5c2fc1948661785fa0e355d55f3e287e0bf4f1af8c51fdbc1408fb4060
---

# APR-007 CHG-015（评审三问）+ 需求 v7

## 范围

- CHG-015：评审只答三问，阻塞凭据从攻击探针改为会失败的测试或缺黑盒测试的验收标准；`checklist.md` 取代三份旧清单；证据 JSON 增加 `feature_coverage`；版本 0.10.0。
- 需求 v7：REQ-028 重写；REQ-027 AC-4 / AC-5 / AC-12 与 REQ-010 ISS 内容条改凭据；其余与 v6 相同。

## 用户原话

> 「这个子agent审阅好像还是有问题。朝夕项目中依然疯狂在测试。子agent的审阅的功能应该定义为：代码是否规范，尽量简单方便维护。是否实现了相应的功能，以及编写相应的功能测试是否通过了。」(2026-09-02)
> A 可以 B 废掉 C 现在升级（2026-09-02，对七条改法与三个问题的答复）

> 批准V7（2026-09-03）

第一句是问题与定义，第二句批准了改法（CHG-015 据此 approved），第三句批准了需求 v7 的文本；已填入前言 `delegated:`，`gate approve APR-007` 绑定哈希，v7 状态 confirmed，`requirements/INDEX.md` current → v7.md。

## 工件与哈希

哈希绑正文（CHG-011）：错字修订不作废，语义变才重批。`gate approve APR-007` 自动回填。

## 提交纪律（DEC-190）

审批的判断来自用户原话（前言 `delegated:`）；谁执行 `gate approve`、谁提交都可以。
