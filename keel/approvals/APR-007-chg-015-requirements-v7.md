---
id: APR-007
status: draft
date: 2026-09-02
approver: ""
delegated: ""
scope: "变更单 CHG-015 + 需求基线 v7"
artifacts:
  - path: "keel/changes/CHG-015-review-three-questions.md"
    version: "v1"
    content_sha256: pending
  - path: "keel/requirements/v7.md"
    version: "v7"
    content_sha256: pending
---

# APR-007 CHG-015（评审三问）+ 需求 v7

## 范围

- CHG-015：评审只答三问，阻塞凭据从攻击探针改为会失败的测试或缺黑盒测试的验收标准；`checklist.md` 取代三份旧清单；证据 JSON 增加 `feature_coverage`；版本 0.10.0。
- 需求 v7：REQ-028 重写；REQ-027 AC-4 / AC-5 / AC-12 与 REQ-010 ISS 内容条改凭据；其余与 v6 相同。

## 用户原话

> 「这个子agent审阅好像还是有问题。朝夕项目中依然疯狂在测试。子agent的审阅的功能应该定义为：代码是否规范，尽量简单方便维护。是否实现了相应的功能，以及编写相应的功能测试是否通过了。」(2026-09-02)
> A 可以 B 废掉 C 现在升级（2026-09-02，对七条改法与三个问题的答复）

第一句是问题与定义，第二句批准了改法（CHG-015 据此 approved）。**对需求 v7 文本本身的批准原话尚待用户给出**——填入前言 `delegated:` 后再 `gate approve APR-007`；届时 v7 状态改 confirmed、`requirements/INDEX.md` current → v7.md。

## 工件与哈希

哈希绑正文（CHG-011）：错字修订不作废，语义变才重批。`gate approve APR-007` 自动回填。

## 提交纪律（DEC-190）

审批的判断来自用户原话（前言 `delegated:`）；谁执行 `gate approve`、谁提交都可以。
