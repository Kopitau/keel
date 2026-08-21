<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# R1 — Matt Pocock "grilling" 谱系研究：从 `/grill-me` 到 mattpocock/skills 的完整工作流思想

- 研究流：R1（跨 harness 项目开发框架设计 · 需求访谈/决策记录方向）
- 研究日期：2026-08-17（所有 URL 的 accessed 日期均为 2026-08-17，除非另注）
- 独立性声明：未打开 `E:\program\trel`、`E:\program\kk`。
- 证据等级标注：**[一手]** = 作者本人的仓库/文章/视频/评论；**[二手]** = 第三方转述；**[未核实]** = 未能取得原文，仅作线索。

---

## 0. 摘要（先读这一节）

1. **`/grill-me` 的本体极短**（本地安装版全文 4 句），核心机制只有四条：relentless interview until shared understanding；walk the **design tree**、resolve dependencies between decisions one-by-one；**每题附推荐答案**；能查代码库就别问人。本地安装版（2026-06-05 安装）与仓库 2026-04-28 版逐字相同，含 "Ask the questions one at a time."。
2. **截至 2026-08-17，仓库里的 grilling 机制已大幅演进**：`grill-me`/`grill-with-docs` 都退化为一行委托，真正的访谈原语是 model-invoked 的 **`grilling`** skill。它已从"一次一问"改为 **"按轮（round）提问整个前沿（frontier）"**（2026-07-16，#593），并新增：**facts vs decisions** 分工（事实由 agent 查、决策由人定，2026-07-06）、**confirmation gate**（未经用户确认不得动手，2026-07-03）、固定题式 `❓ **Q1** - **<title>** … ➡️ <recommendation>`（2026-07-29）。一次一问仍受支持，退出方式是在全局 `CLAUDE.md` 加一句 `When grilling, ask one question at a time.`；该改动在社区有明显争议（issue #663/#831）。
3. **grill 本身不产生结构化的需求/决策记录**。`grill-with-docs` 只写两类文件：`CONTEXT.md`（纯词汇表，禁止实现细节）和三门槛 ADR（hard to reverse / surprising without context / real trade-off）。官方文档明言："Everything else you decided → The conversation, and nowhere else"，并承认这是 "the most substantive open complaint"：**没有把每个已决答案串到 spec、ticket、test 的 ledger**。作者本人在 issue #341 中对"给每个已决答案打稳定 ID 并贯穿全流程"的提议回复 "This is a really good idea… Love it."（2026-06-17），但截至今日**未落地**。未解分支只存在于对话内的 frontier；跨会话的例外是 `wayfinder`（decision tickets + 地图上的 `Not yet specified` / `Out of scope`）。
4. **主流程**（作者称 "the main flow"）：`grill-with-docs → to-spec → to-tickets → implement(→ tdd → code-review)`，规模过大时前置 `wayfinder`，谈不清楚时旁路 `prototype`（经 `handoff` 进出）。spec 是"多会话工作的目的地文档"，ticket 是 **tracer-bullet 垂直切片**、**大小以一个 smart zone（≈150k tokens）为界**、**声明 blocking edges**、发布到 issue tracker、按 **frontier** 领取；`implement` 一票一会话、清空上下文。
5. **对重流程框架的批评是明确的**（README）："Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve. These skills are designed to be small, easy to adapt, and composable. They work with any model." 相关立场：拒绝给提问数设上限（`.out-of-scope/question-limits.md`）、spec 非持久（用完关掉）、prototype 是防止 waterfall 的手段、批评 Anthropic Ralph 插件把循环塞进单一会话、`Never run claude /init`、CLAUDE.md 几乎为空（"you are on WSL on Windows"）。
6. **对多人/多 agent/多 harness 的适配点**：作者的默认设定是单人（"the assignee *is* the claim"、`.scratch/` 本地文件、`implement` 直接提交当前分支、并行 `implement` 共享 checkout 会互相破坏）。今天（2026-08-17）他刚从文档删掉一段 "It assumes one writer"（原文含一份两人团队 4 个月、约 20% 已合并 PR 出现文档漂移的现场报告，见 §7）。跨 harness 方面，仓库自 v1.2 起给每个 skill 配 `agents/openai.yaml` sidecar（Codex），`AGENTS.md → CLAUDE.md` 符号链接，并统一用 `Call the Skill tool with "name"` 的 harness 中性措辞。
7. **对我方框架最直接可用的**：grilling 原语（rounds/frontier/facts-vs-decisions/confirmation gate/推荐答案）；CONTEXT.md 词汇表 + 三门槛 ADR；spec 模板（含 Testing Decisions / Out of Scope）；tracer-bullet ticket + blocking edges + frontier；pre-agreed seams → tdd → 两轴 code-review（Standards/Spec）；wayfinder 的 map=index、decision ticket=primary source、HITL/AFK 分类、fog-of-war；phase-boundary 决策树（continue/clear/handoff/subagent/compact）；writing-for-agents 的"两种负载""context pointer""leading word""no-op 测试"；`.out-of-scope/` 拒绝知识库；triage 状态机；`diagnosing-bugs` 的 "tight loop that goes red" 完成准则。**必须补齐的**：带稳定 ID 的决策/需求账本（含 provisional/deferred/superseded 状态与理由）、每 ticket 的实施计划人工审批（`implement` 目前无审批、无关票）、并行 agent 的文件所有权/worktree 隔离、跨会话 handoff 的持久化与保留策略、六个 harness 的 skill 加载兼容性核实。

---

## 1. 研究范围、方法与局限

**已完整阅读的一手材料**
- 本地安装：`C:\Users\NF3317\.claude\skills\grill-me\SKILL.md`（635 B，文件日期 2026-06-05）、`...\grill-with-docs\SKILL.md`（3,639 B）、`ADR-FORMAT.md`（2,766 B）、`CONTEXT-FORMAT.md`（2,299 B）。
- GitHub `mattpocock/skills` 主干（tarball 下载，commit `9c9f36cc`，pushed 2026-08-17T07:54Z）：README、CLAUDE.md、CONTEXT.md、`.agents/*`（invocation.md、install-block.md、writing-docs.md、adr/0001、adr/0002）、`.out-of-scope/*`、全部 promoted skills 的 SKILL.md 与随附文件、in-progress/misc/deprecated 的 README 与若干 SKILL.md、`docs/**` 人类向文档页、CHANGELOG.md、tags/releases、关键文件的 commit 历史、历史版本原文（2026-02-03 初始提交、2026-03-19、2026-03-26、2026-04-28）。
- aihero.dev：19 篇文章/页面全文（列表见 §10）；AI Coding Dictionary 12 个词条全文。
- YouTube：@mattpocockuk 最近 30 条视频的标题/日期/描述；4 条视频的自动字幕全文（`/wayfinder`、`/prototype`、`grill-with-docs`、`/handoff`）。
- GitHub issues：#23、#44、#130、#186、#338、#341、#663、#831、#856、#862 的正文与评论（重点提取 mattpocock 本人发言）；PR #891 与 commit `05055363` 的 patch。
- 其他仓库：`course-video-manager`（CONTEXT.md、27 个 ADR 文件名及 2 篇全文、CLAUDE.md、docs/agents/domain.md）、`sandcastle` README。

**未能取得 / 局限**
- 本会话的 WebSearch 配额在本流开始不久即耗尽（会话级 200 次上限被其他并行研究流用完），后续全部改用 curl/WebFetch/yt-dlp/GitHub API/HN Algolia。
- **X/Twitter**：仅通过 syndication 端点取到 1 条已知 ID 的推文（2026-08-14 "My 25 skills… explained in 10 minutes"）；时间线与搜索端点被限流/反爬（syndication timeline "Rate limit exceeded"、xcancel/nitter 均为 antibot 页面）。因此**未能系统检索他在 X 上关于 Superpowers/spec-kit/BMAD/GSD 的原帖**，本报告中关于这些框架的批评仅以 README、视频字幕、issue 评论为据。
- GitHub REST API 未认证配额（60/h）在 issue 阶段耗尽，改抓 issue HTML 内嵌 JSON；能取到评论全文，但未逐条核对每个 issue 的 reactions 等元数据。
- Bing/DuckDuckGo 的 curl 检索分别返回地区化无关结果与人机验证，未采用。
- 未拿到 mattpocock 在 Bluesky/播客（Syntax、Latent Space 等）上的相关发言 **[未核实]**。

---

## 2. 本地安装版 skill 逐字引用（作为"基线"）

### 2.1 `grill-me/SKILL.md`（本地，635 B，2026-06-05）

```
---
name: grill-me
description: Interview the user relentlessly about a plan or design until reaching shared understanding, resolving each branch of the decision tree. Use when user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time.

If a question can be answered by exploring the codebase, explore the codebase instead.
```

核对：与仓库 commit `62f43a18`（2026-04-28）及 `a6bdfd9f`（2026-03-26）的 `grill-me/SKILL.md` **逐字一致**。它包含四条规则：relentless until shared understanding；design tree 逐枝、决策依赖逐个解决；每题给推荐答案（2026-03-19 加入，commit `fb3629d3` "Added recommendation to grill-me skill"）；一次一问（2026-03-26 加入，commit `a6bdfd9f` "Add instruction to ask questions one at a time"）；能查代码就查代码。

### 2.2 `grill-with-docs/SKILL.md`（本地，3,639 B）

主体（`<what-to-do>`）与 grill-me 相同，但一次一问的措辞更强：

> "Ask the questions one at a time, waiting for feedback on each question before continuing."

`<supporting-info>` 部分逐条规则（原文）：
- 文件结构：单 context 为 `/CONTEXT.md` + `/docs/adr/0001-….md`；若根有 `CONTEXT-MAP.md` 则多 context，各 `src/<ctx>/CONTEXT.md` + `src/<ctx>/docs/adr/`。**"Create files lazily — only when you have something to write."**
- **Challenge against the glossary**："When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. 'Your glossary defines "cancellation" as X, but you seem to mean Y — which is it?'"
- **Sharpen fuzzy language**："propose a precise canonical term."
- **Discuss concrete scenarios**："Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts."
- **Cross-reference with code**："If you find a contradiction, surface it."
- **Update CONTEXT.md inline**："When a term is resolved, update `CONTEXT.md` right there. Don't batch these up — capture them as they happen." **"`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else."**
- **Offer ADRs sparingly**：三条件全满足才提议：**1. Hard to reverse；2. Surprising without context；3. The result of a real trade-off**。"If any of the three is missing, skip the ADR."

### 2.3 `ADR-FORMAT.md`（本地；与仓库 `skills/engineering/domain-modeling/ADR-FORMAT.md` 逐字一致）

