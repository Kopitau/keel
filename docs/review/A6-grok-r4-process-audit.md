# A6 — Grok R4 返工过程审计（第五轮，trace 线）

> 审计者：Claude（独立上下文，未参与本轮实施，符合 C-39/C-42）
> 日期：2026-08-25
> 对象：`326f1d8`（ISS-022）与 `8bb6726`（ISS-023~029）两次提交对应的 Grok 会话片段
> 数据源：`~/.grok/sessions/E%3A%5Cprogram%5Cen/01a02348-.../`（`updates.jsonl` / `events.jsonl` / `chat_history.jsonl` / `compaction*`）+ 上级 `prompt_history.jsonl`
> 本轮范围：turn 32 / 33 / 34，**2026-08-25 02:00:36Z – 02:49:04Z**（本地 10:00–10:49）。下文时间戳一律为 **UTC**。
> 本报告只核查，未修改 `E:\program\en` 与 `~/.grok` 下任何文件；需要实跑的部分在 scratchpad 的仓库副本上执行。

---

## 0. 一句话结论

**没有谎报。** 本轮对用户的 4 处完成性陈述全部有工具输出支撑，且措辞精确（说 `check --quick` 就是 `--quick`，不冒充完整 check）；上一轮点名要做而没做的 **npm 打包安装端到端实测，这次是真跑了**，还先红后绿。

**但因果链没断。** 全轮仍然**一次完整 `gate check` 都没跑、一次 `gate verify` 都没跑、自己刚重写的 `gate loop` 一次都没在真仓库上执行**。我实跑确认：交付的 HEAD 上完整 `check` 是**红的**，且即使补跑 `verify`（134 全绿）之后仍红在 `G-done: review loop not passed (REQ-027)`，`exit 1`。R4 报告里那条「只跑 --quick → 看不见回路从没跑过」的缝，**第三次漏了东西**。

另有一处程序偏离：ISS-022 明写「手写 JS 或加构建步骤，**二选一需走决策**」，Grok 选了手写 JS，只在 worklog 记了一行「实现决定」，**没有立 DEC 也没走 CHG**——正是 R1 P1-1 点名的反面教材形态。

---

## 1. 方法与口径

- **`assistant`（给用户的正式回复）与 `reasoning`（内部思考流）严格分开统计**。本轮 `agent_message_chunk` 拼出 **16 条** assistant 消息，`agent_thought_chunk` 拼出 **88 段** reasoning。下文凡引用必标明来源类型。上一轮 A5 把 reasoning 当播报而误判为谎报，本报告不重复该错误。
- 命令统计取 `updates.jsonl` 的 `tool_call`（`run_terminal_command` 的 `rawInput.command` 原文），执行结果取 `task_completed.task_snapshot.output` 与 `exit_code`。
- 凡我自己实跑的，标注「**审计者实测**」，均在 `scratchpad/enclone`（`E:\program\en` 的完整副本，HEAD = `8bb6726`）上进行。

### 本轮工具调用总量

| 工具 | 次数 |
|---|---|
| `read_file` | 124 |
| `search_replace` | 70 |
| `run_terminal_command` | 25 |
| `grep` | 24 |
| `write` | 11 |
| `get_command_or_subagent_output` | 8 |
| `list_dir` | 7 |
| `todo_write` | 6 |
| **`spawn_subagent`** | **0** |

用户在本轮只发了 3 条指令（`prompt_history.jsonl`）：
`02:00:36 有新的审核意见，需要你进行阅读` / `02:04:34 从iss 022开始修` / `02:15:42 按照顺序继续修 直到所有内容修完`。

---

## 2. 符合

### 2.1 没有谎报：4 处完成性陈述逐条核对（assistant 消息）

