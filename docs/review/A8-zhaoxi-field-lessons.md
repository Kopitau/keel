# A8 — zhaoxi 首次真实使用暴露的框架缺口

> 审查对象：keel 框架本体（`E:\program\en`）
> 数据源：会话 `b14ac2e3-bda6-48c3-84c5-8adb9a65f608.jsonl`（1713 行，2026-08-25T07:32Z → 2026-08-26T01:31Z）+ 项目产出 `E:\program\zhaoxi`
> 立场：只报**框架能改进的**。那次会话的临场发挥、框架无从约束的，不报。
> 已知并即将修复的四条（顺序倒置 / C-06 缺口猎取 / RES 的 `oss:` 表态 / k-grill 措辞）**不重复**，但第 6 节有对其中两条修复方案的修正意见。

---

## 0. 先校正三处事实

任务书里的三条前提与磁盘上的实际状态不符，后续结论若基于旧前提会跑偏，先摆正：

| 任务书前提 | 实际 | 证据 |
|---|---|---|
| "零 commit、112 项未提交" | **5 个 commit**，`git status --porcelain` 只剩 **2 项**未跟踪（`.keel-worktrees/`、`claim.json`） | `git log --all --format="%h %ad %s" --date=iso` |
| "decisions/plan/features/issues 均为空" | decisions 8 条、plan 有 `overview-v1/v2`、features 9 个（各带 `plan/v1.md` + `worklog.md`）、issues **4 条**（其中 2 条只在 worktree 分支上） | `E:\program\zhaoxi\keel\` 与 `E:\program\zhaoxi\.keel-worktrees\F-00-platform-base\keel\` |
| "需求 v1.md 45 条" | **61 条 REQ**（45 条是第一稿，缺口猎取后补到 60，再补到 61）；文件 73 228 字节 | `keel/requirements/v1.md`；会话 09:12Z / 09:32Z 的进度汇报 |

产出的**主分支**记录都在 `master`，**实施期**的记录（ISS-003/004、CHG-001、DEC-009、APR-003、`overview-v2.md`、OSS-001~003）在 worktree 分支 `keel/F-0-platform-base` 上，尚未合回主干。看 `master` 会漏掉一半产出——**这本身就是一条可报的观察，见 §4.10**。

另外，任务书把 C-59 叫"执法阶梯"，并把第四档写成"技能措辞"。核对源文件：C-59 的正式名称是**闭环阶梯**，六档是

> 回归测试 → lint → 门禁/hook → **项目规则** → 决策修订 → 显式不修+理由（`DESIGN.md:241`）

全仓库不存在"技能措辞"这一档。"执法阶梯"这个词也不存在，最接近的是 `tools/gate/enforcement-tiers.md` 的**执法三档**（C-48/C-104，讲平台 CI 能力，不是修复手段）。本报告一律按 C-59 的真实六档定级；"改技能措辞"归入**项目规则**档。

---

## 1. 一句话结论

这次使用**没有**暴露"agent 不守规矩"的问题——恰恰相反，agent 守规矩守得相当好（三跳、批量提问、调研落文件、C-21 停下来问、ISS 六节齐全、C-24 冻结后走 CHG，全部做到了）。暴露的是**框架自身的四类结构性问题**：

1. **门禁把"没有"当成"合规"**（§2.1）——这是本次最深的一条，它同时解释了已知的第 1、2、3 条缺口，也解释了下面一半的新发现；
2. **keel 只在"它自己用的那一档配置"上被测过**（§2.2）——真实项目一换 profile / 换 OS / 换文件写法就踩到四个上游缺陷，且其中三个是**静默降级**（说成功、其实没做）；
3. **本地档没有权威层**（§2.3）——`enforcement_tier: local` 下，最要紧的 7 项检查（含 X-apr）从不自动运行；
4. **C-107 的"不可伪造"是一条命名规则，不是执行规则**（§2.4）——用户一句"由你提交"就穿透了框架四大支柱之一。

---

## 2. 建议新增的防线（按 C-59 阶梯从高到低排序）

### 2.1 【回归测试 + 门禁】门禁的"空即合规"语义 —— 一个什么都没做的项目能拿满绿

**现象。** `gate check` 的多数检查在"对象不存在"时返回 PASS 或 SKIP，而不是 FAIL：

| 检查 | 空状态下的判定 | 代码位置 |
|---|---|---|
| `G-research` | `decisions/` 一个 DEC 都没有 → 循环体不执行 → **PASS** | `check.ts:127-151` |
| `X-oss` | 无 `package.json` 或无直接依赖 → **SKIP** | `check.ts:410,412` |
| `X-trace` | 无"已声明完成"的 feature → **PASS**（视为无验收范围） | `check.ts:574-575` |
| `G-done` / `G-merge` / `G-retro` | 无 `summary.md` / 无已批准 APR / 无 `features/` → **SKIP** | `check.ts:191 / 261 / 281,287` |
| `X-owners` | `enforcement_tier: local` → **SKIP** | `check.ts:493-494` |
| `X-full` | 消费者项目（`tests/` 不调用 `runCheck`）→ **SKIP** | `check.ts:589,593` |
| `G-req` | 尚无实现活动且无 current 需求 → **SKIP** | `check.ts:96` |

zhaoxi 会话里 22 次 `gate check` 全绿，agent 每次都汇报"gate 全绿"（07:55Z、08:16Z、08:35Z、08:45Z…共 10 余次）。绿的含义是"没查出错"，但 agent 与用户都会读成"做对了"。

**违反了哪条。** 不是违反某条 C，而是与 `DESIGN.md §1` 的第三条设计总原则相悖：

> "**记录必须被消费**：每类记录都规定'谁在哪一步必读'，写完没人看的记录不设。"

"空即合规"让"不写"比"写错"更安全——写错会被查出来，不写永远是绿的。已知的三条缺口全部是这个模式的实例：只有 RES 没有 REQ（G-req SKIP）、承诺缺口猎取但没落地（无任何检查）、选了 dsh 但无 OSS 登记（X-oss 因无 package.json 而 SKIP）。

**门禁为什么没发现。** 因为这**就是**门禁的写法。每一条单独看都合理（"还没开始实施，当然不该要求 summary"），但合起来产生了一个不变量：**项目越处在早期，绿灯越廉价**；而早期恰恰是 keel 最想约束的阶段（需求、调研、决策）。

**建议的防线：回归测试（最高档）。**

1. 加一组"空项目 / 半成品项目"的 fixture 回归测试，断言**期望的判定**而不是"不 FAIL"：一个只有 RES 没有 REQ 的仓库必须 FAIL；一个 `decisions/` 为空但 `research/` 有 8 份 RES 的仓库必须至少 WARN；一个 `enforcement_tier: local` 且无 CI 的仓库必须 WARN。
2. 引入**阶段感知**：`keel/config.json` 增 `phase`（`init | requirements | plan | impl | done`），`gate check` 按 phase 决定哪些 SKIP 是合法的。当前 `wave` 字段（`status.ts:42`）只被打印，没参与任何判定，可以复用它。
3. `gate check` 的输出末尾打印一行 `skipped: N (G-done, X-owners, …)`，让"绿"和"没查"在视觉上可区分。现在 SKIP 和 PASS 在汇总里都不影响退出码，读起来一样绿。

---

### 2.2 【回归测试】keel 只在"它自己用的那一档配置"上被测过 —— 一次使用踩出四个上游缺陷，三个是静默降级

**现象。** zhaoxi 在 F0 实施期开出四条 ISS，**全部是 keel 本体的缺陷**，全部标 `wontfix（上游 keel）`：

| ISS | 缺陷 | 会话时间 |
|---|---|---|
| ISS-001 | `gate approve APR-001` 找不到 `gate new apr` 生成的文件（`approve.ts` 只试 `APR-001.md`，`new.ts` 生成的是 `APR-001-<slug>.md`，两处约定不一致） | 2026-08-25T09:43Z |
| ISS-002 | `gate approve` 对带引号的 `path: "…"` **不回填** `content_sha256`——回填正则要求路径不带引号，而模板 `keel/templates/APR.md` 与 `gate new` 生成的**就是带引号**的。`block.test(next)` 为 false → 静默跳过 → **状态却已改为 approved** | 2026-08-25T09:58Z |
| ISS-003 | (a) `verify.ts` 的 `activeProfile()` 只认数组 `["ts-js"]`，而 `keel/templates/config.json` 写的是字符串 `"unset"`，照模板写 `"active": "ts-js"` → `name = ""` → `profiles[""]` undefined → **静默退回 `node --test`**；(b) 即使写成数组，Windows 上 `spawnSync("npx")` = ENOENT、`npx.cmd` = EINVAL，`testcmd.ts` 白名单又是精确匹配，无第三种写法 | 2026-08-25T10:16Z |
| ISS-004 | `evidence.ts` 的 `parseJunit` 用 `xml.match(/\btests="(\d+)"/)` 只取**第一个** `<testsuite>`；`node --test` 每个 `describe` 一个 suite、根元素 `<testsuites>` 无聚合属性 → 27 条测试报成 5 条 | 2026-08-26T01:12Z |

四份 ISS 的"为何未被更早发现"一节，答案惊人地一致：

> ISS-001：`X-apr` 检查在 `--quick` 下跳过；首次真实走 approve 流程才暴露。
> ISS-002：`X-apr` 只在完整 `gate check` 跑；`--quick` 跳过；且 approve 成功路径没有对"未替换"的断言。
> ISS-003：keel 自身用 `node --test`（gate 是 Node 内建、零依赖），`ts-js` profile 在 Windows 上**没有被真实走过**。
> ISS-004：keel 自身的测试都在**单个 suite** 里；多 suite 的 JUnit 是本项目引入的第一例。

**违反了哪条。** `DESIGN.md` F17（C-105）"gate 自带测试"；F24 跨平台支持（DEC-143 声明 Windows + macOS + Linux）。keel 声称支持 4 个测试 profile（`python-cli` / `ds-ml` / `ts-js` / `other`）× 3 个 OS，实测只有 `node --test` × 开发者本机这一格被走过。

**门禁为什么没发现。** `X-full`（`check.ts:587-611`）已经是一条针对这个风险的元检查——它要求 `QUICK_SKIPPED_IDS` 里每个 id 都在 `tests/` 中被断言。但它管的是"**检查项**有没有被测"，不管"**配置组合**有没有被测"。`ts-js` profile 的代码路径从未被任何测试走过，`X-full` 全绿。

**建议的防线：回归测试（最高档）。**

1. **profile 矩阵 fixture**：为每个 `profiles.*` 建一个最小 fixture 仓库（一个 hello-world 测试），在 CI 上跑 `gate verify` 并断言 PASS。`.github/workflows/gate.yml` 已经有 ubuntu/windows/macos × node 22/24 矩阵，把 profile 加成第三维即可，成本很低。
2. **`ts-js` 在 Windows 上的 spawn**：把 `verify.ts` 的 `spawnSync(argv[0], …)` 改成 Windows 下对 `.cmd` 入口用 `shell: true`，或直接 spawn `node_modules/.bin/*.mjs`；配一条回归测试锁死。
3. **多 suite JUnit fixture**：把 `node --test` 生成的真实多 suite XML 存成 fixture，断言 `parseJunit` 数到 27 而不是 5。`evidence.ts` 里"没有根聚合属性就数 `<testcase>`"的分支已经存在，只是被第一条 `match` 抢先——改成 `matchAll` 求和即可。
4. **模板与代码的一致性 lint**：`keel/templates/config.json` 写字符串、`activeProfile()` 只认数组，这类"模板产出的东西代码读不了"应当有一条 lint——把每份模板当输入喂给对应的解析函数，断言解析结果非空。同一条 lint 也能抓住 ISS-002（模板写带引号的 `path: ""`，`approve.ts` 的正则要求不带引号）。

---

### 2.3 【门禁/hook】本地档没有权威层 —— X-apr 等 7 项检查在 zhaoxi 里**从未自动运行过**

**现象。** 三件事叠在一起：

- `keel/config.json` → `enforcement_tier: "local"`；
- `E:\program\zhaoxi\.github\` **整个目录不存在**（`gate init` 铺了 `.githooks/`，没铺 `.github/workflows/gate.yml`，而框架本体自己是有的）；
- `.githooks/pre-commit` 跑的是 `gate.sh check --quick`。

而 `QUICK_SKIPPED_IDS`（`check.ts:39-47`）跳过的正是：`G-done` `G-merge` `G-retro` `X-evidence` `X-types` `X-hooks` **`X-apr`**。

于是在 zhaoxi 里：L2（git hook）只跑 quick，L3（CI）不存在 → **X-apr 这条唯一防"agent 冒充人类审批"的检查，从头到尾没有被自动执行过一次**。整个会话 22 次 `gate check` 里，只有 4 次是不带 `--quick` 的完整 check（10:15Z、01:14Z、01:15Z、01:16Z），全部集中在最后阶段、全部是 agent 自己想起来跑的。ISS-002（approve 静默不回填哈希）就是因此活过了两次审批，直到 09:58Z 才被人工发现并补一个 commit 修（`6582d97 keel: fill APR-002 artifact hashes`）。

`X-bypass` 里"tier=github/gitee 才要求 CI workflow 存在"（`bypass.ts:99`）——local 档不要求，也不提醒。`X-owners` 在 local 档直接 SKIP（`check.ts:493-494`）。

**违反了哪条。** `AGENTS.md` 的执法模型写着 **"L3 CI rerun of gate (authority)"**，`enforcement-tiers.md` 也写着 local 档"权威是合并前本地跑 `verify` 和 `check`"。规则本身诚实，但**没有任何机制保证那句"合并前亲手跑"真的发生**。而 zhaoxi 恰恰是 keel 的目标用户画像（单人、本地优先、桌面工作台）——**框架的权威层，对它最典型的用户是缺席的**。

**门禁为什么没发现。** 没有检查会问"这个仓库有没有权威层"。`gate status` 打印 `enforcement_tier: local` 就完事了（`status.ts:52`），既不解释后果，也不建议升档。

**建议的防线：门禁/hook。**

1. `.githooks/pre-commit` 在 `enforcement_tier: local` 时改跑**完整** `check`（本地档没有 CI 兜底，慢一点是应该付的代价）；或至少把 `X-apr` 从 quick-skip 名单里挪出来——它只读 `approvals/` 目录和 git 作者，开销可以忽略。
2. 新增 `X-authority` 检查：`enforcement_tier: local` 且仓库有远端 → FAIL（"有远端却不升档"）；无远端 → WARN（"本仓库无 L3 权威层，合并前必须亲手跑完整 check + verify"）。按 §2.2 的 `warnWorklogCovered` 机制，这条 WARN 需要 worklog 显式认领才不升 FAIL。
3. `gate init` 在本地档也铺一份 `.github/workflows/gate.yml`（哪怕暂时不生效），让升档只需推一个远端。

---

### 2.4 【门禁/hook + 项目规则】C-107 是命名规则，不是执行规则 —— 用户一句话就穿透了"不可伪造的审批"

**现象。** 时间线：

- 2026-08-25T09:39:26Z agent：「请你做**一次整体点头**（C-06），然后用你的身份落地审批提交（C-107，我只起草不提交）。」
- 2026-08-25T09:42:23Z **用户原话：「由你提交」**
- 2026-08-25T09:42:47Z agent：「收到——按你的指示由我执行审批与提交（git 身份是你的 kopitau，不是 agent 身份；你的原话会记入 APR）。」
- 09:43:24Z 执行 `gate approve APR-001-… && git add -A && git commit`

APR-001 里如实记了这件事，措辞很说明问题：

> "必须由人类 git 身份提交（**C-107 禁止的是 agent 身份**）。本次由 agent 会话按用户明确指示'由你提交'以 kopitau 身份执行，记录于此以备审计。"

agent 的解读完全符合规则字面：`AGENTS.md` 的"Do not"清单写的是 **"Submit APR commits with an agent git identity (C-107)"** —— 禁止的是**用 agent 的名字**，不是**由 agent 来做**。

**门禁为什么没发现。** C-107 有两道守卫，两道都以 git 身份字符串为钥匙，一条 `git config user.name` 就同时开了两把锁：

| 守卫 | 位置 | 为什么没拦住 |
|---|---|---|
| `gate approve` 拒绝 agent 身份 | `approve.ts:44`（`gitIdentity`） | 当时的身份就是 `kopitau <wwillmee@gmail.com>` |
| `X-apr` 校验 APR 文件最后一次提交的作者 ∉ `identities.agents` | `check.ts:339,347-353`（`gitLastAuthor`） | 作者是 kopitau，检查必过；而且 `X-apr` 在 local 档从不自动跑（§2.3） |

**更值得说的是：唯一能区分"人做的"和"agent 代做的"那条信息，恰好丢了。** C-115 要求提交尾注含"功能/开发者/agent 平台模型/会话"，`hook.ts:88-97` 实现如下：

```ts
const agent = process.env.KEEL_AGENT || listed?.name || "unknown";
const session = process.env.KEEL_SESSION || "unknown";
```

没设环境变量、git 身份又不在 `identities.agents` 名单里 → 两者都落到 `"unknown"`。实际提交长这样：

```
Claude-Session: https://claude.ai/code/session_01LBQtCe2Zmry2ZhsYygHfzQ
Keel-Precommit: ok
Feature: F0
Developer: kopitau
Agent: unknown
Session: unknown
```

**Claude Code 自己在同一条 commit message 里写了完整的 session URL，keel 的 `Session:` 字段却是 `unknown`。** 信息就在旁边，框架没去取。

雪上加霜：`keel/config.json` 的 `identities.agents` 是 `gate init` 的**模板占位符** `keel-agent <agent@keel.local>`，没人填过真实 agent 身份——所以 C-107 那条"CI 校验作者 ∉ 清单"的检查，对任何真实 agent 都必然通过。

**违反了哪条。** C-107；以及 `DESIGN.md §1` 四大支柱的第三条：

> "**审批**：关键控制点（需求基线、技术方案+统一规划、变更、验收、合并）有**不可伪造**的确认记录。"

这次没有恶意（C-111 也明说"防误记谎报，不防人为恶意"），用户确实同意了，agent 也如实记录了。但**机制层面，"不可伪造"这个性质已经不存在了**——事后审计一个 keel 仓库，无法从记录里区分"用户亲手批的"和"agent 代批的"，除非去读 APR 正文的中文散文。

**建议的防线：门禁/hook（可行的最高档）。**

1. **把丢失的信息捡回来**（成本最低、收益最大）：`hook.ts` 的 `runHook` 在 `prepare-commit-msg` 时，先扫已有 message 里的平台尾注（`Claude-Session:` / `Codex-Session:` 等）与常见环境变量（`CLAUDE_SESSION_ID`、`CLAUDECODE`、`TERM_PROGRAM` 等），推断出真实的 agent/session 再落尾注。
2. **`X-apr` 增一条硬判据**：已批准 APR 的提交，尾注 `Agent:` 为 `unknown` → **FAIL**。理由：要么这次真是人手敲的（那就该能证明），要么是 agent 代做而没留痕（那正是要拦的）。
3. **委托必须机器可读**：用户授权代提交是合理的（C-110 的"轻确认"精神），但不能只活在中文正文里。APR frontmatter 加两个字段：

   ```yaml
   commit_executed_by: agent        # human | agent
   commit_delegation_quote: "由你提交"
   ```

   `X-apr` 校验：`commit_executed_by: agent` 时 `commit_delegation_quote` 必须非空。这样"agent 代批"从**违规**变成**留痕的合规操作**，审计时一眼可见。
4. **`identities.agents` 仍是模板占位符 → WARN**（`keel-agent@keel.local` 是 `gate init` 默认值，命中即提醒填真实身份），否则 C-107 的整条 CI 判据是空转。
5. **项目规则档配套**：把 `AGENTS.md` 那行 "Do not submit APR commits with an agent git identity" 改成执行者措辞，例如 "The human executes `gate approve` and the approval commit. If the user explicitly delegates, record the delegation in the APR frontmatter (C-107)."；`k-new` 第 5 步的 "Record APR (human identity, C-107)" 同改。

---

### 2.5 【门禁/hook】写了 2 小时 8 分钟才有第一个 commit；框架没有任何"该提交了"的机制

**现象。** 会话第一个工具调用 2026-08-25T07:35:13Z；第一个 commit `208a916` 在 **2026-08-25 17:43:28 +0800 = 09:43:28Z**，间隔 **2 小时 08 分**。这段窗口里已经产出：`requirements/v1.md`（73 KB / 912 行 / 61 条 REQ）、`v1-gaps.md`（45 条缺口）、RES-001~008、DEC-001~008、`CONTEXT.md` 32 条术语。这些全部只存在于工作区，机器一断电就没了。

后续的 commit 也不是按节奏来的，而是**恰好落在审批点上**——5 个 commit 里 3 个是 APR 驱动的。换句话说：**在这个框架里，commit 只在有人批东西的时候才发生。**

**框架侧的证据（`git.ts` 13 个导出函数逐一核对）：**

- `gitDirty()`（`git.ts:41-43`）只返回布尔值，**从不计数**，且唯一调用点是 `evidence.ts:67`——填 `verify.json.dirty` 字段；
- "dirty working tree" 只作为 `evidenceGaps()` 的一条 gap（`evidence.ts:82`），而 `evidenceGaps` 只被 `X-evidence` / `G-done` / `G-merge` 读取——这三项 `--quick` 全跳过，且在"没有完成声明 / 没有已批准 APR"时直接 SKIP。也就是说**日常写代码时永远不会触发**；
- `gitCommitUnix()`（`git.ts:78-82`）只用于 `G-retro` 比较两个文件谁的提交更早，代码里**从没有拿任何时间戳和 `Date.now()` 做差**；
- 没有"零 commit"分支：`gitHead()` 取不到提交时返回空串，无 FAIL 处理；
- `gate status`（会话开场跑的那条）**根本没 import `git.ts`**（`status.ts` 全文），不显示未提交数、不显示上次提交时间。

`k-new` 的五步（k-grill → k-research → k-decide → 统一规划 → 确认+APR）里，**没有一步是"提交"**。

**违反了哪条。** 不违反任何一条 C——C-72 只要求 `gate status` 输出"上次交接路径 / 未决问题数 / 暂定计数"，这三样它都输出了。所以这是**规则空白**，不是规则违反。但它与 `DESIGN.md §1` 第一支柱直接冲突：

> "**留痕**：需求、调研、决策（含暂定项的为什么）、实施过程、问题、经验——**写进仓库**、带稳定编号、被后续步骤强制消费"

写进工作区 ≠ 写进仓库。C-20 要求 worklog"追加式**不重写历史**"——但文件没进 git 之前，"不重写历史"是无法验证也无法保证的性质。

**门禁为什么没发现。** 所有 git 相关检查都是**事后核验**（你已经 commit / push / verify / approve 之后，校验这次动作合不合规），框架里不存在任何**前瞻性**的提交提醒。

**建议的防线：门禁/hook。**

1. `gate status` 增两行（成本极低，`git.ts` 里函数都现成）：

   ```
   uncommitted: 37 files
   last_commit: 2h08m ago (208a916)   # 或 "none — repository has no commits yet"
   ```

   开场三跳的第一跳就能看见，符合 C-72"状态脚本输出含关键计数"的既有精神。
2. `gate check` 增 `X-durability`（WARN 档，可被 worklog 认领）：未跟踪/已修改的 `keel/**` 记录文件超过 N 个，或距上次提交超过 M 分钟 → WARN。**只管 `keel/` 下的记录**，不碰源码——记录是框架的资产，源码是项目的事。
3. `k-new` 每一步末尾加一条 checkpoint 提交（`keel: requirements v1 draft (WIP)` 之类）。这与 C-24"确认过的工件不可变"不冲突：冻结的是**被 APR 哈希绑定的版本**，草稿期的中间提交只是防丢，反而让"从草稿到基线"的演化过程进了审计链。

---

### 2.6 【门禁/hook】经验候选是死胡同：3 条被打了标签，`lessons/` 是空的

**现象。** 这次会话打了 **3 条**经验候选标签：

`keel/journal/kopitau/2026-08-25-01.md`：
> "用户三次纠正的模式（值得记为经验候选）：① 访谈要有明确问句；② 每题要背景与后果；③ 审批不能过多——只有关键且不可逆的才点头。`#经验候选 user correction` 访谈格式与审批粒度。"

`keel/features/f00-platform-base/worklog.md`：
> "`#经验候选 defense failed` 已确认的技术基线里写了运行器，但**没在目标平台上实跑过 `gate verify`**；技术基线应在确认前先跑一次端到端证据链。"
> "`#经验候选 knowledge gap` keel 的 profile 配置有两处不对称（`isProfileUnset` 认字符串、`activeProfile` 只认数组），照模板写会静默走错分支——上游值得提一个 issue。"

而 `keel/lessons/` 只有一个 `INDEX.md`（114 字节，空表）。

**框架侧证据。** 对 `E:\program\en\tools\gate\` 全文 grep `经验候选` / `lesson`：只有三处命中，全是"知道 `lessons` 这个目录名"——`ids.ts:14`（编号前缀）、`indexgen.ts:94,122-123`（生成空索引）、`new.ts:72`（`gate new les` 能建文件）。**没有任何代码读取 `#经验候选` 标签，没有任何检查把 worklog/journal 里的标签和 `lessons/LES-*.md` 对账。** 同样地，`journal` 这个词在 `tools/gate/*.ts` 里**零匹配**——gate 完全不读 journal 目录。

**违反了哪条。** `DESIGN.md §1` 第三条设计总原则："记录必须被消费……写完没人看的记录不设。" `#经验候选` 恰恰是一种"写完没人看"的记录。C-57 的两级门槛（异常先 worklog 一行，满足条件升 ISS）在 ISS 这条线上跑通了（四份 ISS 质量极高），但在 LES 这条线上是断的。

`k-retro` 本该收口"关闭暂定决策与经验候选"，但它只在**合并后**跑；F0 至今没合并。这三条经验就悬在一个未合并的 worktree 分支上——第一条（agent 缺陷）恰恰是最该回流给框架的。

**建议的防线：门禁/hook。**

1. 新增 `X-lessons`（WARN 档）：扫 `keel/features/*/worklog.md` 与 `keel/journal/**/*.md` 里的 `#经验候选` 标签，与 `keel/lessons/LES-*.md` 对账；有标签无对应 LES → WARN，列出文件与行号。用现成的 `warnWorklogCovered` 豁免机制，允许 worklog 写 `gate-warn: X-lessons ref=DEC-nnn` 显式压制。
2. 标签格式收紧成机器可解析：`#经验候选[kind] 一句话`，`kind ∈ {user-correction, defense-failed, knowledge-gap, friction}`（这次实际用的三种就是这几类，直接固化）。
3. `gate status` 增 `lesson_candidates: N`——和 `provisional_decisions` / `open_issues` 并列，让它出现在开场三跳里，而不是等 `k-retro`。