- 位置与编号：`docs/adr/`，`0001-slug.md` 顺序编号；"Scan `docs/adr/` for the highest existing number and increment by one."
- 模板极简：`# {Short title of the decision}` + "{1-3 sentences: what's the context, what did we decide, and why.}" — **"That's it. An ADR can be a single paragraph. The value is in recording *that* a decision was made and *why* — not in filling out sections."**
- 可选节：`Status` frontmatter（`proposed | accepted | deprecated | superseded by ADR-NNNN`）、Considered Options、Consequences，"Only include these when they add genuine value."
- 何者够格（What qualifies）：Architectural shape；Integration patterns between contexts；Technology choices that carry lock-in（"just the ones that would take a quarter to swap out"）；Boundary and scope decisions（"The explicit no-s are as valuable as the yes-s."）；Deliberate deviations from the obvious path（"These stop the next engineer from 'fixing' something that was deliberate."）；Constraints not visible in the code；Rejected alternatives when the rejection is non-obvious（"otherwise someone will suggest GraphQL again in six months"）。

### 2.4 `CONTEXT-FORMAT.md`（本地；与仓库版逐字一致）

- 结构：`# {Context Name}` + 一两句描述 + `## Language`，每个术语 `**Term**:` + 一两句定义 + `_Avoid_: 同义词列表`。
- 规则：**Be opinionated**（多词同义时选一个，其余列入 `_Avoid_`）；**Keep definitions tight**（"Define what it IS, not what it does."）；**Only include terms specific to this project's context**（通用编程概念不收）；**Group terms under subheadings** 当自然聚类出现时。
- 多 context：`CONTEXT-MAP.md` 列出各 context 位置与关系（示例用领域事件 `OrderPlaced`/`ShipmentDispatched` 表达关系）。"When multiple contexts exist, infer which one the current topic relates to. If unclear, ask."

---

## 3. `mattpocock/skills` 仓库全景（截至 2026-08-17）

### 3.1 元数据 [一手]
- 描述："Skills for Real Engineers. Straight from my .agents directory."；MIT；homepage `https://aihero.dev/skills`；created 2026-02-03；stars 219,718；forks 18,918；open issues 358；最新 push 2026-08-17T07:54Z。
- Releases：`v1.0.0` 2026-06-17、`v1.0.1` 2026-06-17、`v1.1.0` 2026-07-08、`v1.2.0` 2026-08-05、`v1.2.2` 2026-08-05、`v1.2.3` 2026-08-06。
- 分发：Claude Code 官方 marketplace 插件 `claude plugins install mattpocock-skills`（2026-08-05 起）；其他 harness 用 `npx skills@latest add mattpocock/skills`（skills.sh 安装器）。README 强调两者二选一（"installing both leaves you with every skill twice"）。

### 3.2 结构与分层
- 目录桶：`engineering/`（日常代码工作）、`productivity/`（非代码流程）、`misc/`、`in-progress/`（beta，不入插件）、`deprecated/`（空）。
- **User-invoked vs Model-invoked**（`.agents/invocation.md`）："User-invoked — reachable **only by the human typing its name**. Set `disable-model-invocation: true` in the frontmatter (Claude Code) and `policy.allow_implicit_invocation: false` in `agents/openai.yaml` (Codex)… Model-invoked — reachable by **model or user**… The test… _could the model usefully reach for this autonomously?_" 以及不变式："A user-invoked skill may invoke model-invoked skills, but it can never reach another user-invoked skill."
- 跨 skill 调用措辞（2026-08-15 统一）："Dependencies are expressed as an explicit instruction to **call the Skill tool** with the named skill (`Call the Skill tool with "grilling"`), not deep `../other-skill/FILE.md` cross-references, and not a bare `/skill`-style mention… The Skill tool takes one skill per call. A step that needs two skills is two calls".
- 元文档：`CLAUDE.md`（仓库维护规则）、`CONTEXT.md`（仓库自己的词汇表：Issue tracker / Issue / Decision ticket / Triage role）、`.agents/writing-docs.md`（人类向文档页四节模板：What it does / When to reach for it / Common questions / It's working if）、`.agents/adr/0001`（hard vs soft dependency on setup）、`.agents/adr/0002`（为何先发 Claude Code 插件、缓发 Codex 插件：Codex 的 `plugin.json` `skills` 只接受单一路径字符串且安装时丢弃符号链接）。
- 上下文成本：v1.0 公告称 `disable-model-invocation` 带来 "63% reduction in token cost for skill descriptions"；作者视频演示中全部 skill 描述仅占 "660 tokens"（2026-07-16 视频 04:05）。

### 3.3 skill 清单（promoted，24 个）
User-invoked：`ask-matt`、`grill-with-docs`、`triage`、`improve-codebase-architecture`、`setup-matt-pocock-skills`、`to-spec`、`to-tickets`、`implement`、`wayfinder`、`grill-me`、`handoff`、`teach`、`to-questionnaire`、`wait-what`。
Model-invoked：`prototype`、`diagnosing-bugs`、`research`、`tdd`、`domain-modeling`、`codebase-design`、`code-review`、`resolving-merge-conflicts`、`wizard`、`grilling`、`writing-for-agents`。
In-progress（beta）：`loop-me`、`claude-handoff`、`setup-ts-deep-modules`、`writing-beats/fragments/shape`。Misc：`git-guardrails-claude-code`、`setup-pre-commit` 等。

---

## 4. 各 skill 关键规则原文（按主流程顺序）

### 4.1 `grilling`（访谈原语，model-invoked）— 当前全文要点

```
Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>
➡️ <your recommended answer>

Each round the user answers reshapes the tree… A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it… The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.
```

人类向文档 `docs/productivity/grilling.md` 的补充说明（原文）：
- "It does not ask one question at a time, and it does not ask everything at once… Thirteen questions typically land in about three rounds rather than thirteen."
- 已知粗糙边："the recommendation sometimes argues *against* the question as it was worded… When that happens, answer the recommendation and say so." / "the frontier is the agent's judgement, not a computed graph."
- 一次一问退出："Add this to your global `CLAUDE.md`: `When grilling, ask one question at a time.` The round-based default is genuinely contested… the opt-out is supported rather than tolerated."
- 失败模式与修法："It ran out of questions and started building" → confirmation gate 存在正为此，弱模型仍会破，"the reliable fix is a line in your own `AGENTS.md` or `CLAUDE.md` telling the agent not to implement without permission." / "It answered its own questions instead of asking me" → 这正是 facts/decisions 分开的原因；"there is no async mode… a grilling session that nobody answers has produced the agent's opinion rather than yours."
- 不设上限："Can I cap the number of questions? No, and a cap is deliberately out of scope."
- 依赖加载失败："a skill that names another skill does not reliably cause that skill to load, and `grill-with-docs` names two. The tell is a session that asks everything at once with no recommendations attached".

### 4.2 `grill-me` / `grill-with-docs`（用户入口，一行委托）
- `grill-me`（157 B）：`Call the Skill tool with "grilling".`（`disable-model-invocation: true`；描述："A relentless interview to sharpen a plan or design."）
- `grill-with-docs`（247 B）：`Call the Skill tool twice, for "grilling" and "domain-modeling".`
- 分工（`ask-matt`）："`/grill-me`… **stateless**: it saves nothing locally and builds no `CONTEXT.md`. Reach for it when you are **not working in a working directory**… If you are in a working directory, use `/grill-with-docs` instead… strictly the better one."
- `docs/productivity/grill-me.md`："Leave plan mode off. Plan mode primes the agent to rush toward producing a plan, which is the opposite of staying in inquiry." / "It's a conversation, not an interview… The failure mode is **passivity**" / "**Grillable and ungrillable**… 'how should this interaction feel?' are ungrillable — they need something to react to. When you hit one, stop grilling. Build the throwaway version with prototype" / "Does the model matter? More than for most skills… give it your best one. Implementation mostly follows context and tolerates a cheaper model."

### 4.3 `domain-modeling`（CONTEXT.md + ADR 的主动纪律，model-invoked）
- 触发描述（2026-08-13 更新）："Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording or editing an ADR."
- 正文与本地 grill-with-docs 的 `<supporting-info>` 逐字一致（§2.2）；`.agents/invocation.md` 区分被动/主动："Merely _reading_ `CONTEXT.md` for vocabulary is a one-line prose pointer, not the `domain-modeling` skill."
- 文档页 `docs/engineering/grill-with-docs.md` 的 "The paper trail" 表：术语 → `CONTEXT.md` inline；三门槛决策 → ADR；**"Everything else you decided → The conversation, and nowhere else."** 并注："most decisions do not qualify and most sessions produce none. A session that yields a sharper glossary and zero ADRs is working as designed".
- 已知问题（同页）：在其他编排层内运行时"the file-writing half is reported to silently not happen"；Codex 曾把 CONTEXT.md 当计划文档写（issue #130，作者建议 `/grill-with-docs make my CONTEXT.md more concise and remove any implementation details from it`，并说 "reasonable to harden these guidelines within the skill itself"）。

### 4.4 `to-spec`（对话 → spec，不再访谈）
- "Do NOT interview the user — just synthesize what you already know."
- 步骤 2 **seams**："Sketch out the seams at which you're going to test the feature. Existing seams should be preferred to new ones. Use the highest seam possible… the ideal number is one. Check with the user that these seams match their expectations."
- 模板节：Problem Statement / Solution / **User Stories**（"A LONG, numbered list… As an <actor>, I want a <feature>, so that <benefit>"）/ **Implementation Decisions**（"Do NOT include specific file paths or code snippets. They may end up being outdated very quickly." 例外：prototype 产出的状态机/schema 片段）/ **Testing Decisions**（"only test external behavior, not implementation details"、哪些模块测、prior art）/ **Out of Scope** / Further Notes。发布到 tracker，打 `ready-for-agent`。
- 文档页立场："The spec is a decision record… Anything the spec asserts that you never actually said is a defect." / "Do I keep the spec frozen…? Nothing keeps it in sync… Treat it as throwaway once the work ships. The artifacts meant to outlive it are your `CONTEXT.md` and your ADRs" / 对重构类工作模板"leans hard on user stories, which is the wrong shape for architectural work" / 不会检索 tracker 去重、不会引用它遵守的 ADR。

### 4.5 `to-tickets`（spec → tracer-bullet tickets + blocking edges）
- vertical-slice 规则："Each slice cuts a narrow but COMPLETE path through every layer (schema, API, UI, tests)… A completed slice is demoable or verifiable on its own… **Each slice is sized to fit in a single fresh context window**… Any prefactoring should be done first"（"Make the change easy, then make the easy change."）
- 例外 **wide refactor → expand–contract**（expand / migrate in batches by blast radius / contract；必要时共享 integration branch，只在最终 integrate-and-verify ticket 承诺绿）。
- **人工审批点**（步骤 4 Quiz the user）：逐票展示 Title / Blocked by / What it delivers，问 "Does the granularity feel right?… Are the blocking edges correct?… Should any tickets be merged or split further? Iterate until the user approves the breakdown."
- 发布：本地 → `.scratch/<feature-slug>/issues/<NN>-<slug>.md` 一票一文件（v1.2 之前是单个 `tickets.md`，"a single shared file also raced when parallel agents wrote to it"）；真实 tracker → 一票一 issue、优先原生 blocking/sub-issue，"Work the **frontier**: any ticket whose blockers are all done."
- 文档页："It produced twelve tickets for a three-line change" 是最常见摩擦；"The acceptance criteria graded nothing — some passed before any work was done… For each criterion, name the observation that would show it false, and confirm it fails at the commit the implementer starts from."；"The skill stops at the artifact, and there is no auto-dispatch mode."；"`implement` does not reliably close or check off the ticket".

