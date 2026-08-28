# issues index (generated)

- generator: gate index
- count: 52

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
| ISS-023 | ISS-023 评审回路可被一条空数组命令置为 passed，且该状态不绑代码树 | closed | `ISS-023-passed.md` |
| ISS-024 | ISS-024 视角分类与异构强制 100% 来自自述，REQ-028 被实现反了 | closed | `ISS-024-z-648bd265.md` |
| ISS-025 | ISS-025 回路从不实跑复现命令，且清零路径没有 CLI 入口 | closed | `ISS-025-z-cf82831e.md` |
| ISS-026 | ISS-026 证据里的 review 字段被 gate verify 抹掉，熔断计数永不触发 | closed | `ISS-026-review-verify.md` |
| ISS-027 | ISS-027 doctor 对已卸载/半装的项目报 ok | closed | `ISS-027-doctor-ok.md` |
| ISS-028 | ISS-028 攻击面分类漏掉关键路径，输入裁剪只挡字面量键名 | closed | `ISS-028-z-171e2c39.md` |
| ISS-029 | ISS-029 f07-review 的功能规划仍写「异构复审可选、默认关」，与 DEC-159 相反 | closed | `ISS-029-f07-review-dec-159.md` |
| ISS-030 | ISS-030 pack 的回退判定被回路自身产物堵死，提交后评审拿到空包且视角降级 | closed | `ISS-030-pack.md` |
| ISS-031 | ISS-031 recordClear 在证据不存在时静默跳过写入，review 段因命令顺序丢失 | closed | `ISS-031-recordclear-review.md` |
| ISS-032 | ISS-032 非阻断 finding 被静默丢弃，评审无 advisory 通道 | closed | `ISS-032-finding-advisory.md` |
| ISS-033 | ISS-033 loop clear 拒绝清零时返回 exit 0，与 ingest 不一致 | closed | `ISS-033-loop-clear-exit-0-ingest.md` |
| ISS-034 | ISS-034 异构要求可由实施方自述满足 | wontfix | `ISS-034-z-19259ce0.md` |
| ISS-035 | ISS-035 复现命令读自实施方可写的 ISS 文件，改写即可假清零 | wontfix | `ISS-035-iss.md` |
| ISS-036 | ISS-036 重复调用 clear 会清空 repro_runs 审计记录 | closed | `ISS-036-clear-repro-runs.md` |
| ISS-037 | ISS-037 门禁「空即合规」：项目越早期，绿灯越廉价 | closed | `ISS-037-empty-is-compliant.md` |
| ISS-038 | ISS-038 C-06 独立缺口猎取：做了和没做，门禁分不出来 | closed | `ISS-038-gap-hunt-unverifiable.md` |
| ISS-039 | ISS-039 调研阶段选定的开源依赖，OSS 账本看不见 | closed | `ISS-039-oss-blind-in-research.md` |
| ISS-040 | ISS-040 访谈把「问题」写成「主张」——用户只能点头，无从判断（重复发生） | closed | `ISS-040-questions-as-assertions.md` |
| ISS-041 | ISS-041 测试套件从 2026-08-25 起一直是红的，交接文件却写着「139 全绿」 | closed | `ISS-041-suite-red-since-config-change.md` |
| ISS-042 | ISS-042 `#经验候选` 标签没有读取端：写了等于没写 | closed | `ISS-042-candidate-tags-dead-end.md` |
| ISS-043 | ISS-043 G-research 只判文件存在，从不打开看 | closed | `ISS-043-res-content-unchecked.md` |
| ISS-044 | ISS-044 feature-plan 模板与 `gate new feature` 不生成 `req:`，X-trace 对消费项目从不绑定 | closed | `ISS-044-feature-plan-template-and-gate-new-featu.md` |
| ISS-045 | ISS-045 hook 导出的 `GIT_AUTHOR_*` 让 fixture 提交冠上真仓的 agent 身份，X-apr 守卫因错误原因变红 | closed | `ISS-045-hook-exported-git-author-leaks-the-real-.md` |
| ISS-046 | ISS-046 CHG-010 漏列五个验收义务已变化的功能计划 | closed | `ISS-046-chg-010.md` |
| ISS-047 | ISS-047 review clear 依赖的『已修复谓词』没有可机读的打开态契约 | closed | `ISS-047-review-clear.md` |
| ISS-048 | ISS-048 legacy RES 的 PASS/WARN/FAIL 未限定为引用子判据 | closed | `ISS-048-legacy-res-passwarnfail.md` |
| ISS-049 | ISS-049 REQ-010 的 ingest 攻击探针行为被错误标为 machine-doc | closed | `ISS-049-req-010-ingest-machine-doc.md` |
| ISS-050 | ISS-050 v4-req017-ac-numbering-stale-test-labels | closed | `ISS-050-v4-req017-ac-numbering-stale-test-labels.md` |
| ISS-051 | ISS-051 plan-index-current-version-hardcode | closed | `ISS-051-plan-index-current-version-hardcode.md` |
| ISS-052 | ISS-052 loop-pack-重复暂存差异导致误报超限 | closed | `ISS-052-loop-pack.md` |