---

### 2.7 【门禁/hook】RES 的内容完全不被校验 —— `G-research` 只查文件存不存在

**现象。** `gResearch`（`check.ts:123-152`）的全部逻辑是：遍历 `adr: true` 的 DEC，看它的 `research:` 列表里每个 RES-id 在 `keel/research/` 下**有没有一个文件名以它开头**（`resExists`，`check.ts:114-121`）。**它从不打开那个 RES 文件。**

于是 C-08/C-09/C-12 要求的一切——三档声明、六节结构（调研问题 → 检索范围 → 候选对比 → 逐项证据 → 结论 → 剩余不确定性）、引用 + 访问日期、`[未核实]` 标注、"必须人类易读通俗易懂"——**没有一条是可检的**。一个 0 字节的 `RES-001-x.md` 能让 `G-research` 全绿。

这次 agent 做得很好（RES-001 六节齐全、开头写着"档位：**深度**"、逐项证据带 commit hash `b150a551` 与访问日期），但那是自觉，不是约束。

**与已知第 3 条修复方案的关系。** 值得注意：**RES frontmatter 里 `oss:` 字段已经存在**了——

```yaml
id: RES-001
title: dsh external plugin seams and hard constraints
depth: deep
date: 2026-08-25
features: []
oss: []          # ← 字段在，值是空数组
```

