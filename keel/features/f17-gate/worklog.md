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

## 2026-08-28（P5 owner 对账联动）

- 进度：F3 的 DEC 状态机新增 `X-decisions` 后，同步 C-105 年度门禁库存与枚举测试；未改变其他 gate ID。首轮全仓回归仅因此 318/320，更新清单后定向复测。

## 2026-08-27（ISS-044：feature-plan 模板与脚手架不生成 `req:`）

- 复现：用真脚手架 `gate new feature demo` → `plan/v1.md` 无 `req:`；写 summary.md 后 `check --quick` → `PASS X-trace no claimed-done features`。顺带踩到：`gate.ts` 的 root 取自脚本所在仓库而非 cwd，在临时目录里调本仓的 gate.ts 会把脚手架写进本仓（已删 `keel/features/f25-demo`，未提交）——测试里一律用 `runNew(makeCtx(fixture))`。
- 修复：模板前言加 `req: [REQ-000]`；`new.ts` 无模板兜底也写；`trace.ts` 的 `claimedReqs` 读单值/数组，新增 `claimedWithoutReq`，缺口经 `uncoveredClaimed` 进 X-trace / G-done / G-merge；`xTrace` 先算缺口再判「无宣称」。
- 红灯：`tests/iss044-claimed-req.test.ts` 修复前文件级失败（导出不存在）；修复后 8/8。
- 突变验证：① stash trace.ts + check.ts → 文件级红；② stash 模板 + new.ts → 两条脚手架测试红；③ `claimedWithoutReq` 改为恒返回空 → 无 `req:` / 无 plan 两条红。三次还原后 8/8。
- 问题链接：ISS-044 closed，防线指针 `tests/iss044-claimed-req.test.ts`。
- 对 zhaoxi 的影响：升级 keel 后，F0 写 summary.md 会被 X-trace 拦（`f00-platform-base: summary.md but plan has no req:`），补 `req: [REQ-001, REQ-002, …]` 即合规；此后 DEC-168 的代理/黑盒判据才真正对它生效。

## 2026-08-27（RES-904 借鉴落地：DEC-169 前沿 / DEC-170 openai.yaml）

- 决策：用户「按你说的全做」→ DEC-169（前沿）、DEC-170（Codex 元数据）confirmed；DEC-171（fog 判据）、DEC-172（spike）deferred 记触发条件。
- 红灯：`tests/dec169-frontier.test.ts`、`tests/dec170-openai-yaml.test.ts` 先写，实现前运行——两文件加载失败（`frontier.ts` 不存在 / `MODEL_SKILLS` 未导出）。
- 内部分解：`frontier.ts`（`computeFrontier`：编号取计划前言 `feature:`，done = summary.md，claimed = claim.json，problems = 非法/自指/不存在/环）→ `status.ts` 加 `frontier:` / `blocked:` / `proxy_acs:` → G-plan 校验 problems → `worktree add` 被阻塞 WARN 不拒。`skills.ts` 加 `USER_SKILLS` / `MODEL_SKILLS` / `openaiYamlFor`，`inspectSkills` 校验 yaml 存在且不 stale；`sync.ts` 先生成再复制。
- 实现决定：前沿只到功能级，不下沉到内部步骤（DEC-169 复审条款留口）；`proxy_acs` 数的是 tests/ 全部 proxy 名（不限已宣称功能），因为它是复审阈值的分子。
- 实现决定：DEC-169/170 的测试用 `DEC-` 前缀、不带 AC 标记——v3 需求书没有对应 AC，按 DEC-168 不许借 AC 名；需求落点留到 v4（gap-hunt-v3 待处置项同类）。
- 突变验证：① `computeFrontier` 忽略 done → dec169 两条红；② `openaiYamlFor` 对所有技能返回 true → dec170 四条红；各自还原后 13/13。
- 证据：`npx tsc --noEmit` 干净；`node --test` **213/213**（200 + dec169 8 + dec170 5）；`gate check --quick` → `PASS_WITH_WARN fail=0 warn=1`（G-plan 行现为 `frontier 23, blocked 0`）；`gate status` 新增 `frontier:` / `blocked:` / `proxy_acs: 1`；`gate verify` passed=213；基线 213；`.agents/skills/k-*/agents/openai.yaml` 16 份 + 镜像 16 份入库。

