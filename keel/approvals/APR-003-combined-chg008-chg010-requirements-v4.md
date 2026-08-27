---
id: APR-003
status: approved
date: 2026-08-27
approver: "kopit <wwillmee@gmail.com>"
delegated: "「Y」(2026-08-27；本轮该选项明确定义为：确认最终 v4，并明确委托生成、批准和提交合并 APR；不合并、不开始实现)"
scope: "CHG-008 + CHG-010 + requirements v4 合并批准（DEC-179）；不含合并与实现"
artifacts:
  - path: keel/changes/CHG-008-auto-review-loop.md
    version: v1
    content_sha256: 3cfd48490c5eb9bd132954b084744ee5552c997fce4f23cc4418023ca37a62c7
  - path: keel/changes/CHG-010-requirements-v4-stabilization.md
    version: v1
    content_sha256: d7663d3f42ff7255505f88b09f624d359dedf598e6590fc6a439d5fe82305cbf
  - path: keel/requirements/v4.md
    version: v4
    content_sha256: 32f083961e9547fc877273bf5d16886f677a4d73e07b9ba0243219b7a0187848
  - path: keel/decisions/DEC-173-update-interactive-y-n-confirmation.md
    version: v1
    content_sha256: 396f915c01b6f1576b14bcb927dfbbe412171602549f39eaba826fa7d2b3b529
  - path: keel/decisions/DEC-174-feature-scoped-acceptance-verification-m.md
    version: v1
    content_sha256: 91406f3b0bbd1ba7bd7b8084ae792f7636c3457f9813fbcf89fa70fbe701650f
  - path: keel/decisions/DEC-175-split-ci-contract-test-from-real-run-evi.md
    version: v1
    content_sha256: 6c3cc6c1c0d11bb8cf4717322eaf0266ee8933ff07cf3f6dee386fc390a970d5
  - path: keel/decisions/DEC-176-legacy-res-citation-gap-warning-policy.md
    version: v1
    content_sha256: a2e074600dc299903e710e231f6bd3e366f07814f7f4b8b8e392ae5c5b21f0cf
  - path: keel/decisions/DEC-177-append-review-clear-repro-history.md
    version: v1
    content_sha256: 1146fa9f398ab7c8c033da0d5db954e3449ac78910dc654357dec32d7460ed41
  - path: keel/decisions/DEC-178-approve-chg008-direction-correct-in-v4.md
    version: v1
    content_sha256: 44503ee4feb8480269d7809995cabb653978408b1cb1752002cb06f164cd5552
  - path: keel/decisions/DEC-179-combined-apr-for-chg008-chg010-v4.md
    version: v1
    content_sha256: 3c2b40420c179230baa7ef16c198a262b00f94b1cc53eff2e5ee2cb9a33a82ab
  - path: keel/decisions/DEC-180-req025-owned-by-f23-related-f16.md
    version: v1
    content_sha256: c3801e0ac1ef6fa3bcc91cc9c5d00aa6735950c85b7b905ac0da1d56f8a5e51e
  - path: keel/decisions/DEC-181-legacy-res-external-migration-manifest.md
    version: v1
    content_sha256: 36d426728b23cd976ee4e7fe37b0e6e409a0b324ce2e066851efa3206d2028c0
  - path: keel/decisions/DEC-182-review-repro-exit-code-contract.md
    version: v1
    content_sha256: b3a1499f190bffcc31c2f0e912bf1cc1e98d02535d7c0322dde35fe3b1a83c01
---

# APR-003 CHG-008、CHG-010 与 requirements v4 合并批准

## 范围

用户在完整 v4 草案、独立 gap-hunt 和正式评审修订完成后回复「Y」，整份确认 requirements v4，并按 DEC-179 在同一批准边界中批准 CHG-008、CHG-010、requirements v4 及本轮依据 DEC-173～182。

本批准只确认需求基线与变更边界，不宣称 CHG-010 已实现，不批准合并，也不开始实现。受影响计划新版、0.8.0 行为改动、消费项目实测和真实 GitHub 六格证据仍是批准后的后续工作。

## 验收包

1. 逐条需求：v4 共 28 条 REQ，均为 `confirmed`；每条 acceptance 与 verification 数量一一对应，并有唯一 owner 映射。
2. 验证与追溯：批准前 `gate verify` 为 213/213 通过；最终批准工作树的命令、退出码和 tree hash 以 `keel/evidence/verify.json` 为准。
3. 独立评审：`gap-hunt-v4.md` 已完成；正式自动评审回路第 3 轮 `passed`，blocking 为 0、advisory 为 0。评审中产生的 ISS-046～049 均以同一攻击探针复跑并关闭。
4. 已知余项：ISS-036 仍开放；REQ-017 的真实 CI AC 仍有一个 proxy，等待 GitHub Actions Windows/macOS/Linux × Node 22/24 的真实运行证据解除。

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 提交纪律（C-107 / DEC-166）

本批准走“记录在案的委托”路径。用户原话为「Y」，其在本轮紧邻问题中的明确定义已完整记入 frontmatter `delegated`。我只以 `identities.humans` 白名单中的 `kopit <wwillmee@gmail.com>` 执行 `gate approve` 和提交；提交后立即停止，不合并、不实现。