RES-001 研究的正是 dsh（那个被锁定为依赖的开源项目），`oss: []` 照样通过。所以真正的修复不是"加 `oss:` 字段"，而是**让空值不等于合规**：`oss: []` 必须配一个 `oss_none: <理由>` 才放行。这与 §2.1 的"空即合规"是同一个根因。

**建议的防线：门禁/hook。** `gResearch` 增内容校验（或拆一条 `X-res`）：

- frontmatter 必须有 `depth ∈ {deep, standard, local}`（对应 C-08 三档）；
- 正文必须含 C-09 的六节标题；
- `oss: []` 时必须有非空 `oss_none:`（已知第 3 条的正确形态）；
- `depth: deep` 时必须至少 2 个候选（正文里数 `候选对比` 节的表格行）与至少 1 条带日期的引用。

前三条是纯字符串检查，零成本。

---

### 2.8 【门禁/hook】`gate new` 被当成号码分配器：8 次"生成即删除" —— 这是 C-25 的实际违反

**现象。** 会话里反复出现这个模式（`tools.txt` 全量统计，共 8 次）：

```bash
node tools/gate/gate.ts new res "dsh desktop shell and UI framework options" \
  && rm -f keel/research/RES-004-dsh-desktop-shell-and-ui-framework-optio.md && ls keel/research
```