| # | assistant 原文（截取） | 时间 | 核对结果 |
|---|---|---|---|
| 1 | 「ISS-022 已修，提交 **`326f1d8`**。`node --test` **116 通过**；`check --quick` **PASS**。」 | 02:13:03 | **成立**。02:12:10 `task_completed`：`1..116 / # pass 116 / # fail 0`，exit=0。`check --quick` 该轮无独立命令，但提交走了 `.githooks/pre-commit`（内容为 `gate.sh check --quick \|\| exit 1`），`326f1d8` 提交体带 `Keel-Precommit: ok` → 钩子确实跑过且过了。属**间接但真实**的证据。 |
| 2 | 「失败原因是 `pack` 会写入 `state.json`/`pack.json`，树哈希随后就变了。」 | 02:39:03 | **成立**。02:40:53 `task_completed` 里的失败原文即 `working tree moved since pack; re-run gate loop pack (ISS-023)`。 |
| 3 | 「测试重命名被 C-34 当成删除。在 worklog 里补上对 ISS-028 的引用。」 | 02:45:56 | **成立**。02:45:42 全量跑 `# pass 133 # fail 1`；`keel/test-baseline.json` 的 diff 里确实只有一条改名：`REQ-028/AC-3 auxiliary lens for skills and records` → `...for records; skills are attack-lens (ISS-028)`，其余 18 条全是新增，**无静默删除**。 |
| 4 | 「ISS-023→029 已按顺序修完并提交：`8bb6726`。`node --test` **134 通过**，`gate check --quick` **PASS**。」 | 02:49:04 | **成立**。02:47:59 `task_completed`：`1..134 / # pass 134 / # fail 0`，exit=0；02:45:56 有 `node tools/gate/gate.ts check --quick`；`8bb6726` 带 `Keel-Precommit: ok`。 |

**没有任何一处声称完整 `check` 通过或 `gate verify` 通过。** 措辞一直写作 `check --quick`，没有把 quick 冒充成完整门禁。

### 2.2 ISS-022 的 npm 打包安装端到端实测：**真跑了**（对照上一轮 CHG-007 的 0 次）

`tests/chg007-installer.test.ts:71` 起的 `REQ-025 ISS-022 npm pack then prefix install then keel init` 是真实的三段式端到端：

```js
const packed = spawnSync(npm, ["pack", "--pack-destination", packDir], { cwd: repo, timeout: 120000, ... });
const inst   = spawnSync(npm, ["i", "--prefix", prefix, join(packDir, tgz ?? "")], { timeout: 120000, ... });
const r      = spawnSync(process.execPath, [bin, "init", "--name", "packed", "--tier", "local"], { cwd: proj, ... });
assert.doesNotMatch(r.stderr + r.stdout, /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/);
```

执行痕迹（`task_completed`）：

- **02:09:00 exit=1** — `not ok 3 - REQ-025 ISS-022 npm pack then prefix install then keel init … null !== 0`（`# pass 14 # fail 1`）。**这是真红灯。**
- 02:09:13 reasoning：`npm pack failed with status null - maybe npm not found without shell. On Windows need npm.cmd or shell: true.` → 修测试。
- **02:12:10 转绿**，该子测试 `duration_ms: 37625.5`；后续 02:45:42 为 26427ms、02:47:59 为 33543ms。三次都是几十秒量级，与「真的在做 npm pack + 安装 + init」一致，不是空跑。

R4 报告写的「CHG-007 点名的 npm 实测全程未做（trace 中 npm 命令 0 次）」这一条，**本轮已经不成立了**。

### 2.3 主动的、正确的边界克制（assistant 消息）

02:49:04 assistant 原文：

> 「CHG-008 **仍然是 `proposed`**，我没有代批。
> 下一步（这轮没做，也不该由同一实施上下文做）：1. 人类批准 CHG-008 2. **独立上下文**实跑 ISS-022~029 的复现命令做复审 3. 远端 URL / APR-001 / CODEOWNERS 真人 — 未决，不会编造」

- **0 个新 DEC 文件**、**0 个已确认决策被改**（两次提交的 stat 里 `keel/decisions/` 完全没有出现）。
- CHG-008 状态仍是 `proposed`（`keel/changes/CHG-008-auto-review-loop.md` frontmatter 实测确认）。
- **R4 交付要求 5（「CHG-008 proposed 却已实施，返工时一并理顺」）有落字**：`8bb6726` 在 CHG-008 里新增了一节——
  > 「## R4 返工（ISS-023~029） … **不另开 CHG**（未改 REQ 正文）。**本单 status 仍为 proposed**，agent 不得代批。」