## 2026-08-27（requirements v4 基线激活）

- C-34: ref=DEC-175 requirements v4 将 REQ-017 拆为 AC-3 本地 workflow 契约、AC-4 真实六格运行、AC-5 绕过检测；旧 v3 的 AC-3 proxy 与 AC-4 绕过测试名同步对账，真实运行继续明确标为 proxy。REQ-011 的 current 基线断言由 v3 更新为 v4。只改测试标签与基线指针，不实现 CHG-010 行为。

## 2026-08-28（P4 / workflow 契约）

- 进度：machine-doc 测试锁定 GitHub workflow 的 Windows/macOS/Linux × Node 22/24 精确矩阵、同一 `gate check` 与逐格 evidence 上传。
- 边界：按用户要求没有触发 GitHub Actions；`REQ-017/AC-4` 继续是 proxy WARN，只有真实 run URL/ID、SHA、六个 job、日期和工件 hash 才能解除。
- 证据：`tests/chg010-gates.test.ts` workflow 契约通过；本地 quick 的 proxy 不是 PASS。

## 2026-08-28（P6 本地边界）

- 进度：Windows 本地全量与消费项目 update 已取得，细节见 F23 `consumer-update-p6.md`。
- 边界：遵照用户要求没有触发 GitHub Actions；无 run URL/ID、SHA 对应六个 job 与工件 hash，REQ-017/AC-4 明确保留 proxy。

- 待办（advisory）：k-grill REQ row schema diverges from the authoritative requirement shape: it mandates 'verification' but omits the mandatory 'feature'/'must' fields, and REQ-001 acceptance C-04 was not updated to include 'verification' repro=Compare .agents/skills/k-grill/SKILL.md field list introduced by the diff ('id, status, source, description, acceptance (…), verification, bounds and counterexamples, non-goals') against the actual requirement rows in the reqs document (REQ-001 lists status/source/feature/must/description/acceptance/verification) and against REQ-001 acceptance C-04, which enumerates required fields as 编号/状态/来源/描述/验收标准/边界与反例/非目标 with no 'verification'. The skill now mandates 'verification' but omits the 'feature' ('每条 REQ 有且只有一个 owner F') and 'must' fields that appear in every requirement row.

## 2026-08-29（CHG-011 Q1 门禁裁剪 + Q2 钩子/输出/审批哈希）

- 进度：`check.ts` 重写为 8 条（quick = G-req / G-plan / X-trace / X-bypass；全量加 G-done / G-merge / X-evidence / X-apr）。删除 15 条门禁（CHG-011 列的 14 条 + CHG-010 加的 G-issues）及其模块 rescheck / gaphunt / candidates / osscheck / knowledge / testbase / decisions / lessons / autoload / issues / gen-test-baseline、`keel/test-baseline.json`、`keel/migrations/`、13 个门禁自测文件；`review.ts` / `skills.ts` / `trace.ts` / `cli/{init,doctor,update,migration}.js` 去掉对已删模块的依赖。
- 进度：X-apr 拒绝 `content_sha256: pending` 的 approved APR；X-evidence 只在全量判（缺证据但有 summary 仍 FAIL，ISS-002 不变）；`gate check` 默认只打印非 PASS，`--all` 全打；`gate status` 前三行 commit / missing / next；pre-commit 只跑 `check --quick` + 暂存了 approvals 时的身份守卫，不再跑全量测试。
- 决定（worklog 级，见 v5 未决问题第 1 点）：审批哈希改为正文哈希（`sha256Body`，去掉前言），旧全文哈希在文件未动时仍接受；正文不符 → G-req WARN，`gate-warn: G-req ref=APR-nnn` 放行；`gate approve` / `gate hash` 同步。理由：CHG-011 的状态翻转曾迫使重绑 APR-004（8f77b84），这正是要去掉的摩擦。
- 缺口猎取（C-06）：新上下文子代理对 v5 报 40 条，处置全部写进 v5「未决问题」；v5 / overview-v4 状态改 proposed，待 APR-005 一次点头（含 8 条超出 CHG-011 字面的解读）。
- 证据：`npx tsc --noEmit` 0 错；`node --test` 222 passed / 0 failed；`gate check --quick` = PASS_WITH_WARN（仅 REQ-017/AC-4 proxy），`checks=4`；新黑盒 `tests/chg011-quick-gate.test.ts` 6 条（REQ-017/AC-6、REQ-005/AC-6、AC-7、REQ-011/AC-4、REQ-018/AC-1、REQ-006/AC-4）。