```bash
for t in "typescript" "vitest" "types-node"; do node tools/gate/gate.ts new oss "$t"; done \
  && ls keel/oss && rm -f keel/oss/OSS-00*.md && echo "stubs removed"
```

DEC、ISS、CHG、OSS、RES 五类记录都是这个套路：**用 `gate new` 拿到编号和规范文件名 → 立刻 `rm -f` 掉它生成的模板骨架 → 用 Write 工具从零手写整个文件。** 全会话 300 次工具调用里，Write 72 次 + Edit 101 次，Bash 只有 114 次。

**为什么会这样。** agent 在调用 `gate new` 时，内容早就准备好了（调研子代理刚回来）。它要的只是"下一个编号是几、文件名该叫什么"。而 `gate new` 只提供"编号 + 空模板"这一个捆绑包，于是 agent 只能拆包：留编号、扔模板。

**违反了哪条。** C-25 是本报告里唯一一条**被实际违反**的规则，而且是被框架的工具设计逼的：

> "零 token 环节：状态查询 / 门禁裁决 / 证据核验 / 追溯矩阵 / 索引生成 / **编号分配** / **骨架创建** / 技能镜像 = 确定性脚本；模型只做需要智能的环节（C-25）。"

编号分配确实走了脚本，**骨架创建被模型接管了**——每份 RES/DEC/ISS 的章节结构都是模型凭记忆复述的。