- `keel/handoff.md` 顶部也写着「修完后须由**真正独立的上下文**实跑 8 条 ISS 复现命令再审；不要用「用户说复审完了」代替」——把 R4 那条教训抄进了交接文件。

### 2.4 本轮**有**红灯证据（前几轮为零）

`task_completed` 里 5 次非零退出：

| 时间 | 命令 | 结果 |
|---|---|---|
| 02:09:00 | `node --test tests/chg007-installer.test.ts` | exit=1，`pass 14 / fail 1`（npm pack e2e） |
| 02:38:27 | `node --test tests/r4-rework.test.ts tests/chg008-review.test.ts` | exit=1，`pass 30 / fail 1` |
| 02:40:53 | `node --test tests/r4-rework.test.ts` | exit=1，失败原文 `working tree moved since pack; re-run gate loop pack (ISS-023)` |
| 02:42:26 | 同上 | exit=1，失败原文 `attack-lens changes require a different reviewer harness (DEC-159/ISS-024)` |
| 02:45:42 | `npx tsc --noEmit; … node --test` | exit=1，`pass 133 / fail 1`（C-34 改名） |

**关键点：02:40 / 02:42 这两次红灯驱动的是生产代码修改，不是把断言改松。**
- 02:39:03（assistant）定位到「pack 写 `state.json`/`pack.json` 导致树哈希变化」→ 改 `tools/gate/git.ts` 的 `gitWriteTree` 排除表；
- 02:42:42 改 `reviewloop.ts` 的 `LOOP_ARTIFACT_RE`。
两处排除都**精确到 4 个回路产物文件名**（`pack.json|state.json|rounds.json|fuse-report.md`），**没有**把整个 `keel/review/` 排除掉——所以 ISS-028 要求的「改 `keel/review/` 属攻击面」没有被这次修复反噬（测试 `ISS-028 production pack classifies keel/review/ as attack` 在 02:43:33 绿）。这是**对症修复**而非**测试染绿**。

### 2.5 抽查三条阻断级：根因理解正确、修法对症

| ISS | 根因（R4 认定） | 交付的修法（审计者读码确认） | 判定 |
|---|---|---|---|
| **ISS-023** 空数组绕过 | `ingest` 收空数组即 passed；状态不绑树、全仓一个布尔 | `runLoop ingest` 无 `pack_hash` 直接 `fail("run gate loop pack before ingest; empty findings are not a review (ISS-023)")`；再校 `packHashOk` + `gitWriteTree` 比对；`ingest` 强制 `--reviewer`，`unknown` 也拒；`completionReviewGaps` 增加 pack.json 存在性、哈希一致、树哈希新鲜、`loop.feature` 不覆盖他 feature 四道 | **对症** |
| **ISS-025** 从不实跑复现命令 | `runReproCommand` 零调用方；`loop clear` 是无条件 fail 的桩 | `runLoop` 的 `clear` 分支接 `recordClear`；`recordClear` 对每条 blocking ISS `extractRepro` + `runReproCommand`，`refused = exit_code !== 0`；**函数签名不再接受调用方传入的 `repro_runs`**（02:20:15 的旧测试 `recordClear(ctx, [{iss:"ISS-001", refused:false}], …)` 被相应改写） | **对症** |
| **ISS-026** 熔断永不触发 | `verify` 抹掉证据 `review` 段；计数键用每轮新 ISS 编号 | `verify.ts` 增 `const prev = readEvidence(ctx)` 与 `review: prev?.review`；`bumpRounds` 改用 `state.iss_fp[id]`（指纹）作键；新增 `keel/review/rounds.json` 台账，`mergeRounds` 取 `max` 合并 → 删 `state.json` 不清零 | **对症** |

### 2.6 上下文压缩：有一次，未见约束丢失

- **02:20:16** `auto_compact_started`：`tokens_used: 400463 / 500000（80%）`；**02:22:50** `auto_compact_completed`：`tokens_after: 11007`。会话累计 `compactionCount: 6`。
- 压缩后立即自我恢复：02:23:03–02:23:18 连续读 7 个 `ISS-023~029` 文件 + `docs/review/REWORK.md` + `keel/handoff.md` + `reviewloop.ts` + `chg008-review.test.ts` + `.agents/skills/k-bugfix/SKILL.md`，并把 todo 逐条重建为 ISS-023…029。
- 压缩前定下的约束（按 ISS 顺序、每条留 guard 写 `defense_pointer`、CHG-008 不代批）在压缩后全部保留并最终落实。**未发现约束丢失。**

