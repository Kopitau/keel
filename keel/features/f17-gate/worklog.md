# worklog — F17 f17-gate

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W2，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W1 重做）

- 进度：按 CHG-001 回滚 `gate.py`/pytest；`gate.ts` W1 桩（status + hash）+ 启动器。规划见 plan/v2.md。
- 实现决定：运行时拆成 hash/config/paths/node-version 四个模块，便于 W2 加子命令且测哈希无需起全部门禁。

## 2026-08-21（W2）

- 进度：check（六门 + budget/casefold/ids/tsc/hooks）、new、index、trace、sync、worktree、approve。pre-commit = `check --quick`，pre-push = 全量 check，prepare-commit-msg 注入尾注。
- 实现决定：G-完成/G-合并/G-复盘在无完成声明时 skip，不把全库未测 REQ 当成失败（C-32 范围=验收中的功能；重跑在 W3 verify）。警告须 worklog 写 `gate-warn: <id>` 才放行（C-103）。
- 验证：`npx tsc --noEmit` 0；`node --test tests/*.test.ts` 22 passed；本仓 `gate check` PASS。

## 2026-08-21（W3）

- 进度：增加 `verify` 子命令。DEC-138：`tools/gate/ci-trunk.sh` 在 CI 用主干 tools/gate 跑 `check --quick`。pre-push = verify 然后 check。

## 2026-08-21（W6）

- 进度：试点功能走全流程（本功能，不是 greet 样例）。落地 C-105：X-bypass 提醒级、pre-push 强推提醒、`gate review`、第一次年检 `gate-review-2026.md`、`summary.md`。
- 实现决定：提醒不阻断；无 Feature 尾注只在 hooksPath=.githooks 时查 HEAD；G-done 在无 verify.json 时 skip。常驻装载进 X-budget 软警告。
- 验证：见 `tests/w6-pilot.test.ts`。

## 2026-08-24（P0 返工）

- 进度：ISS-001~005。fail-closed；test_command 白名单；X-trace；hooks 100755；gate-warn 须 ref。CHG-002 proposed。
- 实现决定：X-trace 范围=有 summary 的功能（C-32 验收范围），未宣称完成的流程 REQ 不在本条 P0 强行盖测试（P2-1 / C-139 待用户）。
- 问题链接：ISS-001 ISS-002 ISS-003 ISS-004 ISS-005
- 不要用 `gate-warn:` 消本清单。

## 2026-08-24（P1 返工）

- 进度：P1-1 已由 P0/CHG-002 覆盖。P1-2~P1-9：对账、stamp、GWT 豁免、RES existsSync、X-apr、worktree git-dir、测试不再保护漏洞。
- 问题链接：ISS-006 ~ ISS-012（本波立）
- 实现决定：`--no-verify` 不再看 Feature 尾注（C-102 使其恒在）；改看 `Keel-Precommit: skipped`。push --no-verify 的权威在 CI（写进 enforcement-tiers）。

## 2026-08-24（P2 返工）

- 进度：wave 配置化；index 大小写；中文 slug；X-owners local skip；C-139 v1 协议测试。#经验候选 回滚 / git BFD / 无 CI → 弃 三项均已入正式记录（handoff 回路说明 / ISS-041 / CHG-009），无需另立 LES。
- 问题链接：ISS-013~017

## 2026-08-24（R2）

- 进度：ISS-018 全量 suite 钉死；ISS-019 spec+junit 与 hermetic verify→check；ISS-020 AC 标记。旧防线 ISS-001 只拦形状，同类收窄范围穿透 → 升一级钉死无路径参数。
- 问题链接：ISS-018 ISS-019 ISS-020

## 2026-08-24（R3）

- 进度：ISS-021 C-34 测试名称基线。`keel/test-baseline.json` 入仓；`X-tests` 进 `--quick`（预提交能拦住删测试）。净减少或 `test.skip` 须 worklog **相对 HEAD 的新增行** `C-34: ref=ISS-nnn|DEC-nnn` 且记录存在（复用 ISS-005 引用校验）。重命名=名称消失，同样要引用，避免「删真测、补空测」同计数绕过。verify 不改基线文件（改了会脏树）。
- 问题链接：ISS-021
- 不要用 `gate-warn:` 消本条。

## 2026-08-24（CHG-007 / DEC-158）