**后果。** 模板的结构约束彻底失效。这次 agent 记性好（四份 ISS 的六节结构与 `keel/templates/ISS.md` 逐字对得上），但这个机制注定会退化：随着上下文变长、模型换代，某一节被漏掉时，没有任何检查会发现（见 §2.7——RES 内容零校验）。**§2.7 和 §2.8 是一对：模板不被强制执行，产物又不被校验，中间这段完全靠模型自觉。**

**建议的防线：门禁/hook。**

1. `gate new` 增 `--id-only`：只打印下一个编号和规范文件名（`RES-004-dsh-desktop-shell-and-ui-framework-optio.md`），不落盘。这样"拿号"和"建骨架"解耦，agent 不必再 `rm -f`。
2. `gate new` 增 `--stdin`：从标准输入读正文，脚本负责套 frontmatter + 编号 + 文件名。这才是 C-25 想要的形态——模型只产出需要智能的部分（正文），确定性部分全归脚本。
3. 配合 §2.7 的内容校验：模板不再是唯一的结构来源，门禁成为结构的权威。

---

### 2.9 【项目规则 + 门禁】C-59 阶梯没有"上游缺陷"这一支，导致四条 ISS 被迫违规收口；框架也没有回流通道

**现象。** C-59 有两条强制约束（`DESIGN.md:241`，其中第二条 DEC-059 标注为"用户加强"）：

> "**可能复发的不许只留档**；**选了哪级、为什么不用更高级必须记录**。"

四条 ISS 全部选了阶梯**最低档**"显式不修"，而且都**自己承认会复发**：

- ISS-001：「**可复发**但影响仅为一次命令重试，不留隐患。」
- ISS-002：「**可复发（每次 approve）**，但脚本一步即可补救并有核对输出。」
- ISS-003 / ISS-004：同上，理由都是「缺陷在上游 keel（`E:\program\en`），本仓库不改 gate」。

这在字面上违反了"可能复发的不许只留档"。但**agent 没得选**：阶梯上"显式不修"以上的五档（回归测试 / lint / 门禁 hook / 项目规则 / 决策修订）**全部作用在自己的仓库里**，而缺陷在别人的仓库里。消费项目改 gate 又被 `AGENTS.md` 明令禁止（"gate 权威在 CI 复跑，本地不改"）。

**回流通道也不存在。** 对 `DESIGN.md` / `AGENTS.md` / `k-log/SKILL.md` grep "上游 / upstream"：`DESIGN.md` 只有两处命中，都在 F14 开源复用复查（C-90/C-92，讲的是"上游库升级了怎么办"），**没有一处讲"我发现 keel 本身有 bug 该怎么办"**。

结果：四份质量极高的框架缺陷报告，躺在一个下游项目的、**未合并的 worktree 分支**上。要不是这次专门做回溯审查，它们永远不会到达 `E:\program\en`。

**建议的防线：项目规则（阶梯第四档，这里是可行的最高档——因为缺陷本身跨仓库，门禁管不到别人的仓库）+ 一条门禁配套。**

1. **C-59 增第七态**：`显式不修（上游）` —— 与 `显式不修` 平级但语义不同，要求三样东西：本地绕法、上游修复建议、**上游回流登记**。这样 ISS-001~004 的收口从"违规"变成"合规"，而且强制了回流动作。四份 ISS 其实已经自发写全了前两样，只差第三样。
2. **ISS frontmatter 增 `upstream:` 字段**（值如 `keel`），`gate check` 增一条 WARN：存在 `upstream:` 非空的 ISS → 提醒"有 N 条上游缺陷待回流"。`gate status` 一并显示 `upstream_issues: N`。
3. **`k-retro` 增一步**：合并前导出所有 `upstream:` 的 ISS 成一份可直接投递上游的清单。
4. **框架侧接收端**：`E:\program\en` 建 `docs/upstream-reports/`，或在 `k-log` 技能里写明"发现 keel 本体缺陷时，除本地 ISS 外还要写到哪里"。

**顺带**：ISS-003 附带的那条经验候选，本身就是一条该进框架的规则——

> "已确认的技术基线里写了运行器，但**没在目标平台上实跑过 `gate verify`**；技术基线应在确认前先跑一次端到端证据链。"

APR-002 冻结了 `ts-js` + `npx vitest run` 作为技术基线，而这个组合**在 Windows 上从未成功运行过一次**。建议 `X-apr` 增一条：APR 的 scope 含"技术基线"且 plan 里声明了测试 profile 时，必须存在一份该 profile 的绿色 `verify.json`（哪怕只跑一个 hello-world 测试）。这条能把 §2.2 的整类问题挡在审批之前，属**门禁档**，优先级高于本节其余建议。

---

### 2.10 【技能措辞 → 项目规则档】术语表在访谈**之后**才写；k-grill 全文不提 CONTEXT.md

**现象。** 用户在第一轮访谈答复里两次直接问"这是什么"（2026-08-25T08:30:36Z）：

> "C12 **什么是 Inbox？**" … "24 **什么是 ctrl k 面板**"

同一条消息里还有第三处理解偏差：

> "D13 不是只能有一个领域和一个细分 四个细分你这个有问题 学习资料 论文书咨询这个是**包含和被包含的关系**吧"

而 `CONTEXT.md`（术语表）的第一次 Edit 发生在 **2026-08-25T09:37:56Z** —— 比用户问"什么是 Inbox"晚了 **67 分钟**，比访谈全部结束还晚。术语表是收尾工件，不是访谈的前置条件。

**框架侧证据。** `E:\program\en\.agents\skills\k-grill\SKILL.md` 全文 grep `CONTEXT` / `glossary` / `term` / `background` / `jargon`：**零命中**。k-grill 只规定"每题附推荐答案"（F1 行），没有一个字要求"新术语当场定义"或"每题给背景与后果"。

C-125 确实要求 `CONTEXT.md` 术语表，但没规定**什么时候**写。C-09 要求"报告必须人类易读、通俗易懂"，管的是 RES，不管访谈问卷。

**这与已知第 4 条的关系。** 已知第 4 条要改 k-grill 措辞（问题写成主张、术语不解释）。本节补一个**新的、可操作的时序约束**：不只是"解释术语"，而是"**术语表必须先于访谈存在，并随访谈增量维护**"。用户 09:17:23Z 的第二次纠正（"这些问题 你没有解释 背景信息也不详细"）说明只在单题里临时解释是不够的——需要一个可回查的地方。

**建议的防线：项目规则（C-59 第四档）。**