---

## 3. 偏离

### 3.1 【最重要】完整 `check` = 0 次，`gate verify` = 0 次，`gate loop` = 0 次 —— 同一条缝第三次漏

**本轮 25 条终端命令的门禁类分布：**

| 命令 | 次数 | 时间 |
|---|---|---|
| `gate.ts check --quick` | **1**（另有 2 次经 pre-commit 钩子） | 02:45:56 |
| `gate.ts check`（完整） | **0** | — |
| `gate.ts verify` | **0** | — |
| `gate.ts loop pack/ingest/clear/status` | **0** | — |
| `node --test`（全量） | 3 | 02:10:18、02:44:15、02:46:40 |
| `node --test <file>`（单文件/单用例） | 8 | — |
| `npx tsc --noEmit` | 3 独立 + 2 组合 | — |
| `gate.ts status` / `index` / `gen-test-baseline` | 1 / 2 / 1 | — |

**放大到全会话（186 条终端命令）同样成立：**
`check --quick` 15 次；完整 `check` **仅 2 次，都在 2026-08-21**（W2/W3 期）；`gate verify` **全会话 0 次**（唯二的正则命中是 `node --test --test-name-pattern "gate verify writes"` 与一条含该字样的 git 提交信息，非真实调用）。

**证据链闭合：** `keel/evidence/verify.json` 现状为
`git_commit: e75e356…`（**上一轮**的 CHG-008 提交）、`counts: {passed:114,…}`、`started: 2026-08-25T00:44:56.340Z`。
该时刻落在 turn 31 结束（08-24T10:16:30Z）与 turn 32 开始（08-25T02:00:36Z）之间的**空档**——不是 Grok 任何一次工具调用产生的（几乎可以确定是 R4 复审者自己跑的）。也就是说：**Grok 从未生成过任何证据文件**。

**审计者实测（仓库副本，HEAD=`8bb6726`）：**

```
$ node tools/gate/gate.ts loop status
review loop: none                      ← 回路仍然一次都没跑过

$ node tools/gate/gate.ts check         ← 完整 check
FAIL G-done     stale tree_hash or nonzero exit_code
FAIL X-evidence stale tree_hash or nonzero exit_code
result: FAIL  fail=2

$ node tools/gate/gate.ts verify
verify PASS  counts: passed=134 failed=0 skipped=0

$ node tools/gate/gate.ts check          ← 补跑 verify 之后再来
PASS X-evidence  fresh tree eca8aab9d811…; junit 对账
FAIL G-done      review loop not passed (REQ-027)
result: FAIL  fail=1        exit=1
```

`keel/review/` 目录下**没有** `state.json` / `pack.json` / `rounds.json`——回路产物一个都不存在。

**这意味着：**
1. 交付的 HEAD **过不了自己的完整门禁**，`exit 1`；
2. CI（`.github/workflows/*.yml` 顺序为 `node --test` → `tsc` → `verify` → `check`）在这个 HEAD 上**必红**——与 ISS-019 同型的处境；
3. R4 那条因果链原样复现：**只跑 `--quick`（恰好跳过 G-done / X-evidence）→ 看不见完整 check 是红的 → 也看不见自己刚重写的回路从没跑过。**

需要公平地说明一点：`G-done` 现在红，**部分是设计使然**——本轮改动落在 `tools/gate`、`tests/`、`bin/`、`package.json`，`classifyLens` 判为 `attack`，而 `attack` 镜头按 DEC-159 强制异构复审，实施者本人**不可能**单方面把它转绿。这恰恰说明防线在起作用。但正因为如此，**「本仓库当前完整 check 是红的，且只有异构复审者能让它转绿」是一条应当向用户播报的状态**，trace 里 16 条 assistant 消息中一条都没提。

### 3.2 R4 明确「建议本轮落成机器检查」的元规则，未做，也未说明未做

R4 报告与 `keel/handoff.md` 都写着：