### 4.6 `implement`（433 B，全文）
```
Implement the work described by the user in the spec or tickets.
Use /tdd where possible, at pre-agreed seams.
Run typechecking regularly, single test files regularly, and the full test suite once at the end.
Once done, use /code-review to review the work.
Commit your work to the current branch.
```
文档页："It never reopens the plan. There is no interview, no clarifying round" / "One invocation, one ticket… Running several `/implement` sessions side by side in one checkout is worse than unsupported: one field report describes a `git commit --amend` in one session landing on another session's commit… Git worktrees are the community workaround, and note that `refs/stash` is shared across worktrees too" / "It commits straight to the current branch… no PR mode" / "One ticket burned 150k tokens… right-size the tickets".

### 4.7 `tdd`（reference-only）
- "**Test only at pre-agreed seams.** Before writing any test, write down the seams under test and confirm them with the user. No test is written at an unconfirmed seam."
- 反模式：Implementation-coupled / **Tautological**（"Expected values must come from an independent source of truth"）/ Horizontal slicing（"one test → one implementation → repeat, each test a **tracer bullet**"）。
- 循环规则："Red before green… One slice at a time… **Refactoring is not part of the loop.** It belongs to the review stage" — 文档页称 refactor 阶段 "was dropped in June 2026 because agents essentially never performed it"。
- `mocking.md`：只在系统边界 mock；依赖注入；SDK 式接口而非通用 fetcher。
- 文档页承认的缺口：无法判断"某改动是否值得跑 TDD"（issue #746）；选 seam 时缺权衡说明（#607）；"It wrote the implementation before the test… No instruction makes an agent comply 100% of the time".

### 4.8 `code-review`（两轴、并行子代理）
- Standards 轴（repo 文档化标准 + Fowler 12 种 smell 基线，"documented repo standard overrides the baseline… every smell is reported as a judgement call"）与 Spec 轴（"requirements… missing or partial; behaviour… wasn't asked for (scope creep); … implemented but… wrong. Quote the spec line for each finding."）。
- "Do **not** merge or rerank findings — the two axes are deliberately separate."；先校验 fixed point 与非空 diff 再 spawn。

### 4.9 `wayfinder`（多会话规划：decision tickets 地图）
- 定位："A loose idea has arrived — too big for one agent session, and wrapped in fog… charts the way as a **shared map** on the repo's issue tracker, then works its **decision tickets** — questions whose resolution is a decision, not slices of a build to execute — one at a time until the route is clear."
- **Plan, don't do**："produce decisions, not deliverables"（可在 map Notes 覆盖）。
- **The map is an index, not a store**："a decision lives in exactly one place — its ticket — so the map never restates it, only gists it and links."
- Map body：`## Destination` / `## Notes` / `## Decisions so far` / **`## Not yet specified`**（fog of war）/ **`## Out of scope`**。
- Ticket：child issue；body 只有 `## Question`；label `wayfinder:<type>`（research / prototype / grilling / task）；**"A session **claims** a ticket by assigning it to the dev driving the map, **first**, before any work… That assignee _is_ the claim"**；blocking 用 tracker 原生依赖（"renders the frontier _visually_"）。
- **HITL vs AFK**："A HITL ticket only resolves through that live exchange; the agent never stands in for the human's side of it (a grilling agent that answers its own questions has broken this)."
- **Fog or ticket?** "The test is whether you can state the question precisely now — _not_ whether you can answer it now."
- 流程：Chart（先 grill 定 Destination → breadth-first grill 出 frontier；无 fog 则不建图 → 建 map → 建票再二次布线 blocking → 为 research 票并行起子代理 → 停）；Work through（加载低分辨率 map → 领票 → 解决 → **"post the answer as a resolution comment, close the issue, and append a context pointer to the map's Decisions-so-far"** → 新增/毕业 fog/剔除 out-of-scope）。"never resolve more than one ticket per session — with the exception of research tickets." "The user may run unblocked tickets in parallel, so expect other sessions to be editing the tracker concurrently."
- 文档页 FAQ 的现场问题：agent 在图内写生产代码（"Notes are written by the agent, so the constraint and its exemption live in the same file the constrained party owns"）；"I charted 27 tickets, and by the time I got to the thirteenth, the rest no longer made sense"（作者答：把 map 限定到一个 epic，"Wayfinder is 'prototypemaxxing', not 'planmaxxing'"）；并行 grilling 票会被问重复问题；"The grilling is exhausting. Every question is three paragraphs long"；改判已关闭决策"There is no official guidance"。

### 4.10 `handoff` / `claude-handoff`
- 全文要点：写 handoff 文档到 **OS 临时目录**（"not the current workspace"）；含 "suggested skills" 节；**"Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead."**；脱敏；参数即下一会话用途。
- 文档页："What it buys is **portability**, not compression… You need a file only when the work has to *travel* — to a new harness, a new directory, a colleague, or a side task" / "It captures the what, not the why. A fair and repeated criticism" / "My handoff vanished between sessions… copy the file somewhere durable yourself".
- `claude-handoff`（beta）：直接 `claude --bg --name "<name>" "<handoff summary>"` 起后台代理。

### 4.11 `ask-matt` + `PHASE-BOUNDARIES.md`（路由与上下文卫生）
- 主流程原文："Keep steps 1–3 in **one unbroken context window** — don't compact or clear until after `/to-tickets` — so the grilling, spec, and tickets all build on the same thinking. Each `/implement` then starts fresh, working from the ticket." / "**smart zone**: the window (~150k tokens on state-of-the-art models) within which the model still reasons sharply."
- 五选一决策树（按序，首个 yes 胜出）：**Continue**（下一阶段需要本阶段作为 primary source，或 smart zone 还够）→ **/clear**（上下文对下一步无关）→ **/handoff**（仅当要换 harness/目录/同事/分叉旁支）→ **Subagent**（可 AFK 的紧凑任务）→ **/compact**（"the **default**, at the bottom of the tree rather than the first reach"）。"Every move except **Continue** turns a **primary source** into a **secondary source**."

### 4.12 `writing-for-agents`（写给 agent 的文档的方法论）
- **Context pointer**："a reference held in the agent's context that names some out-of-context material and encodes the condition for reaching it… The pointer's _wording_, not its target, decides when the agent reaches the material".
- **The two loads**：Context load（常驻窗口的成本）vs Cognitive load（人要记住有哪些文档；"Not a cost to minimise — it is the price of human agency"）。
- **Information hierarchy**：in-file step → in-file reference → disclosed reference（progressive disclosure：inline what every branch needs, push behind a pointer what only some branches reach）；Co-location；Sprawl。
- **Completion criteria**：Clarity（防 premature completion）+ Demand（"'Every modified model accounted for' forces thorough work where 'produce a change list' does not"）。
- **Leading words**："a compact concept already living in the model's pretraining… (_lesson_, _fog of war_, _tracer bullets_)"；"fast, deterministic, low-overhead" → _tight_；**Negation** 失败模式（"_Don't think of an elephant_… Prompt the **positive**"）。
- **Pruning**：single source of truth；environment as source of truth（"a document that restates it is a **cache**… Cache what the agent cannot find by looking: the unwritten convention, the reason behind a choice, the gotcha no config confesses"）；relevance / **sediment**；**no-ops**（"does it change behaviour versus the default?… When a sentence fails, delete the whole sentence"）。
- `SKILL-MECHANICS.md`：invocation 选择、router skills。

### 4.13 `setup-matt-pocock-skills`（每仓库配置）
- 三节：Issue tracker（GitHub / GitLab / Local markdown `.scratch/` / Other 自述）；Triage labels（五个规范角色 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`）；Domain docs（single/multi-context）。写入 `CLAUDE.md`/`AGENTS.md` 的 `## Agent skills` 块 + `docs/agents/issue-tracker.md|triage-labels.md|domain.md`。"Never create `AGENTS.md` when `CLAUDE.md` already exists (or vice versa)".
- 本地 tracker 模板含 "Wayfinding operations"（map.md、`Type:`/`Status:`/`Blocked by:` 行、claim/resolve 步骤）；GitHub 模板给出原生 issue dependencies 的 `gh api` 命令。
- `domain.md` 消费规则："If any of these files don't exist, **proceed silently**." / "Flag ADR conflicts… _Contradicts ADR-0007 (event-sourced orders) — but worth reopening because…_"

### 4.14 `triage` + `AGENT-BRIEF.md` + `OUT-OF-SCOPE.md`
- 状态机（category：bug/enhancement；state：五角色）；每条 AI 生成评论以 `> *This was generated by AI during triage.*` 开头；步骤：Gather（redundancy check + prior rejection check）→ Recommend → **Verify the claim** → Grill (if needed) → Apply outcome。
- **Agent brief** 原则："Durability over precision"（不写文件路径/行号）；"Behavioral, not procedural"；"Complete acceptance criteria… independently verifiable"；"Explicit scope boundaries"。
- **`.out-of-scope/` 知识库**：一概念一文件；"Institutional memory… Deduplication"；"The reason should be durable. Avoid referencing temporary circumstances"；匹配按概念相似而非关键词；维护者可 Confirm/Reconsider/Disagree。仓库自身有三条：`question-limits.md`、`mainstream-issue-trackers-only.md`、`setup-skill-verify-mode.md`。

### 4.15 `diagnosing-bugs`
- "Phase 1 — Build a feedback loop. **This is the skill.** Everything else is mechanical."；十种造 loop 的方法；"Tighten the loop"；**完成准则**："a tight loop that goes red… **one command**… you have **already run at least once**… Red-capable / Deterministic / Fast / Agent-runnable"；"No red-capable command, no Phase 2."
- Phase 3 "Generate **3–5 ranked hypotheses**… falsifiable… **Show the ranked list to the user before testing**… Don't block on it"；Phase 4 `[DEBUG-a4f2]` 标签；Phase 5 "If no correct seam exists, that itself is the finding"；Phase 6 "The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns"；v1.2.3 新增 Redact。