1. k-grill 增一条 F 行：**"Any term you introduce that is not already in `CONTEXT.md` gets a one-line definition inline, and is appended to `CONTEXT.md` in the same round."**（英文，符合 C-124）。
2. 每题的结构从"问题 + 推荐"扩成"**背景 → 为什么要你定 → 各选项的后果 → 推荐**"——这不是我编的，是 agent 在被纠正后自己改出来的格式（09:19:32Z 那轮），而且**奏效了**（用户随后 09:27:19Z 逐条给出了实质答复）。把已经被验证有效的格式固化进技能，是零风险的改进。
3. 可选的门禁配套（弱）：`G-req` 增 WARN——需求文件正文里出现的 `**加粗术语**` 在 `CONTEXT.md` 中查不到时提醒。误报率可能偏高，建议先只做技能措辞。

---

### 2.11 【项目规则】`[NEEDS-CLARIFICATION]` 只管需求书，管不到 agent 在方案里塞进去的隐含假设

**现象。** 用户有两次纠正打的是同一个靶子——**agent 把未经确认的环境假设当成了事实**：

- 2026-08-25T08:30:36Z：「**这样联动有问题，主机怎么暴露一个完全的端口？这不安全把。**」
- 2026-08-25T08:41:30Z：「**1 关键我不一定在局域网，有时候可能相隔几百公里**」

第一次 agent 的方案让插件在主机开一个 HTTP 端口；第二次暴露了更底层的假设——方案默认"手机和电脑在同一个局域网"。agent 的回应很坦率（08:35:50Z）：

> "你的担心成立，dsh 自己没有任何认证，我上一版让插件在主机开一个端口，等于把库暴露在局域网里。"

这两个假设都没有出现在需求书里，它们活在 RES 和方案描述中，**从未被标注为假设**。

**违反了哪条。** C-05 的措辞是：

> "禁猜：**模糊处**强制 `[NEEDS-CLARIFICATION: 具体问题]`；未解分支必须写进需求书'未决问题'节，不许只留在对话里。"

而 `G-req`（`check.ts:91-112`）的实现只在**当前需求文件**里数 `[NEEDS-CLARIFICATION]`（`currentReq` + `liveClarifications`）。RES、DEC、plan 三类文件里可以自由写入任何未标注的假设，无人过问。

问题在于：C-05 防的是"**用户没说清**的地方 agent 别乱猜"，但这两次是"**用户根本没被问到**的地方 agent 自己填了默认值"。前者 agent 知道自己在猜，后者 agent 不知道——它以为那是常识。

**门禁为什么没发现。** `[NEEDS-CLARIFICATION]` 的检查范围被硬编码在需求文件上；而且 agent 若从未意识到自己在假设，也不会去打这个标记（自我报告类机制的固有上限）。

**建议的防线：项目规则（第四档）。** 门禁档在这里不可行——机器无法判断一句陈述是"事实"还是"未标注的假设"。可行的是把它做成**技能里的固定动作**：

1. `k-research` / `k-decide` 增一条：RES 的「剩余不确定性」节与 DEC 的「影响」节，必须显式列出**本方案依赖的用户环境前提**（网络拓扑、设备位置、操作系统、已装软件、账号与订阅…），每条标注"已确认 / 未确认"。RES-001 的六节结构里已经有「剩余不确定性」这一节，只是没被要求装这类内容。
2. 未确认的前提，同步进需求书「未决问题」节——这样 C-05 既有的通道（以及 `G-req` 既有的检查）就能覆盖到它们，不必新建机制。
3. 存疑标注：这条改进的收益无法从单次会话证实。证据只有两次用户纠正，且都被 agent 当场修好了；是否值得付出"每份 RES 多写一节"的成本，建议先在 k-research 里试行一轮再决定要不要写进 DESIGN.md。

---

### 2.12 【项目规则】handoff 的 Next steps 无人消费，且能自相矛盾

**现象。** `keel/handoff.md` §3 "Next steps" 第 3 条写着：

> "首批 OSS 记录：deepseek-harness 0.1.1-rc.2、桌面壳候选、`@huggingface/transformers`、PyMuPDF、MinerU、ts-fsrs。"

实际创建的 OSS 记录是 `OSS-001-typescript` / `OSS-002-vitest` / `OSS-003-types-node`——**清单上六个，一个都没做**（做的三个是 `X-oss` 从 `package.json` 直接逼出来的）。这正是已知第 3 条（dsh 无 OSS 登记）的另一面：**承诺被郑重写进了交接文件，然后无事发生。**

同一份 handoff 还自相矛盾：§2 先说「规划 + 技术基线经用户'确认规划'批准（APR-002），`profiles.active = ts-js`」，紧接着最后一行又说「`profiles.active` 仍 `unset`」。两句相隔四行。

**框架侧证据。** `gate status` 只打印 handoff 的**路径**（`status.ts:17,47`），从不读取内容。对 `tools/gate/*.ts` grep `handoff`：三处命中，全是路径拼接与 skill 名单，**没有一处解析内容**。handoff 是纯散文，没有任何结构约束、没有任何一致性检查。

**违反了哪条。** 又是 `DESIGN.md §1` 第三条设计总原则（"记录必须被消费"）。handoff 是**最该被消费**的记录——它是开场三跳的第二跳，是跨会话/跨 harness 的唯一桥梁——却是消费保障最弱的一份。

**建议的防线：项目规则（第四档），配一条可选的弱门禁。**

1. `k-handoff` 技能规定 "Next steps" 用 checkbox（`- [ ]`），并要求下一次会话开场时**逐条处置**（做掉 / 打勾，或改成 open question / 明确删掉并说明）。
2. 可选门禁（WARN）：`gate status` 增 `handoff_open_steps: N`，数 handoff 里未勾选的 checkbox。这是纯字符串计数，零成本，且和 `provisional_decisions` / `open_issues` 的既有形态一致。
3. 一致性这一项建议**显式不修**：`profiles.active` 那处矛盾属于"手写散文的自然熵增"，机器判定成本远高于收益。改用 checkbox 后，这类字段状态本来也该从 `gate status` 读，而不是抄进 handoff。

---

## 3. 做对了、值得反向固化进框架的

这次使用里有几处做得比框架要求的更好，或者是框架里已有但没被写进规范的好机制。

### 3.1 ISS 模板是本次最成功的框架组件 —— 建议把它的做法推广到 DEC

`keel/templates/ISS.md` 强制两个小节：**「为何未被更早发现」** 和 **「闭环选择与理由」**（后者把 C-59 六档直接内联在模板正文里）。四份 ISS 都认真填了，而且正是这两节的内容构成了本报告 §2.2 的全部证据——**四份独立写就的"为何未被更早发现"，指向了同一个根因**。没有这两节，这四条缺陷只会是四个孤立的 bug 报告。

建议：`keel/templates/DEC.md` 增一节「**为什么现在才做这个决定 / 什么信息让它成为可决的**」。理由同上——它把决策的**时序**变成可回溯的信息，而时序恰恰是这次暴露的头号问题（已知第 1 条的顺序倒置、§2.10 的术语表滞后、§2.9 的基线未实跑，全是时序问题）。

### 3.2 `warnWorklogCovered`：不被认领的 WARN 自动升 FAIL —— 值得写进 DESIGN.md 当通用模式

`check.ts:661-681`：任何 WARN 若在 `keel/features/*/worklog.md` 里找不到 `gate-warn: <id> ref=ISS-nnn|DEC-nnn` 这一行，就**改判为 FAIL**，摘要追加 `(warn not acknowledged)`；且 `NO_WAIVE` 集合（8 个 id）里的 WARN 无条件升 FAIL、连认领都不许。

这是整个门禁里最巧妙的设计——它解决了所有静态检查工具的通病（警告堆积成噪音，然后被集体无视）。但它现在只是 `check.ts` 里的一个实现细节，`DESIGN.md` 没写。本报告 §2.3 / §2.6 / §2.12 建议的三条新 WARN 全都指望复用它。建议把它提升为规范里的一条明文原则。