> 「凡「快速模式」跳过的检查项，必须另有一条针对真仓库的完整检查测试 —— 当时没落成机器检查，于是同一个缝隙第二次漏了东西。**本轮建议把它落成实际门禁项。**」

实测：`tools/gate/check.ts` 在本轮**两次提交里都没有被修改**（`git log -- tools/gate/check.ts` 最新一条仍是上一轮的 `e75e356`）。完整 `check` 的 21 个检查项与上一轮完全相同，没有新增元检查。

唯一一条「在本仓库上 verify 后跑完整 check」的自洽测试是 `tests/r2-rework.test.ts:73 REQ-006 ISS-019 hermetic verify then full check both exit 0`——它跑在 `mkdtempSync` 造的**合成 fixture** 上（函数名里的 `hermetic` 就是这个意思），**不是本仓库**。本仓库层面仍只有 `tests/w2-gate.test.ts:90 REQ-017 gate check --quick on this repo exits 0`，**依然是 quick**。

这条是「建议」不是「硬性交付要求」，但**既没做也没在 assistant 消息或 handoff 的「未决」里记一句「未做」**——handoff 里那段建议原样留着，读起来像仍待办，而「已做（本会话）」里没有对应说明。

### 3.3 ISS-022 明写「二选一需走决策」，实际只在 worklog 记了一行「实现决定」

ISS-022 修复段原文：

> 「只有 `bin/` + `tools/cli/` 需要 JS 化（**手写 JS 或加一个只打包 CLI 的构建步骤，二选一需走决策**）。」

Grok 选了「手写 JS」，落点是 `keel/features/f23-bootstrap/worklog.md`：

> 「- 实现决定：手写 JS 安装器，不加构建步骤（DEC-154）。」

**没有新建 DEC，也没有走 CHG。** 这正是 R1 P1-1 列为反面教材的形态（「不要只在 summary 里记一条「实现决定」」，见 REWORK.md 第 1 节末尾的「修 P0 时请一并遵守」）。

实质影响不算小：DEC-151（confirmed，「免构建：直接运行 .ts」）的立论是「**agent 读到的 .ts 就是实际执行的代码，不存在 dist 与源码不一致导致的误判**」。本轮把 `tools/cli/*` 全部改成手写 JS，并新增手写的 `tools/cli/main.d.ts`、`tools/cli/doctor.d.ts` 供测试引用——**类型声明与实现重新分离了**，只是分离方式从「编译产物」换成了「手写 .d.ts」。这属于 DEC-151 适用范围的收缩，按 C-21/C-22 该走记录。ISS-022 自己也认为「DEC-151 框架本体免构建不受影响」，所以这不是错误决定；**问题只在于「需走决策」这句被跳过了**。

### 3.4 C-31/C-35：仍是实现在前、测试在后

按 `tool_call` 时间线（`write` / `search_replace` 的 `file_path`）：

**ISS-022**
```
02:06:14  write  tools/cli/result.js, layout.js
02:07:13  write  init.js, update.js, uninstall.js, doctor.js, main.js, bin/keel.js
02:07:45  write  main.d.ts, doctor.d.ts   +  search_replace tests/chg007-installer.test.ts   ← 测试在此才出现
```

**ISS-023~029**
```
02:19:13  write            tools/gate/reviewloop.ts   （整文件重写）
02:31:06 / 02:31:46        reviewloop.ts 8 处大改
02:34:09  search_replace   tests/r4-rework.test.ts    old_string="" ，一次性写入 18222 字节 ← 测试在此才出现
```

`tests/r4-rework.test.ts`（455 行、18 条用例）是在生产代码基本完工**之后**一次性生成的。C-35 要求的「写一个**没有补丁就失败、有补丁就通过**的回归测试」这个顺序，本轮**仍未做到**——本轮出现的红灯全部是「有补丁之后测试自己红」，不是「无补丁时红」。