### 4.16 其他
- `prototype`："throwaway code that answers a question"；LOGIC（单个可双击的 HTML）/ UI（一个 route 多变体）；"Capture it when done… commit it to a throwaway branch (`prototype/<name>`)… leave a context pointer to that branch on the implementation issue".
- `research`：后台代理、"primary sources"、单个带引用的 Markdown。
- `codebase-design`：deep module 词汇（Module / Interface / Implementation / Depth / Seam / Adapter / Leverage / Locality）；"One adapter means a hypothetical seam. Two adapters means a real one."；`DESIGN-IT-TWICE.md`（3+ 并行子代理各出一套截然不同的接口）；`DEEPENING.md`。
- `improve-codebase-architecture`：YAGNI 作用域（看最近 commit 热点）→ HTML 报告（Strong / Worth exploring / Speculative）→ 选一个后 `grilling` + `domain-modeling`。
- `to-questionnaire`："**Grill the send, not the subject.**"（谁收、要什么回来）→ Markdown 问卷。
- `wait-what`：一句 "Re-pitch that: give me a little bit of context, talk in ASD-STE100 Simplified Technical English, and use the ubiquitous language from `CONTEXT.md`."
- `wizard`：为只能由人完成的步骤生成交互式 bash 向导（"Work an agent can do, an agent should do"）。
- `resolving-merge-conflicts`："Resolve each hunk… by intent traced to each side's primary source… Always resolve; never `--abort`."
- `loop-me`（beta）：把 grilling 指向"工作流 spec"；词汇 Trigger / Checkpoint / **Push right**（"defer the checkpoint as far as it will go… so they are asked once, late, with everything prepared"）/ Brief；"A workflow spec is done when an implementer agent could build it without asking a single question."
- `misc/git-guardrails-claude-code`：hook 拦截危险 git 命令。

---

## 5. 演进时间线（grilling 一支为主）[一手：commit/tag/CHANGELOG/文章日期]

| 日期 | 事件 |
|---|---|
| 2026-02-03 | 仓库初始提交（含 `tdd/`、`write-a-prd/`、`write-a-skill/`、`request-refactor-plan/` 等，**尚无** grill-me）。`write-a-prd` 已含 "Interview the user about the implementation. Be extremely detailed and thorough."、deep modules、"Check with the user which modules they want tests written for" |
| 2026-02-10 ~ 02-25 | `grill-me/SKILL.md` 首次出现（最早触及该路径的 commit 为 `78649baa` 2026-02-25 "Updates"）|
| 2026-03-19 | `fb3629d3` "Added recommendation to grill-me skill"（每题附推荐答案）|
| 2026-03-23 | 文章《My 'Grill Me' Skill Went Viral》|
| 2026-03-26 | `a6bdfd9f` "Add instruction to ask questions one at a time" |
| 2026-04-17 | `write-a-prd`→`to-prd`、`prd-to-issues`→`to-issues`；`prd-to-plan` 删除；`domain-model`、`caveman` 加入 |
| 2026-04-28 | 迁至 `skills/` 目录桶；`diagnose`、`design-an-interface` 等加入 |
| 2026-04-30 | 文章/视频《Skills Changelog: Ubiquitous Language -> /grill-with-docs》：`ubiquitous-language` 并入 `grill-with-docs`，引入 CONTEXT.md、ADR 三门槛、`setup-matt-pocock-skills`、`triage`、`diagnose` |
| 2026-05-14 | 视频《I stopped using /grill-me for coding. Here's what I use instead》|
| 2026-05-21/25 | 视频《/handoff is my new favourite skill》《9 Things People Get Wrong With My /grill-* skills》（文章 05-25）|
| 2026-05-31 | `grilling` 原语作为独立 skill 出现（`221ffca9`）|
| 2026-06-17 | **v1.0.0**：`ask-matt`、`codebase-design`、`domain-modeling`、`writing-great-skills`、User-/Model-invoked 分类、`grilling` 公开为 model-invoked（公告 06-18："63% Token Reduction"）|
| 2026-06-17 | 作者在 #341 认可"稳定 ID 决策账本"；在 #338 表示"Experimenting with this, but it will be a separate skill." |
| 2026-07-03 | `0e9a0727` grilling 加 confirmation gate 与 "grill" leading word |
| 2026-07-06 | `e5932a7a` "wayfinder/grilling: stop the agent grilling itself"（facts vs decisions）|
| 2026-07-08 | **v1.1.0**：`to-prd`→`to-spec`；`to-plan`+`to-issues`→`to-tickets`；`wayfinder`（原 `decision-mapping`）毕业；`code-review`（Fowler smells）；`tdd` 改 reference-only 并去掉 refactor；`research`；`implement`。当日文章仍写 "asking multiple questions at once is bewildering" |
| 2026-07-13 | grilling 泛化措辞（"this plan"→"this"）|
| 2026-07-16 | `a4b2009a` **round-by-round frontier interview**（#593）|
| 2026-07-23/30 | 视频《Don't waste time on specs: /prototype instead》《/wayfinder: Nothing is too big to plan anymore》|
| 2026-07-29 | 固定题式 `❓ **Q1** … ➡️` |
| 2026-08-05 | **v1.2.0**：Claude Code 官方 marketplace 插件；`agents/openai.yaml` sidecar；`AGENTS.md`→`CLAUDE.md` symlink；`writing-great-skills`→`writing-for-agents`；`wait-what`、`wizard`、`to-questionnaire`；phase boundaries；smart zone ~120k→~150k；删六个 skill |
| 2026-08-13/15 | `domain-modeling` 触发词改为 CONTEXT.md/ADR 写入；跨 skill 调用统一为 `Call the Skill tool with "…"`；禁止 skill 调用 user-invoked skill |
| 2026-08-17 | PR #891 删除 grill-with-docs 文档中 "It assumes one writer" 一节（见 §7）|

---

## 6. 文章 / 视频 / 词条 / 帖子 catalogue（含关键引文）

### 6.1 aihero.dev 文章 [一手]（日期为页面 `datePublished`）
1. **Getting Started With Ralph**（2026-01-08）："Ralph is a technique for running AI coding agents in a loop. You run the same prompt repeatedly. The AI picks its own tasks from a PRD. It commits after each feature." `ralph-once.sh`（HITL）→ `afk-ralph.sh`（`<promise>COMPLETE</promise>` 终止信号、迭代上限）。
2. **11 Tips For AI Coding With Ralph Wiggum**（2026-01-08）：Vibe coding → Planning → Multi-phase plans → Ralph 的演进；"Start With HITL, Then Go AFK"；"Define The Scope"（Anthropic 式 JSON PRD 项含 `passes`）；"Track Ralph's Progress"（`progress.txt`："Decisions made and why / Blockers encountered… Don't keep progress.txt forever"）；"Use Feedback Loops"（"The best setup blocks commits unless everything passes"）；"Take Small Steps"（"The rate at which you can get feedback is your speed limit. Never outrun your headlights."）；"Prioritize Risky Tasks"（"Use HITL Ralph for early architectural decisions"）；"Explicitly Define Software Quality"。
3. **My AGENTS.md file for building plans you actually read**（2026-01-13）：Plan loop（Plan → Execute → Test → Commit）；规则原文："Make the plan extremely concise. Sacrifice grammar for the sake of concision." / "At the end of each plan, give me a list of unresolved questions to answer, if any."
4. **A Complete Guide To AGENTS.md**（2026-01-18）：instruction budget（引 HumanLayer "~150-200 instructions"）；"Never use initialization scripts to auto-generate your AGENTS.md"；"Instead of documenting structure, describe capabilities"；根文件最小集："One-sentence project description / Package manager (if not npm) / Build/typecheck commands (if non-standard). That's honestly it."；progressive disclosure、嵌套 AGENTS.md、修复提示词。
5. **Tracer Bullets: Keeping AI Slop Under Control**（2026-01-22）："AI has a natural inclination to sycophancy… it wants to produce complete solutions all at once"；"outrunning your headlights"；提示词 "## Tracer Bullets: When building features, build a tiny, end-to-end slice of the feature first, seek feedback, then expand out from there."；"the principles apply harder to AI than they ever did to humans. Context window constraints make the discipline non-negotiable."
6. **My Skill Makes Claude Code GREAT At TDD**（2026-02-10）："Tests written in bulk test imagined behavior, not observed behavior."；"ONE test → ONE implementation → repeat"；早期 skill 的规划阶段四问（interface changes / which behaviors matter most / deep modules / testability）。
7. **Never Run Claude /init**（2026-02-24）："My entire CLAUDE.md is: `you are on WSL on Windows`… That's the bar: only include what is both undiscoverable and globally relevant." / "Trust the explore step. Use skills for steering. Keep CLAUDE.md nearly empty."
8. **How To Make Codebases AI Agents Love**（2026-02-26）："AI is not a super-powered developer. It's a new starter with no memory."；deep modules；**grey box modules**："You own the interface. AI owns the implementation. Tests keep it honest."
9. **5 Agent Skills I Use Every Day**（2026-03-16）："You have access to a fleet of middling to good engineers… they have no memory… This means you need extremely strict and well-defined processes"；**design tree 出处**："The concept of a 'design tree' comes from The Design of Design by Frederick P. Brooks."；"Claude Code tends to spit out a plan really early when in plan mode… But the grill me skill forces that conversation."；"Skills don't have to be long to be impactful."
10. **Real-world feature build with Claude Code**（2026-03-20）：course-video-manager 上的完整走查（grill → PRD → issues → AFK Ralph → QA）。
11. **My 'Grill Me' Skill Went Viral**（2026-03-23）：全文见 §2 引用；"I recently added the 'provide your recommended answer' line… you can just say 'yes' to the recommendation."；"These grilling sessions often last about 45 minutes."；非编码用途改写版去掉了查代码那句。
12. **Use The /grill-me Skill**（课程练习，2026-04-01）："Do not clear the context with /clear… It's essential that you retain all of the interview in context; it will be important for the next exercise."
13. **Skills Changelog: Ubiquitous Language -> /grill-with-docs**（2026-04-30）：见 §5；"This alignment between you and the AI on non-obvious decisions prevents the AI from suggesting the same bad idea repeatedly."
14. **grill-with-docs: Align Before You Build**（2026-05-05，后同步为文档页）。
15. **9 Things People Get Wrong With /grill-me and /grill-with-docs**（2026-05-25）：Low vs High fidelity questions（"grill → prototype → grill again"）；scope（"dumb zone - around 120k tokens"；"ask the agent upfront to break it down"）；"Being Active, Not Passive"（"it's a conversation, not an interview… If you're too passive, the agent will bombard you with 540 questions"）；**Preserving Your Design Decisions**（"Do not clear the context and start fresh just to write a PRD. That's throwing away all your design work. Every decision in that grilling session has value and should either become code or be documented in a handoff artifact."）；**Using Smart Models for Grilling**（Contextual vs Parametric knowledge："A dumb model won't give you good ideas… for implementation, you can use a smaller model"）；**Running Parallel Grilling Sessions**（"like managing two Slack threads at once… Most people max out at two sessions comfortably"）。
16. **v1 announcement**（2026-06-18）："These improvements reflect a core principle: **the user stays in control, not the agent.** The model is a tool you orchestrate, not the other way around. Yes, this means you carry more cognitive load… But that's why /ask-matt exists".
17. **How To Kill The Bloat In Claude Code's System Prompt**（2026-07-07）：`/context` 度量、logging proxy、`disableBundledSkills`/`disableWorkflows`、`permissions.deny` 裸工具名移除定义。
18. **v1.1 changelog**（2026-07-08）："A PRD describes things about the actual product itself, whereas we were allowing non-product stuff to leak in. What we were really building was a specification"；grilling 三修（当时仍是"更明确地不要一次多问"、confirmation gate、facts vs decisions 以修 "self-grilling… especially happening with Fable"）；"The /implement skill mostly relies on the agent's priors and what your agents.md file teaches it. I almost didn't create a skill for this because it's so simple"；code review 只需 "about 10 lines of guidance" 唤起 Fowler smells；"Wayfinder… designed to replace /grill-with-docs in many situations… you just close a session and open the next Wayfinder ticket. It's all saved in GitHub, so it's collaborative and shareable across your team."
19. **v1.2 changelog**（2026-08-05）：见 §5；"You answer by number ('Q1 agree, Q2 agree, Q3 change this'), which suits dictation."；`to-questionnaire` 起源（"the person to ask was my wife"）。
20. **Why the Anthropic Ralph plugin sucks**（无 datePublished 元数据；sitemap 收录）："every LLM has a smart zone and a dumb zone… Smart Zone: First 40% of context… Ralph keeps the AI in the smart zone… Each iteration… uses a fresh context window… The plugin keeps all iterations in one session… After 3-4 iterations, the AI is working entirely in the dumb zone."
21. **An Introduction To Plan Mode**（无 datePublished；对应视频 2026-01-15）："You don't know what you want until you see it… Plan mode is a forcing function for concrete requirements."；"AI is the best rubber duck I've ever had."
22. **AI Skills for Real Engineers（skills-catalog）**："The point isn't to wrap the agent in scaffolding. It's to write down the exact moves I'd make for a given problem so the agent runs them the same way I would, every time." / "They aren't 'AI productivity hacks.' They're how I keep my taste and standards intact while the agent does the work."