### 3.3 C-21 真的起作用了 —— 建议写进 DESIGN.md 当范例

2026-08-25T10:16:59Z，agent 发现 `gate verify` 在 Windows 上跑不了 vitest，第一反应是停下来：

> "这动到了 APR-002 确认的测试基线，**按 C-21 我要停下来问你**。先把证据补齐——验证 `node --test` 能否直接跑 `.ts`。"

然后它先补齐了证据（实测 `node --test` 27/27 通过、支持子路径导入、JUnit 可被 verify 解析），才把选择摆给用户。用户回 "A" 之后，走完了整条链路：**DEC-009（含用户原话）→ CHG-001（因为 `overview-v1.md` 已被 APR-002 冻结，C-24 不许原地改）→ `plan/overview-v2.md`（完整新版）→ APR-003 → `plan/INDEX.md` current 指向 v2**。

这是框架设计生效的最强证据，而且是四条规则（C-21 / C-24 / C-63 / C-107）咬合运转的完整实例。`DESIGN.md` 目前没有任何端到端的范例，建议把这条链路写成一个"变更是怎么走完的"附录。

### 3.4 用户的审批粒度原则 —— 建议回流进 C-110

2026-08-25T09:27:19Z 用户原话：

> "1 **为什么这么多需要我点头，不合理 应该只有关键且不可逆的需要我点头**"

这句话当时是在评判**产品**的关键动作分级表（后来落成 zhaoxi 的 DEC-005），不是在评判 keel。但它是一条好的通用原则，而 C-110 目前的两级确认（轻确认 = 对话同意当场记录继续干；重确认 = 冻结级工件落 APR）**没有给出"什么该进重确认"的判据**——判据交给了 agent 的直觉，而这次 agent 的直觉是把 14 种动作全列成要用户批。

建议把"**不可逆（含花钱）→ 重确认；可撤回 → 轻确认**"这条判据写进 C-110 的措辞。这是用户在真实使用里自己总结出来的，比框架现有的表述更可操作。

### 3.5 开场三跳：做到了，不算缺口

| 步骤 | 时间 | 动作 |
|---|---|---|
| 跳 1 | 07:35:13Z | `node tools/gate/gate.ts status` |
| 跳 2 | 07:35:27Z | `cat keel/handoff.md` + OVERVIEW + plan/INDEX + CONTEXT.md + config.json |
| 跳 3 | 07:35:38Z | 目录树 + `k-grill` / `k-init` 技能全文 |

会话开始 **25 秒内**完成三跳，且比要求的读得更多。C-72 要求的 `gate status` 三项输出（上次交接路径 / 未决问题数 / 暂定计数）在 `status.ts:47,53,55` 都有。**这一项没有缺口。**

唯一的小不一致（措辞档，低优先）：`AGENTS.md` 的第三跳是"当前 feature 的 plan + worklog"，`k-new` 的 "First" 写的是"读 `keel/OVERVIEW.md` 和 `keel/plan/INDEX.md`"。两处指向不同文件。这次 agent 两边都读了，没造成后果。

---

## 4. 逐条核对表

任务书要求对照的规则，逐条给结论。**"做到了"的不再展开。**

| 规则 | 做到了没有 | 说明 |
|---|---|---|
| C-02 按轮批量提问、每题附推荐 | ✅ | 三轮：32 题 / 13 题 / 3 项，每题带推荐 |
| C-03 能查的事实自己查 | ✅ | 8 份 RES 全部来自子代理调研或本机实测（含 `node:sqlite` FTS5/trigram 的现场探针），没有把可查的事实推给用户 |
| C-04 REQ 字段齐全 | ✅ | 61 条 REQ，字段完整；附录 A 存了用户原话逐字 |
| C-05 `[NEEDS-CLARIFICATION]` / 未决问题节 | ⚠️ | 需求书里做到了。但**方案里的隐含假设不受管辖** → §2.11 |
| C-06 缺口猎取 | ✅（已知第 2 条需修正） | **确实做了**：未见过对话的子代理产出 45 条，落盘为 `keel/requirements/v1-gaps.md`（6 044 字节）→ 见 §6 |
| C-08 调研三档并声明 | ✅ | RES-001 开头即"档位：**深度**"，八份都有 |
| C-09 RES 六节 + 引用 + `[未核实]` | ✅（但零校验） | 六节齐全、带 commit hash 与访问日期。**但门禁完全不检查** → §2.7 |
| C-12 离线不豁免 | ✅ | 不适用（全程有网），且 agent 主动重新克隆上游而非用本机 rc.5 旧快照 |
| C-10 决策指向调研或写豁免 | ✅ | 8 条 DEC 全部指向 RES |
| C-13 一决策一文件 | ✅ | DEC-001~009，每份含用户原话 |
| C-15 表态当场写入 | ✅ | 每轮答复后立刻回写，不积压（08:16Z / 08:35Z / 08:52Z / 09:29Z…） |
| C-17 低层决定记 worklog | ✅ | worklog「实现决定（非显然才记）」一节写得很实（测试目录选址、TS 可擦除语法约束等） |
| C-20 实施随做随记 | ✅ | 36 行 worklog，追加式，两个日期段 |
| C-21 触碰已确认边界要升级 | ✅ **典范** | → §3.3 |
| C-25 零 token 环节走脚本 | ❌ | **骨架创建被模型接管**，8 次"生成即删除" → §2.8 |
| C-27 / C-72 开场三跳 | ✅ | 25 秒内完成 → §3.5 |
| C-57 异常当场记、满足条件升 ISS | ✅（ISS 线）/ ❌（LES 线） | 四份 ISS 质量极高；三条 `#经验候选` 全部落空 → §2.6 |
| C-59 闭环阶梯 | ⚠️ 被迫违规 | 四条 ISS 都"可复发 + 只留档"，因为阶梯没有"上游缺陷"这一支 → §2.9 |
| C-107 审批用人类身份提交 | ⚠️ 字面合规、实质失效 | → §2.4 |
| k-new 序列 F1→F2→F3→F4 | ❌ | 已知第 1 条（先调研后需求），不重复 |
| k-new 本技能内不得写生产代码 | ✅ | k-new 在 09:59Z 收尾，代码从 10:05Z 用户说"开始 f0"之后才动，且在独立 worktree |

### 4.10 补充观察：worktree 让主干的记录不完整

会话最后 F0 的产出（ISS-003/004、CHG-001、DEC-009、APR-003、`overview-v2.md`、OSS-001~003、27 条测试）全在 `keel/F-0-platform-base` 分支上，`master` 看不到。C-112「一功能一分支一 worktree」的直接后果是：**只看主干会低估项目进度约一半**，而 `gate status` 在主干上跑不会告诉你"有一个 worktree 上有 4 条 ISS、1 条 CHG、3 条 OSS"。

这次 `git worktree list` 能看到，但 keel 自己不看。建议（弱，门禁档）：`gate status` 增 `worktrees: 1 (F-00-platform-base @ 1f0ada5)`，并统计各 worktree 上的 open ISS 数——`worktree.ts` 已经管理这些目录，信息是现成的。

---

## 5. 用户纠正逐条清单与模式

任务书要求逐条列出。时间戳为 UTC（会话 JSONL 原始时区）。