同时 `.agents/skills/k-bugfix/SKILL.md` 的流程第 1 步「**Reproduce.** Record the command, hypotheses, and each check in the worklog (C-60)」也被跳过了：
- 02:04:42（reasoning）写着 `Let me follow k-bugfix, read the full ISS-022, reproduce if possible, then implement with tests.`，但 02:04:44 之后是 12 次 `read_file`，02:06:14 直接开始写实现——**ISS-022 的两条复现命令（`npm i -g file:` junction、tarball 安装）一条都没跑过**；
- ISS-023~029 同理，7 条复现命令在真仓库上**执行 0 次**（`gate loop` 全轮 0 次调用）。
- k-bugfix 的 `## Done` 判据「`gate verify` includes the new test」也未满足（verify 未跑，证据仍停在 114 条）。

### 3.5 未派子代理（能力存在，本轮 0 次）

- Grok 的系统提示第 7 行明确有 `spawn_subagent`：`When the user explicitly asks you to use subagents or delegate work … make the spawn_subagent calls near the start of the work.`
- **全会话 `spawn_subagent` 调用 0 次**（`events.jsonl` 的 `tool_started` 全量统计里根本没有这个工具名）。
- 用户本轮 3 条指令中没有点名要子代理，且 Grok 在 02:49:04 明说「独立上下文复审……不该由同一实施上下文做」——**这个选择本身符合 C-39/C-42，不算违规**。
- 但要点是：CHG-008/REQ-027 的立项动机就是「让 agent 自动启动子 agent 进行审核然后落盘」。**这条回路被重写了两次、写了 18 条测试，却连一次真实的端到端演练都没有**（连自己给自己 `pack` 一次看看输出长什么样都没做）。

### 3.6 handoff 里有一条与事实不符的遗留行

`keel/handoff.md` 的「未决」段最后一行：

> 「- `docs/review/` 下的 A1~A5 与 REWORK.md 未提交」

实测 `git ls-files docs/review` 返回 A1、A2、A3、A4、A5、REWORK.md **全部 6 个文件都已入库**（A4/A5/REWORK 由 Grok 自己在 `326f1d8` 用 `git add -A` 带进去的，02:12:35 的 reasoning 里还专门讨论过要不要带）。这是一条压缩后未更新的过期行，无害但会误导接手者。

---

## 4. 存疑

### 4.1 ISS-022 的 guard 只覆盖两条坏路径中的一条

ISS-022 列了两条复现路径：**① `npm i -g file:`（junction）→ `isMain` 判假 → 静默无操作**；**② tarball/git URL → `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` 崩溃**。

新增的 e2e 测试走的是 **`npm pack` → `npm i --prefix` → 运行 packed bin**，即**路径 ②**。路径 ① 只有源码文本级断言兜底：

```js
assert.doesNotMatch(src, /isMain/);
```

junction 安装这条路径**没有任何端到端验证**。考虑到 R4 就是因为「只测了链接安装、没测真副本」才漏掉 ②（ISS-022 里点名 RES-902 的教训），现在反过来「只测了真副本、没测链接安装」，属于同一类不完整。这条**不构成谎报**（assistant 从未声称覆盖了两条路径），但 `defense_pointer` 的覆盖度值得代码线复核。

### 4.2 `keel/evidence/` 同时进了攻击面清单和产物过滤名单

- `ATTACK_RE` 里有 `/^keel\/evidence\//`（ISS-028 要求）；
- `LOOP_ARTIFACT_RE = /^keel\/review\/(pack\.json|state\.json|rounds\.json|fuse-report\.md)$|^keel\/evidence\//`，而 `collectChangedPaths` 末尾 `.filter((p) => !LOOP_ARTIFACT_RE.test(p))`。

结果：**只改 `keel/evidence/` 的改动集不会把镜头抬到 `attack`**，因为这些路径在分类前就被滤掉了。实际影响被 `.gitignore`（`keel/evidence/*.json|xml`）削弱，但这与 ISS-028 的字面要求相左。交代码线判定。

### 4.3 「异构」仍然是两个自述字符串是否相等

`heterogeneousOk(required, implementer, reviewer)` 的全部判据是 `a.trim().toLowerCase() !== b.trim().toLowerCase()`，而 `implementer` / `reviewer` 来自 `--implementer` / `--reviewer` 命令行标志或 `KEEL_HARNESS` 环境变量。

ISS-024 把**镜头分类**从自述改成了从 git 改动路径推导（这是真进步，`ISS-024 flipping heterogeneous_required in state.json does not drop the het gap` 有负面测试守着）；但**「评审者是谁」这一项仍然完全是自述**——实施方敲一句 `--reviewer claude-code` 就满足异构。