- 进度：G-req / G-plan 条件判定。真空项目 SKIP（提示 k-new）；有 features 子目录却无基线 FAIL；活的 NEEDS-CLARIFICATION 仍 FAIL。verify 在 `profiles.active=unset` 时明确失败，不写绿证据。
- 问题链接：CHG-007 DEC-158 REQ-026

## 2026-08-24（CHG 批准）

- 进度：用户批准 CHG-002～006。身份 kopit <wwillmee@gmail.com> 写入 identities.humans。批准提交用该人类作者，不用 keel-agent（C-107）。APR-001 仍 draft。
- 问题链接：ISS-021（R3 实现已 closed；独立复审仍待）







## 2026-08-26

- 进度：CHG-009 现场加固第二轮——G-research 开检 RES 实质（rescheck.ts）、`#经验候选` 首次有了读取端（candidates.ts：status 计数 + G-retro 提示）、pre-commit 对框架敏感路径强制全量测试（DEC-162）。
- 实现决定：RES 实质判据前缀匹配四个承重节、接受 depth/level 双字段名——上线前先拿本仓 RES-901/902 的真实变体形状实测，避免重演 ISS-038 的误杀。
- 问题链接：ISS-042 ISS-043
- #经验候选 类型=知识缺口 Windows 上 Python write_text 默认写 CRLF，一次污染 27 个文件（含门禁源码）且长期无症状 → KLES-001
- 补记（同日）：DEC-162 钩子首次实弹即拦下提交——hook 导出的 GIT_DIR/GIT_INDEX_FILE 劫持了测试内 fixture 与进程内 git 调用，两个野提交曾落到真仓 HEAD（已 mixed reset 救回，工作区无损）。修复双层：hook unset + 测试模块自净。
- #经验候选 类型=防线失效 git hook 环境变量劫持测试里的 git 操作，CI 绿不代表 hook 场景安全 → KLES-002

## 2026-08-26（DEC-168）

- 进度：`trace.ts` 判据改为只数测试名上的黑盒标记；`[proxy:]` 与白盒挂 AC 记 WARN（`CheckItem.acknowledged`，不被 C-103 升级）；`gate trace` 加 proxy 列。REQ-017 的 AC 测试按黑盒重写（细节与 C-34 引用见 f06-evidence worklog 同日条目）。
- 问题链接：ISS-044（open：feature-plan 模板与 `gate new feature` 不生成 `req:`，X-trace 对消费项目不绑定）。

## 2026-08-27（ISS-045：hook 导出的 GIT_AUTHOR_* 劫持 fixture 提交身份）

- 现象：提交 DEC-168 批次时 pre-commit 全量 185/187（终端 187/187），两条 `R6c X-apr` 失败，实际输出 `last commit author keel-agent <agent@keel.local> is an agent`。
- 复现：`GIT_AUTHOR_NAME=keel-agent GIT_AUTHOR_EMAIL=agent@keel.local node --test tests/r6-field-guards.test.ts` → 2 fail；不带环境变量 40/40。假设一次命中：`git commit` 把 author/committer 六个变量导出给 hook，fixture 的 `git config user.name` 被环境覆盖。
- 修复（C-61，同指纹 KLES-002 第二次，比上一级）：不再手写变量清单，改为 `tests/fixtures/git-env.ts` 一个共享模式 `/^GIT_(DIR|INDEX_FILE|WORK_TREE|PREFIX|AUTHOR_|COMMITTER_)/`，r6 / dec168 / iss045 三个碰 git 的测试文件加载时 `scrubProcessGitEnv`，fixture spawn 走 `scrubHookGitEnv`；`.githooks/pre-commit` 的 `unset` 补六个变量（双层）。
- 红灯：修复前上述命令 2 fail。修复后 hook 式环境下 r6 + iss045 + dec168 57/57。
- 突变验证：把模式改回不含 `AUTHOR_|COMMITTER_` → iss045 两条（「keeps the fixture's own identity」「strips everything」）+ r6 两条 X-apr 变红（4 fail）；还原 → 45/45。
- 问题链接：ISS-045 closed，防线指针 `tests/iss045-hook-git-env.test.ts`（5 条）。基线 192。
- 备注：KLES-002 的措辞应从「GIT_DIR」扩为「git 导出给 hook 的全部变量」——用户库文件不在本仓，待用户改。同指纹第三次即 `#经验候选`。