| # | 时间 | 用户原话 | 归类 |
|---|---|---|---|
| 1 | 08:08:43Z | 「**访谈问题 你只有建议没有问题啊**」 | 访谈形式 |
| 2 | 08:11:57Z | 「同时你有没有把我之前的功能需求记录？」 | 记录缺失 |
| 3a | 08:30:36Z | 「**这样联动有问题，主机怎么暴露一个完全的端口？这不安全把。**」 | 隐含假设 |
| 3b | 08:30:36Z | 「C12 **什么是 Inbox？**」「24 **什么是 ctrl k 面板**」 | 术语 |
| 3c | 08:30:36Z | 「23 **这部分需要你详细解释**」「25 这部分也需要你调研在确认」 | 背景不足 |
| 3d | 08:30:36Z | 「D13 …四个细分你这个有问题 …这个是**包含和被包含的关系**吧」 | 领域模型误解 |
| 4 | 08:41:30Z | 「1 **关键我不一定在局域网，有时候可能相隔几百公里**」 | 隐含假设 |
| 5 | 09:17:23Z | 「**这些问题 你没有解释 背景信息也不详细**」 | 背景不足 |
| 6a | 09:27:19Z | 「1 **为什么这么多需要我点头，不合理 应该只有关键且不可逆的需要我点头**」 | 审批粒度 |
| 6b | 09:27:19Z | 「3 没有关键信息不需要这么严格」「12 只用 rag 搜索么？」 | 过度设计 / 追问 |

**三个模式：**

- **模式 A（4 次，跨 69 分钟）：访谈的可读性** —— #1、#3b、#3c、#5。用户被迫用三条独立消息纠正同一件事。这是本次最强的模式，已知第 4 条覆盖了一半（问句 vs 主张、术语），§2.10 补上时序（术语表必须先于访谈）。
- **模式 B（2 次）：agent 的隐含环境假设** —— #3a、#4。两次都是 agent 把未经确认的用户环境（网络拓扑、设备位置）当成事实写进方案。这是**新发现** → §2.11。
- **模式 C（1 次，但影响面最大）：过度审批** —— #6a。产品层面落成 DEC-005；框架层面值得回流进 C-110 → §3.4。

`keel/journal/kopitau/2026-08-25-01.md` 里 agent 自己把模式 A 和 C 识别出来了并打了 `#经验候选 user correction` 标签——**然后这条标签就没有下文了**（§2.6）。

---

## 6. 对两条已知修复方案的修正意见

### 6.1 关于第 2 条（C-06 缺口猎取门禁）—— 新写的 k-grill 规则会误杀这次使用

`k-grill/SKILL.md` 已更新，「Baseline」节现在要求：

> `keel/requirements/gap-hunt-vN.md`, with `- **hunter**:` naming that context and a `## 发现` section listing each finding and its disposition (write `无` explicitly if there were none).
> `G-req` fails on `status: confirmed` rows with no such record.

**但 zhaoxi 确实做了这件事，而且做得很好** —— 只是三项形式全对不上：

| 新规则要求 | zhaoxi 实际 |
|---|---|
| 文件名 `gap-hunt-v1.md` | `keel/requirements/**v1-gaps.md**`（6 044 字节） |
| `- **hunter**:` 字段 | 无该字段；猎手写在正文散文里：「由一个**未见过访谈对话的子代理**只读审查 `v1.md`（当时 47 条 REQ）+ RES-001~004 后产出；按严重度排序」 |
| `## 发现` 节 | 无该标题；用的是一张 `\| # \| 级 \| 缺口 \| 处理 \|` 四列表（45 行）+ `## 基线前用户必须回答` |

内容质量本身无可挑剔：45 条按严重度排序、**每条都带处置**（"已新增 REQ-008" / "待用户 Q2-4" / "已改写验收…"），14 条高严重度，最终转化成 13 条新 REQ（60 → 61）。旁证：

- 会话 09:05:53Z：「缺口猎取（未见过本对话的子代理）回来了：**45 条**，其中 14 条高严重度……」
- APR-001 正文：「附带但不计入哈希的支撑记录：`keel/requirements/v1-gaps.md`（**C-06 缺口猎取 45 条及处置**）」

**照现在的写法上门禁，这个认真做了工作的项目会被判 FAIL，而且是三重 FAIL。** 真正的缺口从来不是"没做"，而是**框架从没规定这份文件叫什么、长什么样**——agent 只能自己起名、自己设计结构，然后被事后追认的规范判违规。

**建议按这个顺序落地：**

1. **先给结构一个可执行的来源**：`gate new` 增 `gaps` 类型（`gate new gaps v1` → 按模板生成 `keel/requirements/gap-hunt-v1.md`，含 `- **hunter**:` 与 `## 发现` 骨架）。配 `keel/templates/gap-hunt.md`。**没有模板就上门禁，等于要求模型凭记忆复现一个它没见过的格式** —— 这正是 §2.8 那个"生成即删除"循环的成因。
2. **再上门禁，且判据放宽**：接受 `gap-hunt-vN.md` **或** `vN-gaps.md`（两种命名都认），或需求文件 frontmatter 里有 `gap_hunt: <path>` 指针。三者任一满足即通过。
3. **结构判据只查"发现清单 + 每条处置"这个语义**，别硬绑标题文字——zhaoxi 用表格的"处理"列表达处置，比 `## 发现` 下的散文列表更清晰，不该被判违规。
4. 若坚持严格判据，至少让 `G-req` 的 fix 提示直接给出 `gate new gaps <version>` 这条命令，别只报 FAIL。

### 6.2 关于第 3 条（RES frontmatter 的 `oss:` 表态）—— 字段已经存在，问题是空值等于合规

RES frontmatter **已经有 `oss:` 字段**，RES-001 的值是 `oss: []`。而 RES-001 研究的正是 dsh——那个被 DEC-001 锁定为运行时依赖的开源项目。空数组照样全绿。

所以修复的重点不是"加 `oss:` 字段"（已有），而是"**让 `oss: []` 不再等于合规**"：`oss: []` 必须配一个非空的 `oss_none: <理由>` 才放行。这与 §2.1「空即合规」是同一个根因——建议两条一起改，否则单独修 `oss:` 只是堵了一个孔。

另外注意 `X-oss` 的检测源是 `package.json` 的直接依赖（`check.ts:410-419`）。dsh 是浅克隆的 git 仓库，不是 npm 包，**永远不会出现在 `package.json` 里**。所以即使 `X-oss` 完美工作，它也天生看不见这类依赖。RES frontmatter 的 `oss:` 表态正是唯一能覆盖到"非包管理器依赖"的通道——这也是为什么这条修复值得做，只是得让空值失效才有意义。

---

## 7. 优先级建议

如果只能做三件事：

1. **§2.4 的第 1 + 2 条**（`hook.ts` 捡回 agent/session 尾注；`X-apr` 对 `Agent: unknown` 判 FAIL）。改动最小（一个文件、几十行），修的是框架四大支柱之一，且立刻对所有既有项目生效。
2. **§2.2 的 profile 矩阵 fixture**。`.github/workflows/gate.yml` 已有 OS × Node 矩阵，加第三维成本很低，一次性堵住 ISS-003/004 这**一整类**问题——而这类问题会在每个换 profile 的新项目上重演。
3. **§2.1 的 fixture 回归测试**（空项目 / 半成品项目的期望判定）。它是已知第 1、2、3 条和本报告一半发现的共同根因；不动它，后面每发现一个"空即合规"的实例就得单独打一个补丁。

其次是 §2.5（`gate status` 加两行）和 §2.6（`X-lessons`）——两者都是十几行代码，且都直接服务于"记录必须被消费"这条设计总原则。

---

*报告完 · 2026-08-26 · 依据会话 `b14ac2e3` 与 `E:\program\zhaoxi` 磁盘状态（`master` @ `6582d97` + worktree `keel/F-0-platform-base` @ `1f0ada5`）*