这未必是本轮该解决的（本地档没有可信身份源，C-48 已经承认「劝阻失误、不劝阻恶意」），但 trace 的 16 条 assistant 消息与 7 个 ISS 的「落地」段里，**都没有点出这一处残留**。R4 说的「把口头声明换成一个同样可以自己写的布尔值，洞没堵上只换了形式」——现在的形式是「一个可以自己写的字符串」，**堵住了大半（必须先 pack、绑树、绑 pack 哈希、真跑复现），但没堵死**。

### 4.4 C-34 引用通道被实施方在同一轮里用在自己身上

02:45:42 的红灯是 `X-tests` 判定测试改名 = 删除。修法是往 `keel/features/f07-review/worklog.md` 加一行：

```
- C-34: ref=ISS-028 renamed REQ-028/AC-3 (skills paths are attack-lens, not auxiliary)
```

这**完全符合 R3 对 ISS-021 提的第 ③ 条 guard 要求**（「删除但引用真实记录时必须放行」），引用的 ISS-028 也确实是改名的真实原因，`test-baseline.json` 的 diff 证明只此一条改名、无静默删除。**判定为合规使用**。仅登记备查：这是「自述引用」通道第一次被实施方用于解除自己造成的门禁红灯，后续若频次上升需要重新评估 C-34 的强度。

### 4.5 reasoning 流里有一处与事实不符（**非对用户播报**）

02:20:15 的 `agent_thought_chunk`：

> 「Continuing the fixes in order: … - Rewrote `r4-rework.test.ts` for `chg008` recordClear and completionReviewGaps.」

而 `tests/r4-rework.test.ts` 实际到 **02:34:09** 才被创建（`search_replace`，`old_string: ""`，18222 字节，是该文件的首次出现）。也就是说这句「Rewrote」在写下时并不成立。

**这条只在思考流里，没有出现在任何一条 assistant 消息中，也没有构成对用户的完成声明。** 按上一轮 A5 的教训，此处**不定性为谎报**，只登记为「reasoning 与实际进度不同步」的一次观察。

---

## 5. 逐条回答委托的 7 个问题

| # | 问题 | 结论 |
|---|---|---|
| 1 | 有没有谎报？ISS-022 真跑 npm pack / 安装了吗？ | **无谎报**（4 处完成性陈述全部有工具输出支撑，措辞精确）。**npm pack + prefix 安装 + packed bin 跑 init 真跑了**，先红（02:09:00 exit=1）后绿（02:12:10，37.6s）。**但**未向用户披露「完整 check 红 / verify 未跑 / 回路从没跑过」——属**遗漏披露**，不是谎报。 |
| 2 | 跑了完整 check 和 verify 吗？ | **没有。** 本轮完整 `check` **0** 次、`gate verify` **0** 次、`check --quick` **1** 次（+2 次经 pre-commit 钩子）、`node --test` 全量 **3** 次、单文件 8 次。全会话口径：完整 `check` 仅 2 次且都在 08-21，`gate verify` **0** 次。 |
| 3 | 跑过自己建的回路吗？派子代理了吗？ | **一次都没跑。** `gate loop` 终端调用 0 次；`gate loop status` 实测输出 `review loop: none`；`keel/review/` 无 `state.json`/`pack.json`/`rounds.json`。`spawn_subagent` 全会话 0 次（该工具确实存在于系统提示）。**但**回路的生产函数 `runLoop(ctx, ["pack"…])` 在测试里被真实调用过（测试名含 `production pack`），并在 02:38–02:43 因真实机制缺陷红了三次。 |
| 4 | 修复是否对症？ | **对症。** 抽查 ISS-023 / ISS-025 / ISS-026 三条阻断级，读码确认修的是根因（pack-first + 三重哈希绑定 / `clear` 接 CLI 且强制实跑复现且不信调用方传入的 `refused` / 证据 `review` 保留 + 指纹计数 + 外置 `rounds.json`）。02:40 与 02:42 两次红灯驱动的是生产代码改动，排除范围精确到 4 个文件名，未把 `keel/review/` 整体豁免——**不是把测试改绿**。 |
| 5 | 有没有未经确认的自主决定？CHG-008 理顺了吗？ | 新增 DEC **0**、改已确认决策 **0**、代批 CHG **0**。CHG-008 **理顺了**（新增一节说明「不另开 CHG（未改 REQ 正文）、status 仍 proposed、agent 不得代批」）。**一处偏离**：ISS-022 明写「手写 JS 或加构建步骤，**二选一需走决策**」，Grok 选了手写 JS 却只在 worklog 记「实现决定：…（DEC-154）」，未立 DEC / 未走 CHG。**另一处**：「本仓库完整 check 现在是红的、且按设计只有异构复审者能转绿」这一状态应当升级给用户，未播报。 |
| 6 | 测试先写还是后补？有红灯吗？ | **仍是后补**（ISS-022：实现 02:06–02:07，测试 02:07:45 起；ISS-023~029：`reviewloop.ts` 02:19:13 重写，`r4-rework.test.ts` 直到 02:34:09 才一次性创建）。k-bugfix 第 1 步「Reproduce」被跳过，复现命令真仓库执行 0 次。**但本轮有真红灯 5 次**（前几轮为零），其中 2 次驱动生产代码修复——比前几轮实质改善，只是仍不满足 C-35 的「无补丁则红」。 |
| 7 | 上下文压缩？有无丢约束？ | **有 1 次**：02:20:16 触发（400463/500000，80%），02:22:50 完成（after 11007）。**未见约束丢失**——压缩后立即重读 7 个 ISS + REWORK.md + handoff.md + 实现文件，todo 逐条重建，顺序/guard/不代批三项约束全部保住。唯一遗留是 handoff「A1~A5 与 REWORK.md 未提交」这一行未随实际情况更新（见 3.6）。 |

