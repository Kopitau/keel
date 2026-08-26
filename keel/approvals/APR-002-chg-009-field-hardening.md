---
id: APR-002
status: approved
date: 2026-08-26
approver: "kopit <wwillmee@gmail.com>"
delegated: "「批准 你进行提交」(2026-08-26)"
scope: "CHG-009 现场加固三轮：四条防线 + 用户第二轮拍板（DEC-162~165）+ C-107 委托修订（DEC-166/167）"
artifacts:
  - path: keel/changes/CHG-009-field-hardening.md
    version: v1
    content_sha256: fd29037f92eaa76b13554219c79dd185e39a3ad1a5a2f4c8d0b9045c6184534d
  - path: keel/decisions/DEC-161-field-hardening-four-defenses.md
    version: v1
    content_sha256: 64e6e1e18d6763ea85f470efd10011750bd59e587c45c9f5f2c6071c54737032
  - path: keel/decisions/DEC-162-precommit-full-suite-on-framework-paths.md
    version: v1
    content_sha256: be87902d37c2e6c2feb8828819f9d51050d53da36cd9b7ea49a7d1d3edcfd96f
  - path: keel/decisions/DEC-163-res-substance-floor.md
    version: v1
    content_sha256: e4fd9db49e7ed22f765d59e9a871f3ef2a9789e142b0e24527fd32f3e7c4a6f4
  - path: keel/decisions/DEC-164-lesson-candidate-reader.md
    version: v1
    content_sha256: 32a8e5ca41041e826bccd77d9a2630147be73cf080b94e48469548a0e06193dd
  - path: keel/decisions/DEC-165-defer-empty-compliant-audit.md
    version: v1
    content_sha256: 4ed92d7491f0186ec32f6413513d817c23a8db74755796f766a93166f783036e
  - path: keel/decisions/DEC-166-apr-recorded-delegation.md
    version: v1
    content_sha256: b869706dccf2171859af8516ec1c791be6c3b81a5eb58c5593397ed2d1e2f8a8
  - path: keel/decisions/DEC-167-apr-commit-time-guard.md
    version: v1
    content_sha256: b994af3dc72cc32c4ae3fc76d8cd31f7e57e34b585553b81358f41bcb05c0246
---

# APR-002 CHG-009 现场加固批准

## 范围

变更单 CHG-009 全部三轮（2026-08-26），及其依据的七条决策 DEC-161~167。实现与测试（178 全绿）随本批准一并入库。

## 工件与哈希

哈希绑规范性内容：错字修订不作废，语义变才重批（C-106）。

## 提交纪律（C-107 / DEC-166）

本批准走**记录在案的委托**路径：用户在对话中批准并明确指示由 agent 提交（原话见 frontmatter `delegated`）。agent 以用户 git 身份落地本文件；`gate approve` 与 pre-commit-apr 在 agent 环境下均要求本记录存在。本次是 DEC-166 协议的首次实际执行。