### 6.2 AI Coding Dictionary（`aihero.dev/ai-coding-dictionary/<slug>`，dateModified 2026-07-01）[一手]
- **grilling**："the agent interviews the user Socratically, one decision at a time, proposing a recommended answer for each. Slows the rush to a finished plan — no handoff artifact is written until the concept stabilises… agents fill gaps silently… Grilling inverts this — instead of guessing, the agent has to ask. It's a human-in-the-loop technique… When a question can't be answered in conversation… switch to prototyping."（注：词条仍写 "one decision at a time"，晚于 07-16 的 rounds 改动未同步。）
- **smart-zone**："On frontier models, the dumb zone commonly begins around 125K-150K tokens — though this is debated… Plan around the smart zone, not the window… Doing one task per session gives each task the sharpest part of the session."
- **spec**："A handoff artifact describing a multi-session piece of work — what's being built, not how each session does its share. Mutates as work progresses. Made of tickets."
- **ticket**："A handoff artifact scoping one session of work… Tickets can block or be blocked by sibling tickets, so the order of work falls out of their dependency graph rather than a linear plan… If sessions on your tickets routinely degrade before the work is done, the tickets are too big; split them… The dependency graph is also what unlocks parallelism."
- **context-pointer**："A pointer needs two parts to work: a stable path, and enough description for the agent to know when following it is worth it."
- **handoff / handoff-artifact**："The visible failure of a bad handoff is relitigation: the new session re-opens decisions the old one had settled, because the carry recorded what was decided but not why." / "The artifact is a secondary source… Where a claim matters, the next session should verify it against the primary source".
- **human-in-the-loop / afk**："Some work is in-the-loop by nature, because your reactions are the input." / "AFK… coming back to hours of finished, confident work built on a wrong call made in the first ten minutes… Before: resolve the ambiguity up front — a grilling session, a written spec… During: automated checks and automated review… After: the run ends in something reviewable — a PR, not changes already merged."
- **primary-source / secondary-source / progressive-disclosure**：见 §4.11、§4.12。
- 全部 70 个词条 slug 已列于附录 A。

