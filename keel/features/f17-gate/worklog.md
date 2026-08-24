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

- 进度：wave 配置化；index 大小写；中文 slug；X-owners local skip；C-139 v1 协议测试。#经验候选 回滚 / git BFD / 无 CI。
- 问题链接：ISS-013~017

## 2026-08-24（R2）

- 进度：ISS-018 全量 suite 钉死；ISS-019 spec+junit 与 hermetic verify→check；ISS-020 AC 标记。旧防线 ISS-001 只拦形状，同类收窄范围穿透 → 升一级钉死无路径参数。
- 问题链接：ISS-018 ISS-019 ISS-020

## 2026-08-24（R3）

- 进度：ISS-021 C-34 测试名称基线。`keel/test-baseline.json` 入仓；`X-tests` 进 `--quick`（预提交能拦住删测试）。净减少或 `test.skip` 须 worklog **相对 HEAD 的新增行** `C-34: ref=ISS-nnn|DEC-nnn` 且记录存在（复用 ISS-005 引用校验）。重命名=名称消失，同样要引用，避免「删真测、补空测」同计数绕过。verify 不改基线文件（改了会脏树）。
- 问题链接：ISS-021
- 不要用 `gate-warn:` 消本条。

## 2026-08-24（CHG 批准）

- 进度：用户批准 CHG-002～006。身份 kopit <wwillmee@gmail.com> 写入 identities.humans。批准提交用该人类作者，不用 keel-agent（C-107）。APR-001 仍 draft。
- 问题链接：ISS-021（R3 实现已 closed；独立复审仍待）