## 2026-09-01（CHG-014 S1：提交尾注成段 + harness 探测覆盖 Codex/Cursor）

- 进度：ISS-058 / ISS-059 红→绿。`hook.ts` 新增 `insertTrailers`（尾注单独成段、作者自写尾注段直接追加、git `#` 注释块留最后；Keel-Precommit 与身份尾注合并一次插入）；`harness.ts` 探测顺序 `KEEL_AGENT` → `CLAUDECODE` → 任一 `CODEX_*` → `AI_AGENT` → 父进程名（`codex`/`claude`/`opencode`/`grok`/`dsh`，Windows 一次 CIM 查询 ≈150 ms，POSIX 一次 `ps`，`KEEL_ANCESTRY=0` 可关）；Cursor / VS Code 只记 `Host:` 不当 agent；`precommitAprNotes` 在无法识别但暂存了无委托 approved APR 时打印 WARN；`approve.ts` 同步走父进程兜底。
- 实现决定：**编辑器宿主不等于 agent**。Cursor 集成终端里人手动 `git commit` 与 Cursor agent 的 shell 共享一套环境变量，若把 CURSOR_* 当 agent 标记，DEC-166 会拒绝人类在 Cursor 里的正常审批提交；所以宿主只记 `Host:`，守卫只对 Claude Code / Codex / 父进程为 harness 可执行文件的情形生效。Codex 的具体变量名未实测（本机 Codex CLI 登录失效，`refresh_token_reused`），暂用 `CODEX_*` 前缀规则，ISS-059 里注明待用户在 Codex Desktop 取一次 `Get-ChildItem env:` 后钉死。
- C-34: ref=ISS-059 —— `tests/r6-field-guards.test.ts`「a human outside any harness」与 `tests/w2-gate.test.ts`「approve as a human」两条夹具加 `KEEL_ANCESTRY=0`：测试进程本身跑在 `claude.exe` 之下，新的父进程兜底会如实识别出 harness，夹具必须显式声明"无祖先"才仍是"平面终端里的人"。断言未改。
- 证据：`tests/chg014-hook-harness.test.ts` 5 条（ISS-058、REQ-019/AC-5、ISS-059、REQ-019/AC-6 ×2）先红后绿；`node --test` **245/245**；`npx tsc --noEmit` 干净；`gate check --quick` PASS_WITH_WARN（仅 REQ-017/AC-4 proxy）。本仓提交 `7238be8` 是 ISS-058 的活样本（尾注折进主题）。

## 2026-09-01（评审第 1 轮：ISS-064 / ISS-066）

- 工件路径为目录时 `gate check --quick` 不再崩（按 missing）；交互式提交的空消息给主题预留首行（ISS-058 复发）。见 F7 worklog 同日节。

## 2026-09-04（CHG-016：新项目门禁口径）

- G-merge 在无认领 / 无 summary / 无 verify.json 时 SKIP（`anythingBuilt`）；G-plan 对带 REQ-000 的计划 WARN（`templatePlans`）；X-trace 草稿引用 WARN；`confirmedReqCount` 或文件头 confirmed 都算基线已取。证据：REQ-026/AC-5、REQ-006/AC-11。