### 6.3 YouTube（@mattpocockuk）[一手：标题/日期/描述；4 条含字幕全文]
| 日期 | 标题 | 关键点 |
|---|---|---|
| 2025-10-27 | How I use Claude Code for real engineering | plan mode、multi-phase plans、"storing plans as GitHub issues to preserve them across context resets" |
| 2026-01-05 | Ship working code while you sleep with the Ralph Wiggum technique | "just a for loop instead of complex orchestration systems" |
| 2026-01-15 | I was an AI skeptic. Then I tried plan mode | |
| 2026-02-21 | I'm using claude --worktree for everything now | worktree 隔离 |
| 2026-02-23 | Red Green Refactor is OP With Claude Code | |
| 2026-02-24 | Never Run claude /init | 引 arXiv 2602.11988 |
| 2026-02-25 | How to actually force Claude Code to use the right CLI (don't use CLAUDE.md) | 用 hooks 而非说明文 |
| 2026-03-03 | The 7 phases of AI-driven development | "idea, research, prototype, PRD, implementation planning, execution, and QA" |
| 2026-03-16 | 5 Claude Code skills I use every single day | |
| 2026-03-18 | Building a REAL feature with Claude Code: every step explained（44 分钟）| |
| 2026-03-27 | Never Trust An LLM | 幻觉分类 |
| 2026-04-29 | How To De-Slop A Codebase Ruined By AI (with one skill) | |
| 2026-04-30 | I Open-Sourced My Own AFK Software Factory | Sandcastle |
| 2026-05-14 | I stopped using /grill-me for coding. Here's what I use instead | **字幕**："as I used Grill me more… the agent was being really, really verbose… we would actually land on some really good shared language and then that wasn't documented anywhere" / "what is the thinnest layer of documentation I could use" / CONTEXT.md 影响 "All variable names, all file names" / "concise replies… also reflected in its own thinking traces" / "when you have a code base, use Grill with Docs. When you don't have a code base, use Grill me." |
| 2026-05-21 | /handoff is my new favourite skill | **字幕**："around by the 120k token mark, I start to feel like I'm in the dumb zone" / compact 会形成 "sediment of different layers" / handoff 到 prototype 再 handoff 回来 "almost like you've done a kind of DIY sub-agent" / "you can just pass this to another agent… Codex or… Copilot CLI… adversarial review" / "these handoff files are disposable" |
| 2026-05-25 | 9 Things People Get Wrong With My /grill-* skills | 同文章 |
| 2026-05-28 | Can Cursor's HARDCORE Review Skill Stop The Slop? | 评 Cursor `thermo-nuclear-code-quality-review` |
| 2026-06-?? | Learn anything with the /teach skill | |
| 2026-07-08 | New Skills! v1.1… | |
| 2026-07-16 | mattpocock/skills: A complete AI Coding workflow, end-to-end | **字幕**："If you're working in a team, I would say that project skills are the right way to go. That way, everyone is using the same skill set on every project, and it means that you can contribute to the skills together and make those decisions together." / 全部 skill 描述 "660 tokens" / "Opus 4.8 on medium effort" / "I think of my context window… getting significantly dumber around 140k mark" / "you clear in between every single ticket" / 子代理评审："agents are often really bad at editing code or improving code they've just written" |
| 2026-07-23 | Don't waste time on specs: /prototype instead | **字幕**："people tend to think I need to create a spec for AI… spec-driven development… In this impulse, what they forget to do is they forget they can actually write code." / "the leap from discussion and spec to production-ready code is really big. Whereas, if you have a working prototype, turning that into production is pretty simple." / 致敬 Shape Up（Ryan Singer）|
| 2026-07-30 | /wayfinder: Nothing is too big to plan anymore | **字幕**：见 §8（对 "too much process / SDD / waterfall" 的回答）|
| 2026-08-05 | New Skills! v1.2… fixes /grill-me | |
| 2026-08-14（X）| "My 25 skills (now @theo-approved), explained in 10 minutes" | 视频帖，syndication 端点取得 |

### 6.4 GitHub issues 中作者本人的发言 [一手]
- #44《Codex just asked me 200 questions》（2026-04-20）："My advice is to remember that _you_ are the one in charge. Use the questions as a prompt to provide more information. **It's a conversation, not an exam.**" → 04-28 以 `wontfix` 关闭并写入 `.out-of-scope/question-limits.md`。
- #130（2026-05-12）：见 §4.3。
- #186《Handoff skill loses subtle but load-bearing decisions》（2026-05-13）："Define 'long', because this might be just an 'LLM's are bad with long context windows' issue that no skill-tweaking can solve" / "I would describe anything past 100K tokens as the dumb zone of the LLM, where compaction quality cannot be guaranteed and shit gets weird. 200K is pretty deep in the dumb zone."
- #341《resolved answers are not traceable through PRD, issues, and implementation》（2026-06-17）："This is a really good idea. Tagging answers by a specific tag and linking them through the whole process gives the agent a **leitwort** to trace throughout the entire process. Love it."（issue 至今 open；提议者拟做独立 model-invoked "traceability skill" + Markdown decision ledger，尚无 PR 合并的证据。）
- #338《the design tree it walks isn't tracked》（2026-06-17）："Experimenting with this, but it will be a separate skill."（open）
- #663（2026-07-29/30）：只答 "Add this to your CLAUDE.md: `When grilling, ask me one question at a time.`" / "The instruction is self-explanatory and easy to find without outside help."
- #831《Can we get the old grill-me back?》（2026-08-10 起，12 评论）：无作者回复；社区分裂（"unbearable" vs "get shit done faster"），有用户报告 CLAUDE.md 一句"This don't always work"。
- #23《The flow》（2026-03-24 起）：作者 04-28 以 AI triage 评论标为 `ready-for-human`，说明主流程文档是 "documentation-design task, not a mechanical doc edit"，最终催生 `ask-matt`（v1.0）。用户在此贴中把他的 grill-me → PRD 与 **Superpowers 的 `execute-plan`** 拼接使用。
- #856《Field notes: umbrella grill + same-worktree implement wave》（2026-08-14，第三方现场报告，作者未回复）："We opened three terminals on the same checkout for the three unblocked UI slices. One agent deleted another's untracked files. `git add -A` almost ate the wave." 并提出 "umbrella mode"（一次 grill 多个兄弟 decision tickets）与 "exclusive glob"（每票声明可触碰的文件）。

### 6.5 第三方 / 二手 [二手]
- HN：多次提交 aihero.dev/skills-grill-me、"My 'Grill Me' Skill Went Viral"（2026-07-17，3 分）；衍生工具 "Show HN: An interactive UI for the grill-me skill"（plannotator.ai，2026-08-15）、"barbequeue: run Matt Pocock's skills in bulk AFK"（2026-08-15）、"chartr – visualize tickets as a star-map"（2026-07-29）。热度低（均 ≤ 6 分）。
- alphamatch.ai、explainx.ai 等博客有转述（未采信为事实来源）。

---

## 7. 团队 / 多 agent 相关的直接证据（为 §9 做铺垫）

- 作者的默认使用者画像是**单人**：`.scratch/` 本地文件、`handoff` 写到临时目录、`implement` 直接提交当前分支且不开 PR、"the assignee _is_ the claim"、`triage` 面向 "maintainer"。
- 他对团队用法的明确表态：项目级安装 skills 以共享同一套并共同演进（视频 2026-07-16，§6.3）。
- **删除的 "It assumes one writer" 段（`docs/engineering/grill-with-docs.md`，存在于 ≤2026-08-15 版，2026-08-17 由 PR #891 删除）原文**：
  > "The stateful outputs assume a single person curating them. A two-developer team running four months in one repo reported state drift on roughly 20% of sampled merged PRs, with ADR citations and README claims the highest-drift surfaces — deliberate, human-curated docs drifted worse than agent memory did. Pruning the stale docs did not hold; the same sweep was stale again within days. What worked was deleting shadow state outright and adding a deterministic citation and link linter to CI. Related: running the skill repeatedly across unrelated changes in one repo tends to accumulate mixed-topic docs, because nothing separates one session's output from another's. Neither of these is fixed in the skill today."
  
  删除的 commit 信息（`05055363`，作者署名 "Remote Box Agent"）："The section's single-writer framing doesn't fit how the skill is actually used across a team; drop it rather than carry a stale caveat."（即：作者认为该"单写者"框架不再符合团队实际用法，但**没有说明**上述漂移数据本身是否被推翻。）
- `wayfinder` 是唯一为并发设计的部件："expect other sessions to be editing the tracker concurrently"；claim-by-assignment；原生 blocking 让 frontier 在 tracker UI 可见；文档页承认并行 grilling 票会互相重复提问。
- `implement` 文档页对同 checkout 并行的警告（§4.6）；`--worktree` 视频（2026-02-21）与 Sandcastle（"parallelizing multiple AFK agents… configurable branch strategy… commits… get merged back"）是他处理并行的实际手段。
- 真实仓库 `course-video-manager`（2026-08）：`CLAUDE.md` 的 `## Agent skills` 块 + 27 个 ADR（**其中 `0008-*` 出现两个同号文件**——"scan highest number and increment" 在多会话下发生了编号碰撞）；ADR 0008 "Zero-commit agent runs are allowed" 是一份典型的"记录开发中遇到的问题 + 决策 + 被拒方案 + 后果"的记录样本；`CLAUDE.md` 还要求 "**Keep the cvm help text and `CONTEXT.md` in sync manually**"。

---

## 8. 他对"重流程"的批评（原文汇总）

1. **对 GSD / BMAD / Spec-Kit**（README，2026-08）："Developing real applications is hard. Approaches like GSD, BMAD, and Spec-Kit try to help by owning the process. But while doing so, they take away your control and make bugs in the process hard to resolve. These skills are designed to be small, easy to adapt, and composable. They work with any model." — 这是目前能核实到的唯一点名批评；X 上是否有更详细的原帖 **[未核实]**。仓库 issue 中未见他对 Superpowers 的直接评价（搜索 "superpowers" 命中的都是用户发言）。
2. **"the user stays in control, not the agent"**（v1 公告）；"They aren't 'AI productivity hacks.' They're how I keep my taste and standards intact while the agent does the work."（skills-catalog）；"The point isn't to wrap the agent in scaffolding."
3. **对 SDD 与 waterfall 的回答**（wayfinder 视频字幕，2026-07-30）：
   - "'This is way too much process… When should I actually use it?' Well, the answer to this is if you think the work that you're doing can be completable and planable in a single session, then plan it in a single session."
   - "this is SDD… spec-driven development… the way I think of specs is really just a destination for a multi-session piece of work… For me, I close the issue containing the spec, and the spec is gone… Once the spec is present in the code, then you can just delete the spec. Whereas, people who do spec-driven development go back to the spec and edit it and modify it… these specs are non-persistent."
   - "Some folks look at Wayfinder, and they think, 'God, that's a lot of planning. Doesn't that look like waterfall?' And the prototypes are the way that you prevent it from becoming waterfall".
   - 对 grill-with-docs 的自我批评："you were really relying on the spec to be the source of truth, but the spec is always just a summary of what was actually said in the meeting. Whereas now, with Wayfinder, you've actually got access to that primary source".
4. **对过度 spec、忘记写代码**（prototype 视频）："people tend to think I need to create a spec for AI… they forget they can actually write code."
5. **对 Anthropic Ralph 插件**：把循环塞进单会话，"guarantees that you're going to fill up the smart zone and enter the dumb zone… Ralph works because it's ruthlessly simple. Keep it that way."
6. **对 `/init` 与臃肿 CLAUDE.md**：见 §6.1 第 4、7 条；"Every line you add has a cost that compounds across every session".
7. **对提问上限**：`.out-of-scope/question-limits.md`："Grilling is intentionally open-ended… A fixed cap would either cut off useful exploration on hard problems or feel arbitrary on easy ones… natural-language steering is the intended control surface, not a numeric limit."
8. **对 setup 的 verify 模式、非主流 tracker 集成**：均以"prompt-driven 已可表达 / 维护面"为由列为 out of scope。
9. **对 TDD 的"严格执行"**：文档页 "forcing the point harder restricts the agent's creativity for little gain — the loop is worth running even when it is not followed strictly".
10. **对 skill 应"小"**："It's only three sentences long, but it's incredibly impactful… Skills don't have to be long to be impactful. You just need to choose the right words at the right time."（5-skills 文章）；`wait-what` 说明："Concision skills fail by growing — a 400-line skill still leaves the model verbose".

---

## 9. 提取：(a) 工作流思想 catalogue

| # | 思想 / 机制 | 关键原文 | 出处 |
|---|---|---|---|
| A1 | Grill before plan：访谈直到 shared understanding | "Interview me relentlessly… until we reach a shared understanding." | 本地 grill-me；viral post |
| A2 | Design tree（Brooks）逐枝、决策依赖逐一 | "Walk down each branch of the design tree, resolving dependencies between decisions one-by-one." | 同上；5-skills |
| A3 | 每题附推荐答案 | "For each question, provide your recommended answer." / "you can just say 'yes'" | viral post |
| A4 | Facts vs decisions | "Finding _facts_ is your job, never the user's… The _decisions_ are the user's" | grilling SKILL.md |
| A5 | Rounds / frontier | "Ask the whole frontier in one round… A question whose answer depends on another question still open… belongs to a _later_ round" | grilling |
| A6 | Confirmation gate | "Do not act on it until the user confirms you have reached a shared understanding." | grilling |
| A7 | 固定题式与按号作答 | `❓ **Q1** … ➡️` / "Q1 agree, Q2 agree, Q3 change this" | grilling；v1.2 |
| A8 | 不设提问上限；人是主导 | "It's a conversation, not an exam." | #44；out-of-scope |
| A9 | Grillable vs ungrillable → prototype 旁路 | "stop grilling. Build the throwaway version" | grill-me docs；9-things |
| A10 | Ubiquitous language 词汇表 CONTEXT.md（纯词汇、Avoid 列表、lazy create、inline 更新） | "It is a glossary and nothing else." | domain-modeling |
| A11 | ADR 三门槛、单段即可、顺序编号 | "hard to reverse / surprising without context / real trade-off" | ADR-FORMAT |
| A12 | Spec = 多会话工作的目的地；不再访谈；seams 先于文字 | "Sketch out the seams… the ideal number is one." | to-spec |
| A13 | Tracer-bullet 垂直切片 ticket、单 smart zone 大小、blocking edges、frontier | "sized to fit in a single fresh context window" | to-tickets |
| A14 | 拆票前人工 quiz 审批 | "Iterate until the user approves the breakdown." | to-tickets |
| A15 | Wide refactor → expand–contract | | to-tickets |
| A16 | 一票一会话、票间 /clear | "you clear in between every single ticket" | ask-matt；视频 |
| A17 | pre-agreed seams → red/green → 两轴 review（Standards/Spec）→ commit | | implement/tdd/code-review |
| A18 | 子代理做 review 以避免自评偏见 | "agents are often really bad at… code they've just written" | 视频 07-16 |
| A19 | Wayfinder：destination、map=index、decision ticket=primary source、fog、out-of-scope、HITL/AFK、claim by assignment、one ticket per session | | wayfinder |
| A20 | Prototype 是 primary source（留在 `prototype/<name>` 分支）| "Throwaway no longer means deleted." | v1.2 |
| A21 | Research 由后台子代理做，只读 primary sources | | research |
| A22 | Phase boundary 五选一；compact 是默认非首选；continue 保留 primary source | | PHASE-BOUNDARIES |
| A23 | Smart zone / dumb zone（100k→120k→140k→~150k）；一任务一会话 | | dictionary；多处 |
| A24 | Handoff = 可携带性；suggested skills；不重复已有工件；脱敏；临时目录 | | handoff |
| A25 | 并行 grilling 会话（人像管理两个 Slack 线程）| | 9-things |
| A26 | 高参数模型做 grilling，小模型可做实现 | | 9-things |
| A27 | 写给 agent 的文档：context pointer、two loads、progressive disclosure、leading words、no-op 测试、positive phrasing、cache vs environment | | writing-for-agents |
| A28 | CLAUDE.md 极简 + skills 做 steering + hooks 做硬约束 | "you are on WSL on Windows" | never-run-init；CLI 视频 |
| A29 | Ralph 循环：fresh context per iteration；progress 文件记录 "Decisions made and why / Blockers"；feedback loops 阻断提交；小步；先做高风险 | | Ralph 文章 |
| A30 | Triage 状态机 + agent brief（durable、behavioral、AC、out of scope）+ `.out-of-scope/` 拒绝知识库 | | triage |
| A31 | Bug 诊断：先造 tight red loop 才许假设；假设先给人排序；正确假设写进 commit | | diagnosing-bugs |
| A32 | 深模块 / grey box：人拥有接口，AI 拥有实现，测试守约 | | codebases-agents-love |
| A33 | User-invoked vs model-invoked；router skill；`Call the Skill tool with "x"` | | invocation.md |
| A34 | 跨 harness：SKILL.md + `agents/openai.yaml`；AGENTS.md↔CLAUDE.md 符号链接；harness 中性子代理措辞 | | v1.2；CHANGELOG 1.2.3 |
| A35 | to-questionnaire：把答不了的问题变成给他人的问卷（grill the send） | | to-questionnaire |
| A36 | loop-me 的 checkpoint / push right / brief（HITL 检查点尽量后置、给决策就绪的简报） | | loop-me |

### (b) 可直接采纳的机制（与我方硬性需求的映射）
- **需求 (1) 先做需求访谈并记录**：采用 `grilling` 原语全套（A1–A9），作为框架第一阶段的强制门；保留一次一问/按轮两种模式作为用户偏好开关（他自己承认两派都合理）。
- **需求 (2) 广泛调研 + 决策逐条确认并记录**：A4（事实由 agent 查，决策交人）+ A6（确认门）+ A21（research 子代理只读 primary sources、产出带引用文件）直接对应；ADR 三门槛（A11）用于"硬决策"；`.out-of-scope/`（A30）用于"被拒方案/需求"记忆。
- **需求 (3) 每个 feature 有测试证明完整**：A12（spec 内先定 seams 与 Testing Decisions）→ A17（只在 pre-agreed seams 写测试）→ code-review 的 Spec 轴按 spec 行逐条对照；to-tickets 文档中"每条 AC 必须在起始 commit 为红"的检查可直接写进我们的 CI 门。
- **需求 (4) 记录问题与设计理由**：A31 的"正确假设写进 commit/PR"、ADR 0008 样本、Ralph progress 文件的 "Decisions made and why / Blockers encountered" 字段。
- **上下文/token 预算**：A22、A23、A16、A28、`/context` 度量与系统提示瘦身（§6.1 第 17 条）。
- **会话交接 + 每 feature 摘要**：A24（handoff 结构：live thread + suggested skills + pointers not copies + redaction）+ dictionary 对 handoff-artifact 的要求（"what was decided and why… what's done and what's left"）。
- **需求变更管理**：wayfinder 的 out-of-scope 规则（"returns only if the destination is redrawn, and then as a fresh effort"）、spec 的 Out of Scope 节、triage 的 `needs-info` 回路。
- **人工审批点**：A6（grill 确认门）、to-spec 的 seam 确认、A14（拆票 quiz）、wayfinder claim、diagnosing-bugs 的假设排序展示、`.out-of-scope` 的 Confirm/Reconsider/Disagree。
- **agent-facing 英文说明的写法**：A27 全套；`writing-docs.md` 的四节人类向模板可作我们中文记录页的骨架参考。

### (c) 需要为团队 / 多 agent / 多 harness 改造的点
1. **决策记录必须结构化并有稳定 ID**（他没有）：grill 的 Q 编号按轮重置、不持久；"everything else you decided" 只在对话里。需新增：`decisions/` 账本（ID、问题、最终答案原文、状态 confirmed/provisional/deferred/superseded、理由、下游覆盖引用），并在 spec/ticket/test/commit 中回引 ID（他本人对 #341 的 "leitwort" 说法即为此背书）。同时把 #338 的 "design tree scratch"（open frontier 持久化）纳入，以解决"未解分支只在对话里"的问题。
2. **规划工件的多写者纪律**：他的 CONTEXT.md/ADR 是单人 curated；被删段落显示两人团队即出现 ~20% PR 文档漂移，有效对策是**CI 里的确定性引用/链接 linter**与"删除影子状态"。我方应把 CONTEXT.md/ADR/决策账本纳入 CI 校验（引用存在性、ID 唯一性、状态机合法性），并按 feature/context 分文件避免 "mixed-topic docs"。ADR 编号需用会话安全的方式（前缀日期/ULID 或由 tracker 分配），避免 `0008` 撞号。
3. **并行实现的隔离与所有权**：`implement` 假设单 checkout；同 checkout 并行已被现场证明会互相破坏。需强制 per-ticket worktree/沙箱（他自己用 `--worktree` 与 Sandcastle），并在 ticket 中声明可触碰文件范围（#856 的 exclusive glob 建议）与集成分支策略（expand–contract 的 integration branch 思路可复用）。
4. **实施计划审批**：`implement` 无审批、直接提交、不关票；我方需求要求"每个 task 的实施计划人工批准"，需在 implement 前插入 "restate + plan + seams" 的审批门（他在 spec 阶段有 seam 确认，可下沉到每票）。
5. **handoff 的持久化**：他把 handoff 放临时目录、视为一次性；团队与跨 harness 交接需要放进仓库（如 `docs/handoffs/<feature>/`）并设保留/归档策略；同时保留他的"引用而非复制、脱敏、说明下一会话用途"三条。
6. **spec 的持久性**：他主张 spec 用完即弃、只保留 CONTEXT.md/ADR；我方需求要求可审计记录，应改为"spec 归档 + 决策账本长期保留"，并说明这是有意偏离（理由：多人/合规/回溯）。
7. **跨 harness 加载可靠性**：他记录了"命名另一个 skill 不一定被加载"（grill-with-docs 委托失败）、Codex 需 `agents/openai.yaml`、Codex 插件不接受多路径且丢符号链接、"disable-model-invocation" 在 Claude 桌面/网页端把 user-invoked skill 从列表移除（#693）。六个目标 harness 中除 Claude Code/Codex 外（OpenCode、Pi、DeepSeek Harness、Grok Build）对 Agent Skills 标准、`disable-model-invocation`、Skill tool 语义的支持**未在本流核实**，需 R-其他流或后续验证；设计上应把关键流程写成 harness 中性的 Markdown 步骤 + 可选 sidecar，而不依赖 skill-to-skill 自动调用。
8. **AFK 与 HITL 的边界**：wayfinder 的 HITL/AFK 标签、AFK 词条的"事前 grill、事中自动检查、事后 PR"三段可直接用于我们的门禁设计；但他的 AFK 循环（Ralph）默认单人单 PRD，多 agent 领票需要 tracker 原子领取（assignee/label）与 CI 可重跑的门。
9. **语言分层**：他的所有 agent-facing 文本是英文、人类向文档也是英文；我方"agent 英文、人类中文"需要双轨：CONTEXT.md 保持英文（agent 读，且影响标识符命名），中文侧生成派生的术语对照/决策摘要，避免两份真源（他的 single-source-of-truth 原则）。
10. **项目类型覆盖**：他的示例几乎全是 TS/JS（Vitest/Playwright/pnpm）；`tdd`/`code-review`/`diagnosing-bugs` 的原则与语言无关，但 Python DS/notebook 的 seam（notebook 不可测、数据依赖）需要我方补充规则（他未涉及）。

### (d) 已知批评：见 §8。

### (e) grill 如何记录需求与决策？——直接回答
- **是否产生结构化记录？** 否。`grill-me` 零文件；`grill-with-docs` 只产生 `CONTEXT.md`（词汇）与三门槛 ADR；其余决策仅存在于对话，官方要求"不要清空上下文，直接交给 `/to-spec`"。spec 是唯一的综合记录，且被定义为可丢弃。
- **有无 ID？** 提问按轮编号（Q1…Qn），不跨轮、不持久；ADR 有顺序号（存在撞号案例）；wayfinder 的 decision ticket 以 tracker issue id 为身份（并要求叙述中用名字而非编号）。没有需求/决策级稳定 ID；作者认可该方向（#341）但未实现。
- **未解分支如何标记？** 会话内：frontier 是 agent 的隐式判断（"not a computed graph"），无落盘（#338 提议 `.grill-tree.md`，作者说"会是独立 skill"）；结束条件是 frontier 为空 + 用户确认。跨会话：wayfinder 的 open child issues（frontier）与 map 的 `## Not yet specified`（"can't state the question precisely yet"）/`## Out of scope`；他人才能答的问题 → `to-questionnaire`；Plan Mode 规则 "At the end of each plan, give me a list of unresolved questions to answer"。
- **推荐答案被采纳/拒绝如何留痕？** 无机制；只在对话中。
- **provisional / 待验证的决策？** 无状态字段；ADR 可选 `status: proposed|accepted|deprecated|superseded`；wayfinder 对"已关闭决策后来发现错了"承认 "no official guidance"。

---

## 10. 对我方框架设计的具体启示（浓缩版）

1. **把 `grilling` 原语作为 Phase 0 的规范**：rounds/frontier + 每题推荐 + facts-vs-decisions + confirmation gate + 一次一问开关；agent-facing 英文正文可直接借鉴其措辞（含 leading words "relentless / frontier / design tree"）。
2. **在 grill 之上加"决策账本"**：每个已决问题一条记录（`D-YYYYMMDD-nnn` 或 ULID），字段：question / options / recommendation / decision (verbatim) / status {confirmed, provisional, deferred, superseded} / rationale / evidence pointers / covered-by (spec 段、ticket、test、commit)。provisional 必须带 rationale 与复核触发条件。CI 校验 ID 唯一、状态机合法、下游引用存在——这正是他文档中"没有 ledger"缺口的补法，也回应了被删段落里"deterministic citation and link linter"的经验。
3. **frontier 落盘**：会话内维护 `frontier.md`（open/blocked/resolved 分支），解决压缩后丢失未解分支；结束时 frontier 必须为空或每项转为 deferred 决策记录。
4. **CONTEXT.md + ADR 原样采用**（含 `_Avoid_`、lazy create、三门槛、单段 ADR），但编号改为会话安全方案；多 context 用 CONTEXT-MAP。
5. **spec 模板采用其六节**并加入"决策 ID 覆盖表"与"Out of Scope"，spec 归档而非删除。
6. **ticket = tracer bullet + blocking edges + 单 smart-zone 大小 + 文件所有权声明 + AC 在起点为红**；tracker 原生依赖 + 原子领取；per-ticket worktree。
7. **implement 前加实施计划审批门**（restate ticket、seams、AC、变更文件范围）；实现只在 pre-agreed seams 写测；结束跑两轴 review（子代理）；提交并**关票/勾 AC**（他缺）。
8. **上下文预算**：一票一会话、票间清空、phase-boundary 五选一、smart-zone 预算写进 handoff 与 ticket 大小校验、CLAUDE.md 极简 + 渐进披露 + hooks 硬约束。
9. **wayfinder 式地图**用于大型工作：destination 先定、map 只索引、决策留在票里、fog 与 out-of-scope 分列、HITL/AFK 分类、prototype/research 作为一等票型；对"太多流程"的边界采用他的规则——一会话能规划完就别建图。
10. **写作规范**：writing-for-agents 的 no-op 测试、positive phrasing、context pointer 措辞、single source of truth（环境即真源，不缓存可查得的东西）用于全部英文 agent 说明；中文人类记录用其 "What it does / When to reach for it / Common questions / It's working if" 四节格式的变体。
11. **有意偏离并记录理由**：我们保留 spec/handoff/决策记录的持久性（团队审计），与他的"spec 非持久、handoff 临时"相反；我们对每票加审批门，与他的"implement 不重开计划、直接提交"相反。

---

## 11. 未核实 / 待后续验证
- X/Bluesky 上关于 Superpowers / spec-kit / BMAD / GSD 的原帖与更详细论据 **[未核实]**（本流仅有 README 一句与视频/issue 侧证）。
- 他是否在任何地方明确点评过 Superpowers **[未核实]**（issue 语料中只有用户提及）。
- 词条 `grilling` 仍写 "one decision at a time"（与 07-16 后的 rounds 不一致），是否有意保留 **[未核实]**。
- #341 的 traceability skill 是否有 PR 在途（`.changeset/` 中未见相关条目）**[未核实]**。
- OpenCode / Pi / DeepSeek Harness / Grok Build 对 Agent Skills、`disable-model-invocation`、Skill tool 的支持 **[未核实]**。
- "It assumes one writer" 段中的两人团队漂移数据来源（原始现场报告）**[未核实]**。

---

## 12. References（全部 URL；accessed 2026-08-17）

**本地文件**
- `C:\Users\NF3317\.claude\skills\grill-me\SKILL.md`
- `C:\Users\NF3317\.claude\skills\grill-with-docs\SKILL.md`、`ADR-FORMAT.md`、`CONTEXT-FORMAT.md`

**mattpocock/skills（GitHub）**
- https://github.com/mattpocock/skills （README；repo 元数据 via https://api.github.com/repos/mattpocock/skills）
- https://api.github.com/repos/mattpocock/skills/git/trees/main?recursive=1
- https://api.github.com/repos/mattpocock/skills/commits （最近 40 条；path 过滤 grill-me/grilling）
- https://api.github.com/repos/mattpocock/skills/tags ； https://api.github.com/repos/mattpocock/skills/releases
- https://github.com/mattpocock/skills/archive/refs/heads/main.tar.gz （commit 9c9f36cc）
- 历史原文：https://raw.githubusercontent.com/mattpocock/skills/62f43a18/skills/productivity/grill-me/SKILL.md ； https://raw.githubusercontent.com/mattpocock/skills/fb3629d3/grill-me/SKILL.md ； https://raw.githubusercontent.com/mattpocock/skills/a6bdfd9f/grill-me/SKILL.md ； https://raw.githubusercontent.com/mattpocock/skills/985d8fce/write-a-prd/SKILL.md ； https://api.github.com/repos/mattpocock/skills/git/trees/985d8fce?recursive=1 ； https://raw.githubusercontent.com/mattpocock/skills/068b6e0c/docs/engineering/grill-with-docs.md
- 仓库内文件（main）：`README.md`、`CLAUDE.md`、`CONTEXT.md`、`CHANGELOG.md`、`.agents/invocation.md`、`.agents/install-block.md`、`.agents/writing-docs.md`、`.agents/adr/0001-explicit-setup-pointer-only-for-hard-dependencies.md`、`.agents/adr/0002-ship-as-a-claude-code-plugin.md`、`.out-of-scope/question-limits.md`、`.out-of-scope/mainstream-issue-trackers-only.md`、`.out-of-scope/setup-skill-verify-mode.md`、`skills/productivity/{grilling,grill-me,handoff,to-questionnaire,wait-what,writing-for-agents,teach}/SKILL.md`、`skills/productivity/writing-for-agents/SKILL-MECHANICS.md`、`skills/engineering/{grill-with-docs,domain-modeling,to-spec,to-tickets,implement,tdd,code-review,wayfinder,research,prototype,triage,diagnosing-bugs,codebase-design,improve-codebase-architecture,ask-matt,setup-matt-pocock-skills,resolving-merge-conflicts,wizard}/SKILL.md`、`skills/engineering/domain-modeling/{ADR-FORMAT,CONTEXT-FORMAT}.md`、`skills/engineering/tdd/{tests,mocking}.md`、`skills/engineering/ask-matt/PHASE-BOUNDARIES.md`、`skills/engineering/triage/{AGENT-BRIEF,OUT-OF-SCOPE}.md`、`skills/engineering/codebase-design/{DESIGN-IT-TWICE,DEEPENING}.md`、`skills/engineering/setup-matt-pocock-skills/{domain,issue-tracker-local,issue-tracker-github,triage-labels}.md`、`skills/in-progress/{README.md,claude-handoff/SKILL.md,loop-me/SKILL.md}`、`skills/{misc,deprecated,productivity,engineering}/README.md`、各 skill 的 `agents/openai.yaml`、`docs/productivity/{grilling,grill-me,handoff,writing-for-agents}.md`、`docs/engineering/{grill-with-docs,wayfinder,to-spec,to-tickets,tdd,implement}.md`
- Issues/PR：https://github.com/mattpocock/skills/issues/23 ； /issues/44 ； /issues/130 ； /issues/186 ； /issues/338 ； /issues/341 ； /issues/663 ； /issues/831 ； /issues/856 ； /issues/862 ； https://github.com/mattpocock/skills/pull/891 ； https://github.com/mattpocock/skills/commit/05055363.patch
- Issue 搜索：https://api.github.com/search/issues?q=repo:mattpocock/skills+{superpowers|spec-kit|BMAD|GSD|"one question at a time"|batch-grill-me|compact}

**其他 GitHub 仓库**
- https://api.github.com/users/mattpocock/repos?per_page=100&sort=pushed
- https://raw.githubusercontent.com/mattpocock/course-video-manager/076a5a7a182db0fe1e62971dd7a68bcadf010f1c/CONTEXT.md
- https://github.com/mattpocock/course-video-manager/tree/main/docs/adr ； https://raw.githubusercontent.com/mattpocock/course-video-manager/main/docs/adr/0001-lesson-authoring-status.md ； …/0008-agent-implement-zero-commit-runs.md ； …/0026-migrations-applied-by-hand.md ； https://raw.githubusercontent.com/mattpocock/course-video-manager/main/CLAUDE.md ； …/docs/agents/domain.md
- https://raw.githubusercontent.com/mattpocock/sandcastle/main/README.md

**aihero.dev**
- https://www.aihero.dev/posts ； https://www.aihero.dev/sitemap.md ； https://www.aihero.dev/llms.txt
- https://www.aihero.dev/my-grill-me-skill-has-gone-viral （2026-03-23）
- https://www.aihero.dev/grill-with-docs （2026-05-05）
- https://www.aihero.dev/things-people-get-wrong-with-grill-me-and-grill-with-docs （2026-05-25）
- https://www.aihero.dev/real-world-feature-build-with-claude-code （2026-03-20）
- https://www.aihero.dev/5-agent-skills-i-use-every-day （2026-03-16）
- https://www.aihero.dev/tracer-bullets （2026-01-22）
- https://www.aihero.dev/my-agents-md-file-for-building-plans-you-actually-read （2026-01-13）
- https://www.aihero.dev/a-complete-guide-to-agents-md （2026-01-18）
- https://www.aihero.dev/how-to-make-codebases-ai-agents-love （2026-02-26）
- https://www.aihero.dev/skill-test-driven-development-claude-code （2026-02-10）
- https://www.aihero.dev/getting-started-with-ralph （2026-01-08）
- https://www.aihero.dev/tips-for-ai-coding-with-ralph-wiggum （2026-01-08）
- https://www.aihero.dev/why-the-anthropic-ralph-plugin-sucks
- https://www.aihero.dev/never-run-claude-init （2026-02-24）
- https://www.aihero.dev/plan-mode-introduction
- https://www.aihero.dev/skills/skills-changelog-v1-announcement （2026-06-18）
- https://www.aihero.dev/skills/skills-changelog-v1-1-wayfinder-to-spec-to-tickets-grilling-improvements （2026-07-08）
- https://www.aihero.dev/skills/skills-changelog-v12-wait-what-writing-for-agents-claude-code-plugin-and-more （2026-08-05）
- https://www.aihero.dev/skills-changelog-ubiquitous-language-grill-with-docs （2026-04-30）
- https://www.aihero.dev/skills-catalog ； https://www.aihero.dev/how-to-kill-the-bloat-in-claude-codes-system-prompt （2026-07-07）
- https://www.aihero.dev/use-the-grill-me-skill-k029d （2026-04-01）
- 词条：https://www.aihero.dev/ai-coding-dictionary/{grilling,smart-zone,spec,ticket,context-pointer,handoff,handoff-artifact,human-in-the-loop,afk,primary-source,secondary-source,progressive-disclosure}

**YouTube（@mattpocockuk）**
- https://www.youtube.com/@mattpocockuk/videos （最近 30 条列表）
- https://www.youtube.com/watch?v=gaDdrDdczO4 （v1.2，2026-08-05）；…?v=F3lL98Pj90o （wayfinder，2026-07-30，字幕）；…?v=n0VhIVtviC0 （prototype，2026-07-23，字幕）；…?v=M6mYodf0dJM （end-to-end，2026-07-16，字幕）；…?v=A8mokin_YOs （v1.1，2026-07-08）；…?v=UzMNBN6xLLA （9 things，2026-05-25）；…?v=dtAJ2dOd3ko （handoff，2026-05-21，字幕）；…?v=6BB6exR8Zd8 （grill-with-docs，2026-05-14，字幕）；…?v=E5-QK3CDVQM （AFK factory，2026-04-30）；…?v=3MP8D-mdheA （de-slop，2026-04-29）；…?v=hX7yG1KVYhI （real feature，2026-03-18）；…?v=EJyuu6zlQCg （5 skills，2026-03-16）；…?v=Ah9p7v7nJWg （7 phases，2026-03-03）；…?v=9tmsq-Gvx6g （never /init，2026-02-24）；…?v=hYZdIwFIy-c （red green，2026-02-23）；…?v=yv8VZpov8bk （--worktree，2026-02-21）；…?v=WNx-s-RxVxk （plan mode，2026-01-15）；…?v=_IK18goX4X8 （Ralph，2026-01-05）；…?v=kZ-zzHVUrO4 （real engineering，2025-10-27）；…?v=9VNG0h4pLh0 （Never Trust An LLM，2026-03-27）；…?v=mh5XZ-L5SFQ （Cursor review skill，2026-05-28）；…?v=3CSi8QAoN-s （right CLI via hooks，2026-02-25）；…?v=uC44zFz7JSM （codebase not ready，2026-02-26）

**X / 第三方**
- https://x.com/mattpocockuk/status/2088290952704151671 （2026-08-14；via https://cdn.syndication.twimg.com/tweet-result?id=2088290952704151671）
- HN Algolia：https://hn.algolia.com/api/v1/search?query=grill-me+skill ； …?query=mattpocock+skills ；条目 https://news.ycombinator.com/item?id=48944977 、49314054 、49314342 、49094526 、48443601
- 二手：https://www.alphamatch.ai/blog/grill-me-skill-ai-prompt-code-design-2026 ； https://explainx.ai/blog/matt-pocock-typescript-skills-v1-progressive-disclosure-2026 （未采信）

---

## 附录 A：AI Coding Dictionary 全部 70 个词条 slug（2026-08-17 sitemap）
afk, agent, agent-mode, agents-md, ai, attention-budget, attention-degradation, attention-relationship, autocompact, automated-check, automated-review, ax, cache-tokens, clearing, compaction, context, context-pointer, context-window, contextual-knowledge, design-concept, dx, effort, environment, filesystem, grilling, hallucination, handoff, handoff-artifact, harness, human-in-the-loop, human-review, inference, input-tokens, knowledge-cutoff, mcp, memory-system, model, model-provider, model-provider-request, next-token-prediction, non-determinism, output-tokens, parameters, parametric-knowledge, permission-mode, permission-request, prefix-cache, primary-source, progressive-disclosure, prototyping, sandbox, secondary-source, session, skill, smart-zone, spec, stateful, stateless, subagent, sycophancy, system-prompt, ticket, token, tool, tool-call, tool-result, training, turn, vibe-coding

## 附录 B：他引用的"经典"来源（用于我方文献溯源）
- Frederick P. Brooks, *The Design of Design*（design tree）
- David Thomas & Andrew Hunt, *The Pragmatic Programmer*（tracer bullets；"No-one knows exactly what they want"；"The rate of feedback is your speed limit"）
- Eric Evans, *Domain-Driven Design*（ubiquitous language、bounded context）
- John Ousterhout, *A Philosophy of Software Design*（deep modules、design it twice）
- Michael Feathers（seam）
- Martin Fowler, *Refactoring* ch.3（code smells）
- Kent Beck, *Extreme Programming Explained*
- Ryan Singer, *Shape Up*（fidelity / prototyping）
- Geoffrey Huntley（Ralph）；Anthropic "Effective harnesses for long-running agents"（progress 文件、JSON PRD `passes`）
- HumanLayer（instruction budget）
