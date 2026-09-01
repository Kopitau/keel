---
id: APR-006
status: approved
date: 2026-09-01
approver: "kopit <wwillmee@gmail.com>"
delegated: "「批准V6和三份变更单。并以我的身份提交。」(2026-09-01)"
scope: "变更单 ×2 + 需求基线"
artifacts:
  - path: "keel/changes/CHG-012-cursor-client-as-compatible-harness.md"
    version: "v1"
    content_sha256: ab82a2b18b07bb1280899d5f2ff8b7e71baf3c8802d0af2bc8c2721ecfa9924e
  - path: "keel/changes/CHG-013-review-no-attack-lens-no-mandatory-heterogeneity.md"
    version: "v1"
    content_sha256: 0521d2bc8ff088c14fabe0177a311ca0f9c34a992b14c8ae7f17e4a729678f1f
  - path: "keel/changes/CHG-014-audit-feedback-from-zhaoxi-and-fmea-v3-p.md"
    version: "v1"
    content_sha256: 150c5626c465acb9bf6dcf3533428876bc8fbf5e242e4b3e6d4ce59ed1487d17
  - path: "keel/requirements/v6.md"
    version: "v6"
    content_sha256: 10230a935c1bddf3adc01df1125ac2757e242c736a9119204561aa38a05ffcde
---

# APR-006 CHG-012 Cursor 客户端 + CHG-013 评审去攻击面 + CHG-014 审计回流 + 需求 v6

## 范围

变更单 CHG-012（Cursor 客户端登记为兼容档）、CHG-013（评审去掉攻击面视角、不强制异构，DEC-184）、CHG-014（zhaoxi / fmea-v3 审计回流：DEC-185～189、ISS-058～060）与由三者产生的需求 v6（改 REQ-016、REQ-007、REQ-027、REQ-028，并给 REQ-001 / 004 / 006 / 012 / 016 / 018 / 019 / 021 / 022 / 025 / 027 加验收条目；其余条目与 v5 逐字相同）。

## 工件与哈希

哈希绑正文（前言之外的规范化正文，CHG-011）：元数据不作废，错字修正记理由放行，语义变才重批（C-106）。

## 用户点头原话

- 2026-08-29 用户："能不能让cursor也兼容" → agent 给出 A / B / C 三案 → 用户："A 不是cursor cli是cursor客户端"。
- 2026-08-29 用户："attack review 为什么还是这个？不是主要是功能测试和代码和功能测试审核么？" → "需要 去掉attack面，同时审核不应该强制要求使用不同的cli。只需要运行空白的子代理就可以了"（DEC-184）。
- 2026-09-01 用户审阅 CHG-014 方案后："没有了 根据上述内容对框架进行修正和优化" → "1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意"（并入 v6、写 DEC、按切片提交、证据快照选 A、白名单限制保留）。
- 2026-09-01 用户："批准V6和三份变更单。并以我的身份提交。"——同轮用户又定了 DEC-190（去掉"只能由我的身份提交"），所以本审批由 agent 以自己的 git 身份提交，原话记在前言 `delegated:`。

## 提交纪律（C-107 / DEC-166）

审批的判断来自用户原话（前言 `delegated:`），谁提交都可以（DEC-190）。
