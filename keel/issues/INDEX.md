# issues index (generated)

- generator: gate index
- count: 29

| ID | title | status | file |
|---|---|---|---|
| ISS-001 | ISS-001 test_command 可篡改，使 verify 与 CI 复算同时失效 | closed | `ISS-001-test-command-verify-ci.md` |
| ISS-002 | ISS-002 「缺失即跳过」的 fail-open 模式，删掉输入即可消除失败 | closed | `ISS-002-fail-open.md` |
| ISS-003 | ISS-003 追溯对账未接入门禁，10/24 需求零测试覆盖而门禁全绿 | closed | `ISS-003.md` |
| ISS-004 | ISS-004 .githooks 缺可执行位，macOS/Linux 上 L2 强制层完全失效 | closed | `ISS-004-githooks-mac-linux.md` |
| ISS-005 | ISS-005 警告可由自己写的一行 worklog 永久消除 | closed | `ISS-005.md` |
| ISS-006 | ISS-006 G-done/G-merge/G-retro 判据不全且证据字段未对账（P1-2/P1-3） | closed | `ISS-006-p1-gate-criteria.md` |
| ISS-007 | ISS-007 --no-verify 检测器被 C-102 抹平（P1-4） | closed | `ISS-007-precommit-stamp.md` |
| ISS-008 | ISS-008 - Given 行豁免使验收标准里的澄清标记隐形（P1-5） | closed | `ISS-008-given-clarification-backdoor.md` |
| ISS-009 | ISS-009 G-调研不校验 RES 文件存在（P1-6） | closed | `ISS-009-research-exists.md` |
| ISS-010 | ISS-010 C-107 只查本地 git config，不查提交作者（P1-7） | closed | `ISS-010-apr-author.md` |
| ISS-011 | ISS-011 链接 worktree 里 gitWriteTree 恒空（P1-8） | closed | `ISS-011-worktree-write-tree.md` |
| ISS-012 | ISS-012 测试把漏洞写成合格断言且部分非 hermetic（P1-9） | closed | `ISS-012-tests-encoded-holes.md` |
| ISS-013 | ISS-013 五家 harness live 点技能（C-139 剩余） | wontfix | `ISS-013-c139-live-invoke.md` |
| ISS-014 | ISS-014 用户令回滚第一次 Python W1（C-76 用户纠正） | closed | `ISS-014-w1-python-rollback.md` |
| ISS-015 | ISS-015 本环境 git 写 stdout 报 Bad file descriptor | closed | `ISS-015-git-stdout-bfd.md` |
| ISS-016 | ISS-016 无远端因此 CI 从未运行（P2-6）；CODEOWNERS 无真人（P2-7） | wontfix | `ISS-016-no-remote-ci.md` |
| ISS-017 | ISS-017 W1–W6 测试均为事后补，违反 C-31/C-35（P2-4） | wontfix | `ISS-017-tdd-order-past-waves.md` |
| ISS-018 | ISS-018 test_command 范围未固定：ISS-001 关闭过早，同类绕过仍可穿透 CI | closed | `ISS-018-test-command.md` |
| ISS-019 | ISS-019 verify 产出的证据必然被 check 拒绝，CI 每次都会红 | closed | `ISS-019-verify-check-ci.md` |
| ISS-020 | ISS-020 X-trace 仍是逐需求对账，未落实 C-32 的「按验收标准逐条对账」 | closed | `ISS-020-x-trace.md` |
| ISS-021 | ISS-021 删除或跳过测试无人检测，可让门禁对已破坏的核心机制全绿 | closed | `ISS-021-z-546eabd4.md` |
| ISS-022 | ISS-022 全局安装完全不可用：两条安装路径都是坏的 | closed | `ISS-022-node-modules-junction.md` |
| ISS-023 | ISS-023 评审回路可被一条空数组命令置为 passed，且该状态不绑代码树 | open | `ISS-023-passed.md` |
| ISS-024 | ISS-024 视角分类与异构强制 100% 来自自述，REQ-028 被实现反了 | open | `ISS-024-z-648bd265.md` |
| ISS-025 | ISS-025 回路从不实跑复现命令，且清零路径没有 CLI 入口 | open | `ISS-025-z-cf82831e.md` |
| ISS-026 | ISS-026 证据里的 review 字段被 gate verify 抹掉，熔断计数永不触发 | open | `ISS-026-review-verify.md` |
| ISS-027 | ISS-027 doctor 对已卸载/半装的项目报 ok | open | `ISS-027-doctor-ok.md` |
| ISS-028 | ISS-028 攻击面分类漏掉关键路径，输入裁剪只挡字面量键名 | open | `ISS-028-z-171e2c39.md` |
| ISS-029 | ISS-029 f07-review 的功能规划仍写「异构复审可选、默认关」，与 DEC-159 相反 | open | `ISS-029-f07-review-dec-159.md` |