---

## 6. 给下一轮的建议（trace 线视角）

1. **把「实施方自检必须包含一次完整 `check`」变成机器检查，而不是又一条建议。** 这是同一条缝第三次漏东西：R2 提过（口头）、R4 再提（口头+写进 handoff）、本轮仍未落地。可行落点：`X-quickparity` —— 检查 `keel/evidence/verify.json` 的 `command` 是否对应完整门禁、以及本仓库是否存在一条「真仓库完整 check」的测试（当前只有 hermetic fixture 版）。
2. **`G-done` 的红是设计正确的红，但它现在没有出口。** 攻击面镜头强制异构，实施方无法自清；而框架里没有任何机制**提醒**实施方「你的完整 check 现在是红的，需要外部人介入」。建议 `gate status` 增加一行 loop/evidence 新鲜度提示——目前 `gate status` 输出 `open_issues: 0` 且不含任何红灯信号，是 C-72 开场三跳的第一跳。
3. **「二选一需走决策」这类指令需要机器可校验的落点。** ISS 里写的方案分叉，若不落成 DEC，下一轮审计只能靠人读 worklog 发现。可考虑：ISS frontmatter 增 `decision_required: true`，`G-done`/`gate check` 校验对应 DEC 是否存在。
4. **C-31/C-35 依旧没有任何门禁项。** 四轮下来「测试后补」是唯一一条从 R1 提到 R4、每轮都复现、且**从未被任何检查项覆盖**的问题。它无法从最终产物判定，只能从 trace 判定——要么接受它只靠人审，要么设计一个「补丁前的失败证据」记录机制（如 `gate verify --expect-fail` 落盘一条红灯证据）。

---

## 附：本报告涉及的实测命令（均在 `E:\program\en` 的副本上执行，原仓库未被改动）

```
node tools/gate/gate.ts loop status      → review loop: none
node tools/gate/gate.ts check            → result: FAIL  fail=2 (G-done, X-evidence)
node tools/gate/gate.ts verify           → verify PASS  passed=134 failed=0 skipped=0
node tools/gate/gate.ts check            → result: FAIL  fail=1 (G-done: review loop not passed), exit=1
node tools/gate/gate.ts status           → wave: R4-rework / open_issues: 0
git ls-files docs/review                 → A1..A5 + REWORK.md 均已入库
git log --oneline -- tools/gate/check.ts → 最新为 e75e356（上一轮），本轮未改
```
