<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# R3a — Trellis 与主流 spec-driven / workflow 框架深度审计

> 研究流：R3a（跨 harness 项目开发框架设计项目）
> 日期：调研执行于 2026-08-17，报告完成于 2026-08-21（所有网页/本地文件访问日期均为 2026-08-17，除非另注）
> 语言约定：中文叙述、英文技术名词；引文保留原文
> 独立性：未打开 `E:\program\trel` 与 `E:\program\kk`

## 0. 阅读指南与关键结论（一页版）

本报告审计 **Trellis（基线）** 与 **Spec Kit / BMAD / OpenSpec / Superpowers / Kiro / Conductor / cc-sdd / Agent OS / PRPs / compound-engineering / GSD** 共 12 个框架，按统一维度（阶段与工件、人审位置、调研、测试与验证硬度、记录、交接与状态、多代理与多开发者、跨 harness 分发、体量、失败模式、许可）产出画像，末尾给出横向对比表、"值得采纳的机制"与"应避免的错误"，并映射到本项目需求（`docs/requirements.md` 的 R-01～R-19、P-01～P-04、Q-01～Q-08）。

关键结论（详见各节与 §H–§K）：

1. **Trellis 的强项在"运行时管道"而非"方法论"**：单一 `workflow.md` 真源 + 每回合 `<workflow-state>` 面包屑 + `implement.jsonl/check.jsonl` 上下文清单 + 子代理注入 + 每开发者 journal + 每会话活动任务指针 + 22 平台投影（含用户全部六个 harness）。但它的**门禁几乎全是软门禁**（`task.py start/archive` 不校验任何工件与测试），**研究可选**、**默认非 test-first**、**无决策记录/问题日志/需求 ID/功能级总结**、**无 CI 复跑**——这与用户四大痛点（P-01～P-04）一一对应，且 Trellis 自己的 0.5.0 迁移记录承认"面包屑里没提到的必做步骤，AI 会静默跳过"。许可证 AGPL-3.0-only，逐字复用需同许可。
2. **调研作为必经阶段**只有 Spec Kit（`/speckit.plan` Phase 0 生成 `research.md`，"Decision / Rationale / Alternatives considered" 三段式）与 GSD（每阶段 research 子代理 + `RESEARCH.md`）真正把它做成工件；BMAD 与 Trellis 把它做成可选步骤；Superpowers、OpenSpec、Kiro 基本没有。**逐条确认技术决策**没有一个框架原生支持——最接近的是 Kiro/cc-sdd 的阶段级审批与 Superpowers brainstorming 的"逐节确认设计"。
3. **测试硬度**：所有框架的 TDD/验证都停留在提示层（Superpowers "Iron Law"、Trellis `tdd` 变体、Spec Kit tasks 的 "Tests before implementation" 提示、BMAD TEA）；能被 CI 复跑的"硬门禁"只有 OpenSpec `openspec validate --strict`（只校验 spec 格式）与 Spec Kit 的 shell 脚本（只校验路径/前置条件）。**没有一个框架把"功能 ↔ 测试可追溯 + 测试证据"做成机器可校验的门禁**——这是本框架最大的差异化空间（R-03、R-09）。
4. **记录体系**：Agent OS 的 `decisions.md`、Spec Kit 的 `research.md`、compound-engineering 的 `docs/solutions/*.md`（教训沉淀 + 检索）、GSD 的 `STATE.md` decisions 表 + 每阶段 `SUMMARY.md`、Trellis 的 `break-loop` 五分类 + `update-spec` 六种记录模板、OpenSpec 的 delta spec（ADDED/MODIFIED/REMOVED）+ archive 是可组合的零件；没有框架同时具备"决策流水 + 问题日志闭环 + 功能级 handoff 总结 + 需求变更单"。
5. **跨 harness 分发**已收敛为两条路：(a) 单源模板 + 每平台 configurator 投影（Trellis 22 平台、Spec Kit 20+ agents、OpenSpec、BMAD、cc-sdd）；(b) 依赖 agentskills.io 的 `SKILL.md` + `.agents/skills/` 共享目录 + AGENTS.md（Superpowers 港口、Codex/Gemini/Kimi/DeepSeek Harness 原生读取）。六 harness 的 hook 能力差异巨大（Claude Code/OpenCode/Pi 有会话级 hook；Codex hook 需用户级开关+逐个批准；DeepSeek Harness 无 session-start hook；Grok Build class-2 pull-based），因此**任何"必做"步骤都不能依赖 hook 注入**，必须落到脚本/CI 可校验的工件状态。
6. **体量与代价**是社区批评的最大公约数：Superpowers（68M/120M tokens 案例、"asks obvious questions"）、BMAD（"too heavy"）、Spec Kit（过度生成任务、对 brownfield 不友好）、Trellis（SessionStart 一度 29 KB 被截断、Codex 每回合回显、需要 Python）。设计含义：**按任务分级（Spike/Bounded/Architectural 或 lightweight/complex）缩放工件，但不缩放审批与证据要求**。

## 1. 方法与信息源

- 本地：`@mindfoldhq/trellis@0.6.5` 全量模板与迁移清单（含 0.1.9→0.6.5 每版 changelog）、Superpowers 6.3.0 全部 14 个技能正文与 hook。
- 远端：GitHub 仓库/raw 文件/issues/discussions/releases、官方 docs 站、npm registry、HN/Reddit/dev.to/知乎/掘金/CSDN 等（由 6 个并行子流抓取；本会话 WebSearch 配额于研究后期耗尽，后期仅能用 WebFetch 直连已知 URL，凡未能二次核验之处均标 **unverified**）。
- 每条事实后附来源 URL 或本地路径；引文尽量保留英文原文。
## A. Trellis（基线，最重要）

### A.0 审计范围与方法

- 本地包：`C:\Users\NF3317\AppData\Roaming\npm\node_modules\@mindfoldhq\trellis\`（`@mindfoldhq/trellis` v0.6.5，安装日期 2026-07-02）及其依赖 `node_modules/@mindfoldhq/trellis-core` v0.6.5。模板并非嵌在 JS 里，而是明文文件位于 `dist/templates/`（共 1.7 MB、210 个模板文件（其中 108 个 `.md`，合计约 504 KB）），另有 `dist/migrations/manifests/*.json`（0.1.9 → 0.6.5 共 133 份迁移清单，内嵌每版 changelog）。以下所有"本地"结论均引自这些文件（访问日期 2026-08-17）。另核验（2026-08-21）：`trellis-core/dist/`（51 个 JS：channel/mem/task/testing SDK）**不含任何内嵌的 skill/command markdown**——全部模板均以明文存于 CLI 包 `dist/templates/`。
- 远端：GitHub 仓库、docs 站点、issues/discussions、社区评测由子流（S5）核验，见 A.9；marketplace 仓库（`mindfold-ai/marketplace`）的 `tdd` 工作流模板由本流直接 WebFetch 核验。
- 版本差异提示：本地 0.6.5（2026-07 初）与 npm 最新 **0.6.15（2026-08-14）** 之间有 10 个补丁版本；本地包无 Grok Build / DeepSeek Harness 目录，但 **0.6.8（2026-07-22）已加入 Grok Build（xAI CLI，`.grok/skills/` + `.grok/agents/`，class-2 pull-based）与 Kimi Code；0.6.15（2026-08-14）已加入 DeepSeek Harness（`trellis init --dsh`，写 `.agents/skills/` + `.dsh/skills/` + `.dsh/DSH.md`，无 session-start hook，research/implement/check 在主会话 inline 执行）**——即截至 2026-08-17 Trellis 已覆盖用户全部六个 harness（Claude Code、Codex、OpenCode、Pi、DeepSeek Harness、Grok Build），详见 A.10。（`--reasonix` 是另一个 DeepSeek 生态的第三方终端 agent "Reasonix"，与 DeepSeek Harness 不是一回事：DeepSeek API 文档把 "DeepSeek Harness" 与 "Reasonix" 列为两个独立集成，https://api-docs.deepseek.com/quick_start/agent_integrations/reasonix/ ，2026-08-17。）

### A.1 生命周期与命令/技能（v0.6.5 实测）

**三阶段状态机（`.trellis/workflow.md`，37 KB，"single source of truth"）**：

```
Phase 1: Plan    → 1.0 Create task [required·once]（须先获得"建任务同意"）
                   1.1 Requirement exploration [required·repeatable]（prd.md；复杂任务另需 design.md + implement.md）
                   1.2 Research [optional·repeatable]  ← 研究是可选步骤
                   1.3 Configure context [required·once]（curate implement.jsonl / check.jsonl）
                   1.4 Activate task [required·once]（"review gate, then task.py start"）
                   1.5 Completion criteria
Phase 2: Execute → 2.1 Implement [required·repeatable]  2.2 Quality check [required·repeatable]  2.3 Rollback [on demand]
Phase 3: Finish  → 3.2 Debug retrospective [on demand]  3.3 Spec update [required·once]  3.4 Commit changes [required·once]  3.5 Wrap-up reminder
```
（3.1 已在 0.6.1 并入 2.2/3.4，编号留空以免破坏外部引用——来源：`dist/migrations/manifests/0.6.1.json`。）

**技能/命令/子代理三类入口（`templates/common/`）**：

| 类型 | 名称 | 作用（摘自模板原文） |
|---|---|---|
| 自动触发 skill | `trellis-brainstorm` | "Interview me relentlessly … Ask the questions one at a time"；"Non-Negotiable Evidence Rule: If a question can be answered by exploring the codebase, explore the codebase instead"；每问必须含 recommended answer 与 trade-off；每答后立即更新 `prd.md`；First-Principles 分析框架；结束前必须做 "PRD Convergence Pass"（无损重写 prd.md）；"Do not start implementation until the user approves" |
| skill | `trellis-before-dev` | 无 sub-agent 平台在写码前读 prd/design/implement + spec index 的 "Pre-Development Checklist"（"This step is mandatory before writing any code"） |
| skill | `trellis-check` | 6 步清单：识别改动 → 读任务工件与 spec "Quality Check" 段 → 跑 lint/type-check/test → Checklist（Code Quality / Test Coverage：新函数→单测、bug 修复→回归测试 / Spec Sync）→ 跨层维度（数据流、复用、依赖、同层一致性）→ 报告并直接修复 |
| skill | `trellis-break-loop` | "Break the Loop"：根因五分类（Missing Spec / Cross-Layer Contract / Change Propagation Failure / Test Coverage Gap / Implicit Assumption）、"why fixes failed"、预防机制表、系统性扩展、知识沉淀；附 Bayesian Reasoning 框架；结尾强制 "MUST immediately update spec/guides … The analysis is worthless if it stays in chat" |
| skill | `trellis-update-spec` | "Code-Spec First Rule"：把学到的东西写成**可执行契约**（签名/契约/校验与错误矩阵/Good-Base-Bad 案例/所需测试/Wrong-vs-Correct 7 段模板）；提供 Design Decision / Convention / Pattern / Forbidden Pattern / Common Mistake / Gotcha 6 种记录模板 |
| 命令 | `/trellis:start`（仅无 hook 平台）、`/trellis:continue`、`/trellis:finish-work` | `continue` 按 `task.json.status` + 工件存在性路由到 Phase 步骤；`finish-work` = 归档任务 + `add_session.py` 写日志（**不**在此提交代码，若工作树脏则拒绝并退回 3.4） |
| 子代理 | `trellis-research` / `trellis-implement` / `trellis-check` | research：只写 `{TASK_DIR}/research/<topic>.md`，"Returning findings only through the chat reply is a failure"；implement：禁止 `git commit/push/merge`，结束跑 lint+typecheck；check：自修复 + lint/typecheck；三者均含"递归守卫"（子代理不得再派生子代理） |
| Codex 专属旧 skill | `onboard`、`record-session`、`improve-ut`、`check-cross-layer`、`create-command`、`integrate-skill` | 0.5.0 起在其他平台已退役（"Six commands + three sub-agents retired"），但 `templates/codex/skills/` 与 `templates/copilot/prompts/` 仍保留副本 |
| bundled 多文件 skill | `trellis-meta`、`trellis-spec-bootstrap`、`trellis-session-insight`、`trellis-channel` | 分发到每个平台 skill 根目录；`trellis-meta` 是"如何本地定制 Trellis"的自描述文档（12.6 KB + 26 个 references） |

**请求分诊（Request Triage，0.6.0 引入）**：无活动任务时，AI 必须先分类并**征得同意**再建任务；"User approval to create a task is not approval to start implementation"。

**审批点**：(1) 建任务同意；(2) 1.4 前"ask for review before `task.py start`"（复杂任务需 prd/design/implement 三件齐备并经用户审阅）；(3) 3.4 提交计划一次性确认（`Reply 'ok' / '行' to execute`）；(4) finish-work 归档其他"看似完成"任务时 `[y/N]`。**没有**逐条技术决策确认、没有需求基线签字、没有任务验收签字。

### A.2 `.trellis/` 文件布局（实测 + `trellis-meta` 参考文档）

```
.trellis/
├── workflow.md            # 流程真源（三阶段 + 路由 + [workflow-state:*] 面包屑块）
├── config.yaml            # session_commit_message / max_journal_lines(2000) / session_auto_commit /
│                          # hooks.after_{create,start,finish,archive} / packages(monorepo) / channel.worker_guard / codex.dispatch_mode
├── .developer             # 当前开发者身份（gitignored）
├── .version / .template-hashes.json / .runtime/sessions/<context-key>.json（每会话活动任务指针）
├── scripts/               # Python 运行时（task.py 500 行、add_session.py 567 行、get_context.py、common/*.py 共 7.3k 行）
├── agents/{check,implement}.md   # channel 运行时的平台无关角色卡
├── spec/<package>/<layer>/index.md + *.md ; spec/guides/*.md（thinking guides）
├── tasks/MM-DD-<slug>/{task.json, prd.md, design.md?, implement.md?, implement.jsonl, check.jsonl, research/}
│   └── archive/YYYY-MM/...
└── workspace/index.md ; workspace/<developer>/{index.md, journal-N.md}
```

- `task.json` 字段：id/name/title/status(planning|in_progress|review|completed)/priority(P0-P3)/creator/assignee/package/branch/base_branch/children/parent/commit/pr_url/meta/hooks（0.5 起"canonical 24-field shape"）。
- `prd.md` 默认骨架仅 Goal / Requirements(- TBD) / Acceptance Criteria(- [ ] TBD) / Notes 四段（`task_store.py::_default_prd_content`），**没有**需求 ID、优先级、EARS 或 Given-When-Then 约束——需求条目规范性完全依赖模型自觉。
- `implement.jsonl` / `check.jsonl`：`{"file": "...", "reason": "..."}` 逐行清单，"Include spec and research files. Do not include code files"，是子代理的上下文清单（context manifest）——这是 Trellis 对"上下文预算"的主要机制。
- 日志：`add_session.py` 写入 `## Session N: Title` + Summary / Main Changes / Git Commits / Testing / Status / Next Steps；满 2000 行滚动到 `journal-(N+1).md`；默认自动 `chore: record journal` 提交。

### A.3 多平台投影机制（16→17 平台）

- 单一模板源 `templates/common/{skills,commands,bundled-skills}` + 每平台 `configurators/<platform>.js` 适配（0.5.0 "Skill-first template architecture … Eliminates the prior N-copies-of-same-content drift"）。
- 占位符：`{{PYTHON_CMD}}`、`{{CMD_REF:name}}`（→ `/trellis:name` 或平台等价形式）、`{{CLI_FLAG}}`、条件块 `{{#AGENT_CAPABLE}}…{{/AGENT_CAPABLE}}`、`{{#HAS_HOOKS}}…`；`workflow.md` 内以 `[Claude Code, Cursor, …] … [/Claude Code, …]` 平台标签块区分"sub-agent 派发平台"与"inline 平台"，`get_context.py --mode phase --step X.Y --platform <flag>` 按平台过滤后返回。
- 三种集成模式（`platform-files/overview.md`）：(1) Hook/Extension 驱动（Claude/Cursor/OpenCode/Kiro/CodeBuddy/Droid/Pi：SessionStart 注入 + UserPromptSubmit 面包屑 + PreToolUse(Task/Agent) 向子代理注入 jsonl 所列文件）；(2) Agent Prelude / Pull-based（Codex/Copilot/Gemini/Qoder/ZCode/Reasonix/Trae：子代理定义自带"先读 `Active task:` 路径 → jsonl → prd/design/implement"指令，因为这些平台的 hook 无法改写子代理提示，见 0.5.0-beta.0 manifest 引用的 Copilot #2392/#2540、Gemini #18128）；(3) Main-session workflow（Kilo/Antigravity/Devin：仅 workflows/skills）。
- 平台矩阵（v0.6.5 `platform-map.md`）：Claude Code、Cursor、OpenCode、Codex、Kilo、Kiro、Gemini CLI、Antigravity、Devin(原 Windsurf)、Qoder、CodeBuddy、GitHub Copilot、Factory Droid、Pi Agent、Trae、Reasonix、ZCode；iFlow 已于 0.5.0 移除。共享层 `.agents/skills/`（agentskills.io 标准目录，Codex/Gemini CLI 0.40+ 等可读）+ `AGENTS.md` 中 `<!-- TRELLIS:START/END -->` 受管块。
- Codex 特殊性：默认 `codex.dispatch_mode: inline`（因 Codex 子代理 `fork_turns="none"` 隔离拿不到父会话任务上下文）；hooks 需用户级 `[features].hooks = true` 且 0.129+ 需 `/hooks` TUI 逐个批准；SessionStart 上下文会每回合打印到终端（上游 #191）。
- Pi：`.pi/extensions/trellis/index.ts` 提供原生 `trellis_subagent` 工具（single/parallel/chain）；因 Pi `session_start` 只读通知，改在首个 `before_agent_start` 注入（0.6.5）。

### A.4 上下文注入与体积（token 预算相关）

- SessionStart（startup/clear/compact 三个 matcher 均触发）注入：`<session-context>` + `<first-reply-notice>`（硬编码"用中文说一次 Trellis 上下文已加载"）+ `<current-state>`（Developer/Git/Current task/Active tasks 数/Journal 行数/Spec index 数）+ `<trellis-workflow>`（仅 `## Phase Index` 段，剔除面包屑块后约 5.2 KB ≈ 1.3k tokens）+ `<guidelines>`（spec index 路径列表）+ `<task-status>`（状态 + 工件存在性 + Next-Action）。历史：0.4.0-rc 前 SessionStart 曾达 ~29 KB 超过 Claude Code ~20 KB 截断阈值导致"Task state was being silently lost"，0.4.0 降到 ~7 KB，0.5.0 又升到 16.7 KB（内联三阶段步骤正文），当前版本回到"仅 Phase Index + 按需 `get_context.py --mode phase --step`"。
- UserPromptSubmit 面包屑 `<workflow-state>`：每回合 <200 字节～930 字节（`in_progress` 块 930 字符最大）。
- 子代理注入：`inject-subagent-context.py` 把 jsonl 所列全部文件 + prd/design/implement 全文塞进子代理提示，`research/` 目录最多读 20 个 md；无总量上限（只靠"不要把代码文件放进 jsonl"约束）。

### A.5 研究、测试与"门禁"硬度（关键发现）

- **研究可选**：`1.2 Research [optional · repeatable]`；1.5 完成标准中 `research/` 仅 "recommended"。brainstorm 的"证据规则"要求先查代码库再问用户，但**没有**"设计前必须做外部技术调研并逐条确认"的步骤。
- **测试不是 test-first**（默认 `native` 工作流）：implement 子代理只要求跑 lint + typecheck；check 清单中"Tests pass? / New function → unit test added? / Bug fix → regression test added?" 是勾选提示。**marketplace 的 `tdd` 工作流变体**（`trellis init --workflow tdd`）才要求 "Write one failing test … The test must fail for the right reason before implementation starts … Do not write all tests first and do not implement multiple behaviors before seeing a failing test"，2.2 增加 "Verify each completed behavior has a test that fails without the implementation"（来源：`raw.githubusercontent.com/mindfold-ai/marketplace/main/workflows/tdd/workflow.md`，2026-08-17）。但即使 tdd 变体也没有脚本核验测试证据。
- **门禁全部是软门禁**：实测 `task.py start` 只把 status 由 planning 翻为 in_progress（无会话身份时进入 degraded mode 仍照翻），**不检查** prd/design/implement 是否存在或经审阅；`task.py archive` 只改 status=completed 并移目录 + 自动提交，**不检查**测试/验收标准；唯一的脚本级校验是可选的 `task.py validate <task>`（只验证 jsonl 语法与文件存在）与 session-start 里的 "jsonl 是否含真实条目" 判定。因此 workflow.md 中大量 "must / required / ready gate" 措辞的实际执行者是模型自身 + 每回合面包屑提醒——这正是 0.5.0-beta.0 manifest 自述的教训："if a mandatory step isn't mentioned there [breadcrumb], the AI silently skips it (Phase 1 planning gate skip and Phase 3.4 commit skip both manifested via this gap)"。
- **CI 不可复跑**：无任何 CI 工作流模板；`worktree.yaml` 的 `pre_merge` 检查在 0.5.0 随 Multi-Agent Pipeline 一起删除（"`.trellis/scripts/multi_agent/`, `worktree.yaml`, and the Ralph Loop hook have been removed"），但 `templates/copilot/prompts/parallel.prompt.md` 仍引用已不存在的 `.trellis/scripts/multi_agent/plan.py`（陈旧模板，实测）。

### A.6 记录体系（决策 / 问题 / 教训）

- 决策：无 ADR 目录；`update-spec` 提供 "Design Decision" 模板（Context / Options Considered / Decision / Example / Extensibility）但写入位置是 spec 文件里的一节，与规范混排；brainstorm 时的取舍只留在 `prd.md` 或对话（`trellis-session-insight` 明言 "the decision lives in an old brainstorm, not in any prd.md / spec/" 是常见情形，须靠 `trellis mem search` 去翻原始对话日志）。
- 问题/教训：`break-loop` 输出结构化分析并要求立即写入 spec/guides，但**触发条件是"同一 bug 修了多次"且 on-demand**；无问题日志（issue log）文件、无编号、无闭环状态。
- 会话记录：journal 逐会话追加，按开发者分文件；**没有按功能/任务的完成总结**（归档只是移动目录，prd.md 停留在需求态，不回写"实际做了什么/为什么/剩余"）；`workspace/index.md` 模板要求 "All documentation must be written in English"。
- 需求变更：workflow 规定 "Return to this step [1.1] whenever requirements change and revise the relevant artifact"，无变更单/影响评估/版本号。

### A.7 多开发者 / 多代理

- 开发者身份：`trellis init -u <name>` → `.trellis/.developer`（gitignored）+ `workspace/<name>/`；克隆已有 Trellis 项目时自动生成 `00-join-<slug>` 引导任务（0.5.0）。
- 活动任务指针从全局 `.current-task` 改为每会话 `.runtime/sessions/<context-key>.json`（0.5.0），"Parallel windows no longer stomp each other's active task"；context key 来源因平台而异（Claude `CLAUDE_ENV_FILE`、Codex `CODEX_SESSION_ID`、Cursor shell tickets 等），Windows + Claude Code、`--continue`、fork 场景常拿不到 → degraded。
- 多代理：v0.6 `trellis channel`（`~/.trellis/channels/<project>/<channel>/events.jsonl` 事件溯源；forum/thread；spawn/kill/wait/run；OOM guard idle 5m / max 6 workers；Claude stream-json 与 Codex app-server 适配器）；`trellis mem` 读取 `~/.claude/projects/`、`~/.codex/sessions/`、`~/.pi/agent/sessions/` 原始对话做跨会话检索（OpenCode 适配器 0.6 线降级）。channel 是"重型可选"，skill 自己写 "Channels are heavier than a single Bash call … Use them only when …"。
- 合并纪律：`task.py create-pr`、`set-branch/set-base-branch` 存在；worktree 支持交给各平台原生能力。

### A.8 体量与依赖

- 安装占用：`.trellis/scripts` 约 7.3k 行 Python + 每平台目录（Claude：agents 3 + hooks 4 个 .py + settings.json + commands 2-3 + skills 5 + bundled skills 4 套 38 个 md）；模板总量 1.7 MB。
- 运行依赖 Node ≥ 18 **且 Python ≥ 3.9**（README "Prerequisites"）；Windows 有专门的 GBK/UTF-8 与 MSYS 路径修补代码，说明踩过坑（0.4.0 "statusline.py GBK encoding crash"、`_normalize_windows_shell_path`）。
- 每回合固定开销小（面包屑 <1 KB），但子代理注入无上限。

### A.9 许可证

- `package.json`: `"license": "AGPL-3.0-only"`；`trellis-core` 亦为 AGPL-3.0-only；README 徽章 "license AGPL-3.0"。含义（非法律意见）：CLI 与模板文本受 AGPL 约束；`trellis init` 把模板（skills/hooks/scripts/workflow.md）逐字复制进用户仓库——若新框架**逐字复用**这些文本或 Python 脚本，需以 AGPL-3.0 分发；仅借鉴机制/结构（思想）不受版权约束。建议新框架采用 clean-room 重写并另择许可。

### A.10 本地版本之后的演进（0.6.6 → 0.6.15，来源 docs.trytrellis.app/changelog/v0.6.x.md，2026-08-17）

| 版本 / 日期 | 与本设计相关的变化 |
|---|---|
| 0.6.6 / 2026-07-09 | 新平台 Oh My Pi（`.omp/`）；`task.py create --no-start`（建 backlog 不激活）；Codex inline 不再收到 seed-only JSONL |
| 0.6.7 / 2026-07-13 | 破坏性命令守卫：`trellis uninstall` 拒绝在有未提交文件时无人值守删除、`task.py archive` 校验真实任务目录、`trellis update` 迁移时保留 journal；状态/模板写入改原子操作 |
| 0.6.8 / 2026-07-22 | **新平台 Grok Build（xAI CLI，`.grok/skills/`、`.grok/agents/`，class-2 pull-based）与 Kimi Code**；Codex 原生 sub-agent 派发 trellis-implement/check/research；机器可读状态 `trellis platforms --json`、`task.py list --json`；`channel spawn --sandbox <read-only|workspace-write|danger-full-access>`；建任务自动写 `base_branch`；Pi 用户需 `trellis update --migrate`（`.pi/skills/` → `.agents/skills/`） |
| 0.6.9 / 2026-07-24 | 新平台 Snow CLI；**上下文注入封顶：单文件 32 KiB / 单工件 64 KiB / 总计 128 KiB**（此前无上限）；`no-trellis` 关键词可静音每回合注入；`task.py` 新增可重复 `--change/--test/--next-step` 与 `set-meta`；journal 冲突用 `.gitattributes merge=union` 解决 |
| 0.6.10 / 2026-07-28 | Python 3.9–3.11 兼容修复；Codex 子代理读取被截断 hook 输出的恢复 |
| 0.6.11 / 2026-07-30 | Pi 子代理默认继承调用会话模型；GBK 主机 UTF-8 解码；git 仓库探测限 8 个/2 秒 |
| 0.6.12 / 2026-08-01 | Pi 会话身份改用 Pi 原生 session ID（#512/#513） |
| 0.6.13 / 2026-08-06 | shell-ticket 会话桥接扩到 6 个平台；bundled skill 根目录 15 → 21 |
| 0.6.14 / 2026-08-06 | `trellis mem --platform grok`；mem 返回带 compaction 标记的压缩对话；修复 CodeBuddy/ZCode/Trae "task.py start 成功但后续回合仍说无活动任务" |
| 0.6.15 / 2026-08-14 | **新平台 DeepSeek Harness（第 22 个）`trellis init --dsh`**：`.agents/skills/`（共享 workflow + bundled skills）+ `.dsh/skills/`（`trellis-start`/`trellis-continue`/`trellis-finish-work` 三个用户可调用入口 skill）+ `.dsh/DSH.md`；"The default web and headless profiles ship no session-start hook, so `trellis-start` stays a skill you invoke rather than something that fires automatically"；research/implement/check 在主会话 inline 执行；sub-agent 派发平台数保持 18 |

GitHub 仓库现状（api.github.com/repos/mindfold-ai/Trellis，2026-08-17）：stars 13,971、forks 779、open issues 39、license AGPL-3.0、created 2026-01-26、最近 push 2026-08-17，描述 "The best agent harness."。npm `@mindfoldhq/trellis@latest` = 0.6.15（registry.npmjs.org，2026-08-17）。
### A.11 外部审计补充：仓库、文档、issues 与社区（子流 S5，2026-08-17）

**仓库与许可**：56 位贡献者，但 taosu0216 一人 112 次提交（VinciWu557 16、SamCuipogobongo 15…）——单一主维护者；issues 280 条（28 open）、PR 174；npm 164 个版本（0.1.0 于 2026-01-15）、`beta` 通道已到 **0.7.0-beta.3（2026-08-06）**；两个 npm 包均 `AGPL-3.0-only`，COPYRIGHT "Copyright (C) 2026 Mindfold LLC"，无双许可文件；docs 架构页明示："Trellis is AGPL-3.0 licensed. Internal team use is permitted. Commercial use of a Trellis-derived product or service requires prior contact: klein@mindfold.ai"。仓库自食（dogfood）：`.trellis/` 内 230 个已归档任务，其中仅 **42 个有 `research/`（18%）、29 个有 `design.md`/`implement.md`、222 个有 `prd.md`**——研究与设计工件在维护者自己的使用中也是少数。

**0.7 beta 方向**：dynamic spec loading（spec 的 YAML frontmatter `paths:` glob，在 Claude 的 `PostToolUse` Read/Edit/Write、Codex 的 `PreToolUse apply_patch`、OpenCode 插件上按被触碰文件投递规则）+ dynamic workflow switching（`.trellis/workflows/<id>.md`，优先级 task pin → 个人 `.developer` → 团队 `default_workflow` → 全局 `workflow.md`；`trellis workflow create`）。发布节奏 3–7 天一个补丁；六周内两个破坏性 minor（0.5、0.6）均要求 `trellis update --migrate`（0.5.0 含 138 条删除迁移）。

**FAQ 自承**（docs Appendix F）：Q22 每任务三次提交（work + `chore(task): archive` + `chore: record journal`）；Q23 "AI sometimes skips the Trellis flow … known cross-model failure … reduces it but doesn't eliminate it"；Q33/34 不要与 Superpowers/OpenSpec/OMO 同装。Roadmap 自承 "Today brainstorm asks shallow questions too easily"。

**issues / discussions 痛点地图（约 80% 标题为中文）**：
- 上下文膨胀/静默截断：#154 SessionStart 超过 Claude `additionalContext` 上限（0.4.0 修）、#251 升级后每回合都注入、#256/#274 OpenCode 重复注入、#441/#464 jsonl 引用文件无上限内联致 "SessionStart context balloons"（0.6.9 加封顶）、#553（open）；Discussion "Token消耗过快"（2026-07-03 无人答）、"trellis 现在在项目中过于重了 考虑优化"（2026-07-23）。
- 需求/规划太浅或走偏：#145 "PRD needs a technical design, this seems weak"、#260 "why no design document before coding?"、#197、#320 PRD 多轮冗余 → convergence pass、#417/#416 加强澄清与审批门（0.6.8 "Brainstorm requires explicit planning approval before task creation"）、#292 措辞不清致 agent 跳过 jsonl 策展、#514（open）agent 不推荐建任务时就不问、#182 "task standard spec?"、#263。
- AI 无视流程：#195 "Claude Code doesn't read skills eagerly"、#184 Cursor 有时不触发、#302 主 agent 自己干活不派发（根因：Exa MCP 工具名导致 agent 静默注册失败）、#355 Pi 很少自动建任务、#537（open）ZCode 类平台误用 Skill 而非 Agent、Discussion "Claude code cli里几乎不会触发Trellis这正常吗？"（06-26）。
- check 质量：#521 "trellis-check may induce premature abstraction and out-of-scope auto-fix"（加了 scope-discipline 清单）、#522（open）before-dev 加最小改动确认、#243 check 很慢、#217 "0.5 feels slow, forced process"。
- 记录/日志/多人冲突：#284 workspace 自动提交在每次分支合并都冲突、#303 journal 提交扫入其他并行任务文件、#415（open）worktree 并行 → 会话/日志冲突（0.6.9 `merge=union` 部分修，维护者自己的 journal-5.md 出现乱序合并）、#511（open）`task.py create/start` 静默替换进行中的活动任务、#549（open）`TRELLIS_CONTEXT_ID` 跨嵌套会话继承、**#326 "add a task progress file"（关闭/推迟）、#339（open）按任务记录 agent 会话 id、#288 记录原始需求与关键问答、#379（open）API 变更通知文件**。
- worktree：#141（13 评论）hook 相对路径在 `.claude/worktrees/` 下失效、#328、#385、#546（open）"Hook registration still uses relative paths in 0.6.5 — hard-blocks prompts under Claude Code native worktrees"；Discussion "如何结合worktree进行并行任务开发"（07-28 无人答）。
- Windows/Python：#218 `python3` 找不到（9 评论）、#226 Git-Bash `/d/` 路径、#190/#483 GBK、#426 子代理中文乱码、#476 f-string 破坏 3.10/3.11、#113 3.9、#503（open）Python 命令按 OS 硬编码导致跨 OS 共享失败。
- Codex/OpenCode 平权：#191 Codex 每回合打印 hook 上下文、#234/#237/#240/#241/#242/#250 子代理递归与 `wait_agent` 死锁、#298 Codex Desktop hook 错误、#294/#306 config.toml 被新版拒绝、#372 Trellis 禁用了 Codex 子代理、#386/#444 0.6.8 终于可用、#459 子代理继承主模型致 token 爆炸；#211/#212/#264/#275/#336 OpenCode 研究不能写/无 session-start/无上下文/agent 文件无效。
- 迁移/升级：#57、#215、#267（0.5.10 无 `trellis-start`、无自动注入）、#340 `update --tag latest` 升不到 0.6、#500、#323、#383。
- 功能请求暴露的缺口：#193（open，14 评论）中文本地化、#111 TDD、#126/#94 多模型编排、#270/#287/#172 多仓库、#446（open）并行任务改进、#370（open）可配置子代理注入、#530（open）可逆消融、#525（open）config.yaml 生命周期 hook 以完整环境执行 shell（安全）。
- Discussions 14 帖（2026-06/07/08，多数无人回复）。未发现关于 AGPL 的 issue（最早约 38 条未取到，unverified）。

**社区评测**：英文——HN 无任何相关帖（Algolia "trellis mindfold"/"trytrellis" 零结果）；Reddit/X 无法抓取（unverified）；社区几乎全中文（README_CN 提供微信/飞书/QQ 群，"L站" = linux.do）。中文（掘金/CSDN）：
1. 洛卡卡了《grill-me、Trellis、Superpowers：不同场景下怎么用？》（2026-05-11，8,272 阅读）：Trellis 是"长任务执行器和流程接力"，不是需求澄清器；grill-me 问 20+ 个问题 vs Trellis brainstorm 7–8 个；linux.do 共识 "grill-me + Trellis 比 Superpowers 轻"；不要一回合跑两个流程框架。
2. 洛卡卡了《从 vibe coding 到 spec coding：我用 Trellis 的实践总结》（2026-07-27）：赞跨平台共享核心与 finish/update-spec 闭环；成本：要学 `.trellis/`，plan/execute/finish "更稳但更慢"，spec 需人维护（"不是魔法"），任务粒度难拿捏，平台体验参差；结论：长期多人项目用，脚本/小项目不用。
3. canonical_entropy《任务级工具 vs 轨迹级方法论：Trellis、OpenSpec 与 AGE 的根本分歧》（2026-06-07，作者推广 AGE）：最尖锐——Trellis 知识"一次性沉进散文 spec；同一错误再犯时没有升级路径"；spec 与历史混杂（Design Decision/Common Mistake 模板把历史塞进 spec；没有 `bugs/`/`lessons/` 目录）；"下一个任务看不到上一个任务做了什么、为什么、否决了什么"（归档 + 2000 行日志滚动）；OpenSpec 用 Zod schema 校验 spec 而 Trellis spec 是自由 Markdown；任务级而非仓库级真源；break-loop 五维度被赞为独有。
4. hypoy《先拷问，再开工：grill-me + Trellis 重塑我的 Claude Code 工作流》（2026-06-12）："AI runs off with wrong assumptions" → 先 grill-me 后 Trellis；正面。
5. 其他：《Trellis 从 0 到 1 实战指南》（06-11，Windows 坑）；《每日一个开源项目：Trellis》（06-29，正面概览）；《Trellis vs Context Mode 深度对比》（03-25，互补）；《grill-me、Trellis、Superpowers 到底该用哪个？》（05-11，同分层）；CSDN 两篇安装/概览。

**对四大痛点的判定（S5 结论 + 本地核验一致）**：

| 痛点 | Trellis 现状 | 判定 |
|---|---|---|
| P-01 需求/调研太浅 | 流程规则强（一次一问、证据优先、收敛、审批门）但**无内容 schema**；研究 `[optional]` 且极少发生（维护者自己 18%）；design/implement 仅当 AI 判定"复杂"；roadmap 自承 brainstorm 太浅；社区在前面叠 grill-me | 结构性弱点，非措辞问题 |
| P-02 记录不成体系、错误重复 | journal 是按开发者的**会话**流水（title/summary/commits/testing/next steps），2000 行滚动，启动不注入内容，易冲突（#284/#303/#415）；update-spec 写自由散文无复发追踪；break-loop 仅 on-demand；研究笔记不流向后续任务；`trellis mem` 是单机聊天日志检索而非团队记忆（roadmap v0.7 "team-level memory — strongest repeat signal"） | 弱点确认；AGE 批评"同一错误再犯时没有升级路径"最切中 |
| P-03 功能/需求不规范 | 任务 = 目录 + `task.json`（24 字段，若干占位未用）+ 自由 Markdown `prd.md`；无 PRD 段落/验收标准校验；父子任务"不是依赖系统"；用户要求任务标准（#182/#263/#326） | 弱点确认；缺 OpenSpec 式结构化需求 |
| P-04 缺功能级 handoff | 无。`finish-work` 原样归档任务目录并向开发者日志追加**会话**条目；任务内无 `summary.md`/handoff；#326/#339/#288 正是此需求，被推迟 | 缺口确认 |
## B. GitHub Spec Kit（github/spec-kit，`specify` CLI）

**基本面（2026-08-17 核验，子流 S1 实装 0.16.4 验证）**：MIT；129,645 stars / 11,603 forks / 339 open issues；最新 **v0.16.4（2026-08-14）**，2026-07-22～08-14 间 15 个 release；2026 年重大演进：extension 系统（0.0.93）、preset 系统（0.3.0）、**workflow engine + gates（0.7.0）**、`--ai` 弃用改 `--integration`（0.7.1）、`/speckit.converge`（0.11.0）、Copilot 默认 skills 化（0.16.0，breaking）。Thoughtworks Radar 2026-04：Assess（"instruction bloat and context rot"）。

**阶段与工件**：10 个命令模板 `templates/commands/*.md`：`speckit.constitution → specify → clarify → plan → checklist → tasks → analyze → implement → converge`（另 `taskstoissues`）；文档称只有 `specify` 是 `plan` 的硬前置，clarify/checklist/analyze 是"你自己加的质量门"。生成布局（真实 `specify init --integration claude --script sh`：30 文件 / 234 KB）：`.specify/{memory/constitution.md, templates/*.md, scripts/bash/*.sh, workflows/speckit/workflow.yml, integrations/*.manifest.json(每文件 SHA-256), feature.json(本机、gitignored)}` + `.claude/skills/speckit-*/SKILL.md ×10` + `specs/NNN-short-name/{spec.md, checklists/requirements.md, plan.md, research.md, data-model.md, contracts/, quickstart.md, tasks.md}`。git 分支步骤已抽成可选 `git` extension。

**调研（关键）**：`/speckit.plan` 的 Phase 0 在**措辞上是必做**："Fill Technical Context (mark unknowns as 'NEEDS CLARIFICATION') … Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)"、"For each NEEDS CLARIFICATION -> research task / For each dependency -> best practices task / For each integration -> patterns task"、"Generate and dispatch research agents"，汇总为 **"Decision / Rationale / Alternatives considered"** 三段式；"ERROR on gate failures or unresolved clarifications"。但**没有脚本检查 research.md 是否存在或决策是否经用户确认**（`check-prerequisites.sh` 只把它列进 `AVAILABLE_DOCS`）。

**澄清预算**：`/specify` 最多 3 个 `[NEEDS CLARIFICATION]` 标记，按 "scope > security/privacy > user experience > technical details" 排序，剩余问题一次性以 ≤3 张选项表提出；`/clarify` 用固定分类学（Functional Scope / Domain & Data Model / Interaction & UX / Non-Functional / Integration / Edge Cases / Constraints / Terminology / Completion Signals / Misc）逐项标 Clear/Partial/Missing，"Maximum of 5 total questions across the whole session"，超过时按 "(Impact * Uncertainty)" 取前 5，"Present EXACTLY ONE question at a time"，选择题必须给 "**Recommended:** Option [X] - <reasoning>"；答案增量写回：新建 `## Clarifications / ### Session YYYY-MM-DD`，追加 "`- Q: <question> → A: <final answer>`"，再回填到所属章节（FR / User Stories / Data Model / Success Criteria / Edge Cases / terminology），"Save the spec file AFTER each integration"；结束重评 `checklists/requirements.md`（如 "12/16 → 15/16 items passing"）。#617 请求提高 5 问上限（open, stale）。

**Constitution 门**：plan 模板 "## Constitution Check — *GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*" + "## Complexity Tracking — Fill ONLY if Constitution Check has violations that must be justified | Violation | Why Needed | Simpler Alternative Rejected Because |"；PR #3790 后 constitution 不再复制进模板而是运行时读取（"The governed templates carry a pointer, not a copy"）；`/constitution` 强制 semver、ISO 日期与 "Sync Impact Report"。

**analyze / checklist / converge**：`/analyze` "STRICTLY READ-ONLY"，六类检查（Duplication / Ambiguity（"vague adjectives (fast, scalable, secure, intuitive, robust)"）/ Underspecification / Constitution Alignment / Coverage Gaps（"Requirements with zero associated tasks / Tasks with no mapped requirement"）/ Inconsistency），四级严重度（CRITICAL 违反 constitution MUST 或需求零覆盖…；HIGH；MEDIUM；LOW），≤50 条，只建议不改。`/checklist`："Checklists are UNIT TESTS FOR REQUIREMENTS WRITING … NOT 'Verify the button clicks correctly'"，生成项不得预打勾，`[x]` 由评审者所有。`/converge`（2026 新）"APPEND-ONLY, NEVER REWRITE"：对比代码与 spec/plan/tasks，缺口分类 `missing | partial | contradicts | unrequested`，追加 `## Phase N: Convergence` 任务，已收敛时 tasks.md 字节不变。

**人审位置**：spec 歧义（选项表 / 一问一答）；implement 前若 checklist 有未勾项 "**STOP** and ask: 'Some checklists have unchecked items. Do you want to proceed with implementation anyway? (yes/no)'"；analyze 修复须显式批准——以上均提示层。**引擎级硬门**只在 `specify workflow run` 驱动时存在：`workflows/speckit/workflow.yml` 中 `type: gate`（"Review the generated spec before planning." `options: [approve, reject]`, `on_reject: abort`），运行状态持久化到 `.specify/workflows/runs/<id>/{state.json,inputs.json,log.jsonl}`，`specify workflow resume <run_id> --input spec_verdict=approve` 续跑。每任务计划审批核心无，社区 `plan-review-gate`（spec/plan 须经 PR 合并才能 `/tasks`）、`spec-validate`（implement 前硬门）扩展补位。

**测试硬度**：核心**默认非 test-first**："**Tests are OPTIONAL**: Only generate test tasks if explicitly requested in the feature specification or if user requests TDD approach"；模板 "Tests for User Story 1 (OPTIONAL - only if tests requested) ⚠️ NOTE: Write these tests FIRST, ensure they FAIL before implementation"；`implement` "Follow TDD approach … Halt execution if any non-parallel task fails … mark the task off as [X]"。方法论文章仍宣传 "Article III: Test-First Imperative … NON-NEGOTIABLE"（宣言与模板不一致）。脚本硬检查仅：feature dir / plan.md / tasks.md 存在性、模板解析；**不跑测试、不核对 `[X]` 与代码**。社区扩展 `tdd`（每轮红绿证据，"the audit re-checks it against git history rather than taking the log's word for it"、mutation testing）、`verify-tasks`（"Detect phantom completions: tasks marked [X] … with no real implementation"）、`gates`（策略文件 + hooks/git/CI 统一 verify 入口）、`ci-guard`、`trace`。

**记录与变更**：决策散落在 `research.md`（Decision/Rationale/Alternatives）、`plan.md`（Structure Decision、Complexity Tracking）、`spec.md`（`## Clarifications` 会话日志、`## Assumptions`）、constitution Sync Impact Report；核心无 ADR/教训机制（社区 `adrkit`、`arch-governance`、`retrospective`、`intent`）。需求变更核心无 `/update`：文档定义 Flow-Back / Flow-Forward（每次变更新建 feature dir）/ Living Spec 三种"团队约定"（"The model is a team convention, not a CLI setting"）；史上最高票 issue #1191（115 反应，"Can't Easily Update or Refine Existing Specs"）以把社区 `refine` 扩展加入目录关闭（PR #2118，2026-04-08）。

**交接/状态**：`.specify/feature.json` 当前 feature 指针（gitignored，"machine-local state — rewritten on every feature switch"）；进度只存在于 tasks.md 的 `[X]`；**无会话交接或功能总结工件**（文档建议 "`/speckit.implement only execute tasks T001-T010, then stop`" 或子代理）；workflow engine run 状态可恢复。

**多代理/多开发者/分发**：`specify integration list` 实测 **39 个集成**（含 claude、codex、opencode、pi、grok、kiro-cli、gemini、copilot、cursor-agent、kimi、omp、zcode、hermes、goose、zed、generic…；2026 退役 Roo/Windsurf/iflow；**无 DeepSeek Harness**，可用 `generic --commands-dir`）。机制："single template, many renderers"：每 agent 一个 Python `IntegrationBase` 子类（Markdown/Toml/Yaml/Skills），安装时把同一套 10 个命令模板渲染成 `.claude/skills/speckit-*/SKILL.md`、`.agents/skills/`（Codex/Zed）、`.github/skills/`、`.opencode/commands/speckit.*.md`、`.gemini/commands/*.toml`、`.pi/prompts`、`.grok/skills` 等；替换 `{SCRIPT}`（sh/ps/py 三套脚本行为一致）、`__SPECKIT_COMMAND_X__`、`$ARGUMENTS`；每文件 SHA-256 记入 manifest 以便升级/卸载保留用户改动；0.8.5 起支持同仓库多 agent（"multi-install safe" 24 个）。多人：tasks 有 `[P]` 并行标记与 "Parallel Team Strategy: Developer A/B/C"；`feature.json` 每 checkout 独立；顺序编号跨分支会撞号（#1066/#1165）；无锁/无任务归属（社区 `worktrees`、`orchestrator`、`team-assign`）。

**体量**：10 个命令提示 134 KB ≈ **33k tokens**（specify 4.6k、clarify 4.8k、checklist 5.6k…），其中 **28% 是重复的 extension-hook 样板**（每命令 ~3.6 KB）；模板 22 KB；#1401（open）称 "context tax"；Eberhardt 案例：689 行代码对应 2,577 行 markdown、33.5 分钟 agent 时间 + 3.5 小时评审。

**失败模式**：Böckeler（martinfowler.com）"a LOT of markdown files … repetitive … very verbose and tedious to review"、agent 不遵守指令、属 spec-first 而非 spec-anchored；Discussion #1784 "hundreds of unnecessary tests, most of which make no sense"；#1191 无法就地迭代；brownfield 困难（#164/#916/#1436，"defensive fabrication"）；constitution 与 CLAUDE.md 混淆（#609）；Codex `/clarify` 不问直接给推荐（#1147）；中文：掘金 SuperSpec 作者列 14 个痛点（"命令占用大量 token，严重挤占上下文窗口"、"制造'工作幻觉'"、"无法更新/迭代已有 spec"、"忽略现有项目结构和约定"、"自动生成大量无用测试"、"无上下文恢复流程"）；三剑客对比（32k 阅读）建议 Spec-Kit 只用于 greenfield/复杂/受监管/大团队。

**值得采纳**：有界且排序的澄清（≤3 标记 / ≤5 问 / Impact×Uncertainty / 一次一问带推荐 / 写回所属章节 + 日期化 Clarifications 日志）；`research.md` 的 Decision/Rationale/Alternatives 三段式作为设计前决策记录；Complexity Tracking 强制为违规辩护；只读 `analyze` 的稳定 finding ID + 严重度阶梯 + 需求→任务覆盖矩阵；需求质量清单由评审者所有并在 implement 前显式停问；`- [ ] T### [P] [US#] 描述 + 文件路径` 任务语法与 per-user-story "Independent Test"；append-only `converge`（含 `unrequested` 缺口）；hash 追踪的多 agent 安装；workflow engine 的持久化门与 `verdict_input`（CI 友好的 approve/reject）；一份 `{SCRIPT}` 契约三套脚本。
**应避免**：把门禁/TDD/"ERROR on unresolved" 只写成散文；测试默认可选却宣传 test-first；33k tokens 命令与 28% 样板重复；数月无就地修订/变更管理路径且无会话/功能总结；工件体量数倍于代码；把 feature 身份耦合到 git 分支（2026 才用 `feature.json` 解耦）；用未验证的社区扩展关闭最高票 issue。
## C. BMAD Method（bmad-code-org/BMAD-METHOD）

**基本面（2026-08-17 核验，子流 S2）**：最新 **v6.11.0（2026-08-10）**（v6.0.0 stable 2026-02-17；约月更 minor：6.1.0 03-13 … 6.10.0 07-03；已预告 "v7 cut" 移除全部 `v6-shims`）；51,977 stars / 5,938 forks；MIT（"BMad"/"BMAD-METHOD" 为 BMad Code, LLC 商标）；npm `bmad-method` 6.11.0，Node ≥ 20.12，**v6.11.0 起 `uv` + Python 3.11 成为渲染技能的硬依赖**（`bmad-build` 无 `uv` 即停）；docs.bmad-method.org（en/zh-cn/fr/cs/vi-vn）。v6.1.0 起 "everything is a skill"（Agent-Skills `SKILL.md` 目录）；`.claude-plugin/marketplace.json` 列 28 个技能。

**架构（当前）**：模块 **core**（8 技能：`bmad-help`、`bmad-advanced-elicitation`、`bmad-review`、`bmad-customize`、`bmad-brainstorming`、`bmad-deep-recon`、`bmad-forge-idea`、`bmad-party-mode`）+ **bmm**（5 个 agent 技能 + `plan/`：`bmad-product-brief`、`bmad-prfaq`、`bmad-prd`、`bmad-ux`、`bmad-spec`、`bmad-architecture`、`bmad-create-epics-and-stories`、`bmad-project-context`、`bmad-sprint-planning`；`ship/`：**`bmad-build`**、`bmad-build-auto`、`bmad-code-review`、`bmad-checkpoint-preview`、`bmad-correct-course`、`bmad-retrospective`、`bmad-qa-generate-e2e-tests`；13 个 v6 shim 如 `bmad-create-story`/`bmad-dev-story`/`bmad-quick-dev`/`bmad-document-project`）+ 外部官方模块 BMB（builder）、CIS、**TEA**（Test Architect，v1.23.1 2026-08-16）、GDS、**BMad Loop**（"deterministic ralph-loop orchestrator"）。命名 agent 缩减为 5：Mary（分析师）、John（PM）、Sally（UX）、Winston（架构）、Amelia（工程师；v6.3.0 合并了 SM Bob 与 QA Quinn）；Paige（技术写手）v6.11.0 退役；Murat 仅在 TEA。技能以目录名调用（Claude Code `/bmad-build`，Codex `$bmad-build`）。

**生命周期**：文档仍是 4 阶段 *Analysis(optional) → Planning → Solutioning → Implementation*，README 改卖 "Clarify → Plan → Build and verify → Learn and adjust" 的可变深度闭环；"Every implementation path converges on `bmad-build`"。**scale-adaptive levels 0–4 已不存在**（alpha 概念，alpha.22 删除 618 行文档）；现在是 *direct entry*（`bmad-build` 直接带 intent/issue/spec）vs *planned entry*（PRD/UX/architecture/epics/readiness 先行），`bmad-help` 建议深度；`bmad-build` step-01 再把每个请求路由到 **one-shot**（"zero blast radius"）或 **plan-code-review**。Party mode 四种运行模式（session / auto / subagent / agent-team[仅 Claude Code]），内置 "Code Review Crew" 与 "Anti-Consensus Club"。brownfield：`bmad-document-project` 已被 **`bmad-project-context`** 取代——不再生成文档，而是在 `AGENTS.md` 的 `<!-- bmad:context -->` 标记间写 "one small verified block"，intents `setup/adopt/refresh/record/audit`，"The human is in the loop for every write; there is no unattended mode"。

**工件与布局**：`_bmad/`（`config.toml` + `config.user.toml` 四层 TOML；`custom/`；`_config/manifest.yaml`、`bmad-help.csv`；`scripts/`（`resolve_customization.py`、`memlog.py`、`render_skill.py`、`sprint_plan.py`）；`render/` 内容寻址的不可变技能快照）；技能复制到工具目录（`.claude/skills/bmad-*/`、`.agents/skills/`）；输出 `_bmad-output/planning-artifacts/`（brief、PRD、UX、architecture、epics、`sprint-change-proposal-{date}.md`、`implementation-readiness.md`）与 `_bmad-output/implementation-artifacts/`（`sprint-status.yaml`、`spec-*.md`、`epic-N-context.md`、`deferred-work.md`、`epic-N-retro-{date}.md`）。`sprint-status.yaml`（story 状态 backlog | ready-for-dev | in-progress | review | done；epic 状态；`action_items`）v6.11.0 起由 `scripts/sprint_plan.py` 生成/合并/校验（"preserve-never-downgrade"；`--dry-run` 漂移报告）。v6 story 文件模板：`# Story {epic}.{n}` / Status / As a-I want-so that / Acceptance Criteria / Tasks-Subtasks（`- [ ] Task (AC: #)`）/ Dev Notes / Dev Agent Record（Agent Model Used、Debug Log References、Completion Notes List、File List）+ Change Log + `Senior Developer Review (AI)`。**当前 build spec `spec-{slug}.md`**：frontmatter（type feature|bugfix|refactor|chore、status draft|ready-for-dev|in-progress|in-review|done、`review_loop_iteration`、`baseline_commit`）+ **`<frozen-after-approval reason="human-owned intent">`** 块（`## Intent`、`## Boundaries & Constraints`：**Always / Ask First / Never**——"Ask First: DECISIONS_REQUIRING_HUMAN_APPROVAL ... if any of these trigger during execution, HALT and ask"、`## I/O & Edge-Case Matrix`）+ agent 拥有的 `## Code Map`、`## Tasks & Acceptance`（`- [ ] FILE -- ACTION -- RATIONALE`，Given/When/Then）、`## Spec Change Log`（append-only）、`## Verification`（命令 + 期望）；目标 "900–1600 tokens ... Above 1600 = high risk of context rot"。`bmad-spec` 的 `stories.yaml`：`id,title,description,spec_checkpoint,done_checkpoint,invoke_dev_with`，"No `status` field, ever"（规划契约与执行状态分离）。

**人审位置（提示层为主，但设计精细）**：`bmad-build` step-01 意图澄清（编号问题，"If any were ignored, HALT and re-ask"）、VCS 脏树 HALT、多目标 Split/Keep；step-02 **CHECKPOINT 1**（计划审批）"HALT and give the user a choice: **Approve and continue** / **Approve and stop** / **Review spec**"，>1600 tokens HALT，批准后 "everything inside `<frozen-after-approval>` is then locked and only the human can change it"；step-04 评审分诊：`intent_gap` → 回滚代码 "Loop back to the human"、`bad_spec` → 自动修 spec 再推导、`patch` 自动修、`defer` 记入 `deferred-work.md`、超过 5 轮 "HALT and escalate to the human"；step-05 "NEVER auto-push"（本地提交后询问）。`bmad-code-review` 的 `decision-needed` 必须由用户裁决；`bmad-correct-course` "Do you approve this Sprint Change Proposal for implementation? (yes/no/revise)"；`bmad-advanced-elicitation` 每法 Apply/Reject（"Never change the work unless the user accepts the proposal"）；PRD "requires explicit confirmation before any scope reduction"；`bmad-sprint-planning` readiness gate PASS/CONCERNS/FAIL（CONCERNS 询问、FAIL 停）；`bmad-retrospective` "the human decides"；`bmad-build-auto` 无人值守但遇 `intent gap`/`matrix ambiguity` 等 halt `blocked`。

**调研**：Phase 1 "(Optional)"，但 PRD 技能默认派 web-research 子代理；**`bmad-deep-recon`**（v6.11.0 合并 market/domain/technical research）三模式 Draft（为 ChatGPT/Gemini/Grok/Perplexity 深研生成提示）/ Process（导入报告）/ Run（并行 web 扇出，quick/standard/deep = 2/3/6 助手），六个类型包 + "select" 形（二选一决策），规则 "Never conclude from training data alone"、**research firewall**（"Project context ... shapes what to ask, never what is true"）、每条断言需 publisher/date/access date、`.memlog.md` 审计、staleness map 刷新；`bmad-brainstorming` 108 种技法（`brain-methods.csv`）；`bmad-advanced-elicitation` 71 种方法（`pick_methods.py` 按需取，避免整表入上下文）；`bmad-forge-idea` 苏格拉底一问一答压力测试（Hardened/Killed/Clearer）；`bmad-architecture` 用 `ARCHITECTURE-SPINE.md` + 广度覆盖 rubric（每维度 decided/deferred/open）+ `lint_spine.py`；文档以 ADR 式记录（Context/Options/Decision/Rationale/Consequences）作为多 agent 防冲突机制。

**测试硬度**：Amelia 原则 "No task complete without passing tests. Red, green, refactor — in that order."；`dev-story` shim 的 DoD 清单——提示层。`bmad-build`：spec `## Verification` 命令；**Verification-Gap reviewer**（"if this behavior broke, would any test fail?"）、Edge Case Hunter、Blind Hunter 作为并行、无上下文子代理（`[[workflow.review_layers]]` 可配；"All review subagents must run at the same model capability"）；**Matrix Test Audit**——I/O 矩阵每行须有"跑过且通过"的覆盖测试（"A covering test that exists but did not run ... counts as missing"；"never edit the expectation to match the code"）。硬检查仅脚本级（`render_skill.py` 缺配置即停、`sprint_plan.py validate`、`lint_spine.py`）——TDD 本身不被机器强制。**TEA** 9 个工作流（test-design 风险 P0–P3、atdd 红阶段脚手架、automate、test-review、trace "traceability matrix ... quality gate decision PASS / CONCERNS / FAIL / WAIVED"、nfr、ci、framework）；**TEA 1.23.0 首次引入真正的写入期强制 hook**（`tea-enforce.cjs` 注册于 `.claude/settings.json`，阻止 `.only`、`waitForTimeout`、`Thread.sleep` 等，"fails open on any error of its own"）——生态中首个机器强制规则集。

**记录**：`.memlog.md`（`memlog.py`，append-only，`--type decision|change|override|assumption|question|event`）是 PRD/brief/spec/brainstorm/deep-recon 的每次运行审计线；`addendum.md` 保存被否方案；spec 的 Spec Change Log；`deferred-work.md`（#2199 曾是只写不读）；`bmad-correct-course` → `sprint-change-proposal-{date}.md`（Issue Summary / Impact Analysis / Direct Adjustment vs Rollback vs MVP Review / old→new 编辑提议 / Handoff）；`bmad-retrospective`（6.11.0 重建）"Every finding you report carries a source reference (file, line, commit, or log)"，verdict `accepted | accepted-with-open-items | rejected`，`epic-N-retro-{date}.md` 机器可读 frontmatter，action items 带稳定 id 写回 sprint status；`bmad-project-context record` 把 "a mistake agents keep making" 写进 `AGENTS.md`。

**交接/状态**：story 状态在 `sprint-status.yaml`，`bmad-build` 幂等 "never regress" 同步；spec 状态驱动恢复（`draft` → step-02、`ready-for-dev/in-progress` → step-03、`in-review` → step-04）；**会话卫生**：`bmad-help` "Recommend running each skill in a fresh context window"；"run `code-review` using a **different** LLM than the one that implemented"；理由 "Nothing exists until it is a file"、评审者刻意无上下文以避免锚定；`bmad-help` 读 `bmad-help.csv` + 扫描输出路径（"Treat a matching output as evidence that the skill started, not that it completed"），每个工作流结束自动运行。

**多代理/多开发者/分发**：`npx bmad-method install` 把技能目录复制到工具技能目录，`platform-codes.yaml` **47 个平台**（Claude Code `.claude/skills`；Codex/Cursor/Windsurf/Gemini CLI/Roo/Kilo/Kimi/Auggie/Warp/Goose/Amp/Crush/**OpenCode**/OpenHands/**Pi**/Pochi/**Grok**/Hermes/Mux/Replit/Rovo Dev/OpenClaw/Command Code/Antigravity CLI → `.agents/skills`；Cline/Trae/iFlow/Qwen/Kiro/Junie/Qoder/Zencoder/IBM Bob/Droid/Antigravity IDE/CodeBuddy/ZCode… 各自目录；**未见 DeepSeek Harness**）；Copilot 只得 persona 指针文件；web bundles（Gemini Gems / ChatGPT GPT）承担规划以省 IDE token；子代理是评审设计基石（无子代理的工具写回退提示到磁盘）；`implementation_handoff` 配置键可把实现路由到别的模型/CLI；BMad Loop 用 tmux 驱动 claude/codex/gemini/copilot/antigravity/opencode，"No LLM in the control loop"，提交前校验 spec 状态/baseline commit/diff/tests，可选每 story worktree。多开发者：团队 `_bmad/custom/*.toml`（提交）vs `.user.toml`（gitignored）；`sprint-status.yaml` 为共享账本；无文件锁/分支策略；2026-04 对比给并行开发 2/5（"puts all output into a shared directory by default"）。

**体量**：`src/` 261 文件 / 1.73 MB；30 个非 shim SKILL.md + 19 shim；提示 md 157 文件 ~747 KB；每次运行 just-in-time 加载（"NEVER load multiple step files simultaneously"），如 `bmad-build` 全程 ≈60 KB；每次技能激活还要跑 `uv run resolve_customization.py`。成本批评：2026-04 对比 BMAD Full ≈6 天 / $200 vs Quick 2 天 / $85 vs Spec-Kit $75 vs OpenSpec $95（同一功能）；HN "It is expensive ... but the price worth it"；dev.to：party mode + deep research "absolutely exhausted my context window and usage credits"；二手 "~230M tokens/week"（unverified）。

**失败模式**："After 2 days of prompting through BMAD workflows, I had PROJECT.md, REQUIREMENTS.md, ROADMAP.md, ARCHITECTURE.md ... Zero lines of actual code"（guillim 2026-02-08）；"BMAD: 23 rounds ... Custom loop: 8 rounds ... What I kept from BMAD: the brief format ... the retro idea"（kopanev 2026-02-22）；"12 to 16 hours before the first line of code"；中文 "BMAD 是一艘战列舰 ... 在池塘钓鱼就荒谬了"、"日常小修小改成本偏高"；#1332 评审配额（"Find 3–10 specific issues in every review minimum"）导致捏造问题与无尽循环（6.1.0 移除，但 Blind Hunter 又写 "Find at least ten issues"）；#2003 非技术用户做不了架构决策、无机制强制 dev agent 重读代码、"superficial fixes"；#2178 Quick Dev 未经同意自动 commit 甚至 push；#2199 只写不读的账本；命名折腾（`bmad-bmm-*` → `bmad-*` → build，docs 滞后 #2690）；HN "Basically, it's Waterfall for Agents"；平台脆弱（OpenCode/Copilot 技能加载回归、Windows 编码）。正面："adversarial code review ... caught things a standard review would miss ... Worth the complexity tax for the right project"、三框架中最健康（458 commits/90 天、94% issue 关闭率）。

**值得采纳**：**frozen-after-approval 意图块 + Always/Ask First/Never 三层边界**；评审发现的失败层分诊（intent_gap → 回人、bad_spec → 重生成、patch → 自动、defer、reject）+ 5 轮上限 + append-only Spec Change Log；无上下文并行评审者（对抗/边界/验证缺口）读 diff *文件*、同等模型能力、TOML 可配；Verification-Gap + I/O 矩阵测试审计（"exists but did not run counts as missing"）；**确定性脚本管状态、模型管内容**（`sprint_plan.py` never-downgrade、`memlog.py`、`render_skill.py` 缺配置即失败）；readiness gate PASS/CONCERNS/FAIL 一句话标准（"could a developer implement these epics without inventing decisions nothing records?"）；证据化回顾（每条发现带 file/line/commit/log）+ 机器可读 verdict + action items 回写；研究防火墙 + "no conclusions from training data" + 断言必带来源与访问日期 + staleness map；`bmad-help` 式目录 CSV + 工件扫描顾问 + 每工作流新鲜上下文 + 不同模型评审；小而验证过的 `AGENTS.md` 块替代生成文档 + `record` 意图；分层 TOML 定制与 `implementation_handoff`；`stories.yaml` 无 status 字段；web bundles 把重规划移到包月订阅。
**应避免**：把每个项目都塞进 PRD→架构→epics 全流程（BMAD 用了一年补 quick-dev → build → "start anywhere"）；配额式评审；persona 蔓延；只写不读的账本；无显式设置的自动 commit/push；minor 之间改名且 docs 滞后；同一会话/模型既实现又评审；预置大块 `persistent_facts`（TEA 回滚了 `project-context.md` glob）；提示层 "TDD required" 无机器检查（补 TEA hook / 矩阵审计）；生成式 brownfield 文档卷（"anything derivable from source is read live and never stored"）；只面向交互、CI/headless 下就坏；忽视平台差异。
## D. OpenSpec（Fission-AI/OpenSpec）

**基本面（2026-08-17 核验）**：v1.9.0（npm `@fission-ai/openspec`，2026-08-13，"Command Code & safer specs"）；MIT；65,144 stars / 4,488 forks / 201 open issues；周更（1.6.0 07-10、1.7.0 07-29、1.8.0 08-05、1.9.0 08-13）；TypeScript CLI，Node ≥ 20.19；匿名遥测（仅命令名，可关）。

**阶段与工件**：两代命令——旧 `/openspec:proposal|apply|archive` 已弃用；现行 "OPSX"：核心 profile `/opsx:propose`、`/opsx:explore`、`/opsx:apply`、`/opsx:update`、`/opsx:sync`、`/opsx:archive`；扩展 profile 另有 `/opsx:new`、`/opsx:continue`、`/opsx:ff`、`/opsx:verify`、`/opsx:bulk-archive`、`/opsx:onboard`。布局：`openspec/specs/<capability>/spec.md`（真源，"how the system currently behaves"）；`openspec/changes/<change-id>/{proposal.md, design.md, tasks.md, .openspec.yaml, specs/<capability>/spec.md(delta)}`；`openspec/changes/archive/YYYY-MM-DD-<name>/`；`openspec/config.yaml`（默认 schema、注入每个工件提示的 `context:` 上限 50 KB、每工件 `rules:`）；`openspec/schemas/<name>/{schema.yaml, templates/*.md}`。工件 DAG（spec-driven schema）：proposal → specs, design（需 proposal）→ tasks（需 specs+design）→ apply（需 tasks，跟踪 tasks.md）；"Dependencies are enablers, not gates"；**状态 = 文件存在性**（BLOCKED → READY → DONE），由 `openspec status --change X --json`、`openspec instructions <artifact> --change X --json`（返回模板+指令+context+rules+输出路径）驱动，skill 只是 CLI 的薄包装。

**Delta spec 语法（schema 原文）**：`## ADDED Requirements` / `## MODIFIED Requirements`（"MUST include full updated content"）/ `## REMOVED Requirements`（"MUST include **Reason** and **Migration**"）/ `## RENAMED Requirements`（FROM:/TO:）；`### Requirement: <name>` + SHALL/MUST 句；`#### Scenario: <name>` + `- **WHEN**` / `- **THEN**`；"Scenarios MUST use exactly 4 hashtags"；"Every requirement MUST have at least one scenario"；新能力以 `## Purpose`（≥50 字符）开头。proposal.md：`## Why` / `## What Changes` / `## Capabilities`（New/Modified，"the contract between proposal and specs"）/ `## Impact`；design.md：Context / Goals-Non-Goals / **Decisions**（"why X over Y, alternatives considered"）/ Risks / Migration Plan / Open Questions（"if a question would change the specs... ask the user instead of guessing"）；tasks.md：`## N.` 分组 + `- [ ] N.M`（"Tasks not using `- [ ]` won't be tracked"）。

**硬校验（CI 可复跑，本报告中最"硬"的门禁之一）**：`openspec validate [name] [--all|--changes|--specs] [--strict] [--json] [--archived] [--no-interactive]`——编码规则：需求须含 SHALL/MUST；每需求 ≥1 scenario；spec 须有 `## Purpose` + `## Requirements`；change 须有 `## Why`（50–1000 字符）+ `## What Changes`；除非 `.openspec.yaml: skip_specs: true` 否则 ≥1 delta；**MODIFIED 丢失 scenario 在写作期即失败**（v1.9）；`--archived` 在任一归档 change 仍有未勾任务时非零退出（供 pre-commit/CI）。`archive`：validate → 确认（`--yes` 供 agent/CI）→ 把 ADDED/MODIFIED/REMOVED/RENAMED 合并进 `openspec/specs/` → 移入 `changes/archive/`，失败回滚；`/opsx:sync` 只合并不归档（长周期/并行变更）。

**人审位置**：仅提示层。`/opsx:propose` 结尾 "**Planning boundary**: … authorizes planning only … Do not edit project code. After the planning artifacts are complete, stop … Wait for a new user request"、"The artifacts are ready for review. When you are ready, run /opsx:apply"——这是 PR #1501（2026-08-04 合并）在 Codex/Cursor/Factory 无视 "Request approval: Do not start implementation until proposal is approved"（#232/#258/#262）之后的加固，PR 自述 "prompt hardening only. It does not add an approval state"。无持久化审批状态，nothing blocks apply on unreviewed artifacts。

**调研**：无。`/opsx:explore` 是无工件的自由思考伙伴；design.md 要求写 alternatives；可通过自定义 schema 增加 `research` 工件；无逐决策确认。

**测试硬度**：无强制。schema 说 "each scenario is a potential test case"、apply "runs tests as needed"；tasks 模板无测试段（#584）；`/opsx:verify`（扩展）把未完成任务/未实现需求标 CRITICAL、无测试的 scenario 标 WARNING，但 "Does not block archive"。硬检查仅格式（`validate --strict`、`--archived`）。

**记录与需求变更（OpenSpec 的核心思想）**：修改既有需求 = proposal 的 Modified Capabilities → delta 中 `## MODIFIED Requirements` 整块复制后编辑（header 必须与主 spec 匹配）/ REMOVED 带 Reason+Migration / RENAMED → validate 对照主 spec 并检查 scenario 丢失 → sync/archive 替换主 spec 中的块 → 归档目录保留 proposal/design/tasks/delta 作审计线。`/opsx:update` 处理进行中的修订，"same intent & >50% overlap → update, else new change"。brownfield："write specs only for what you're about to change"，反对回填。缺口：delta 只存 MODIFIED 后的新文本不存基线，**并行 change 冲突晚发现或静默覆盖（#1387，open，无维护者回复）**。

**交接/状态**：`openspec status --change X --json`（`isPlanningComplete`）、tasks 勾选、`openspec list`、`openspec view` TUI、归档历史；apply "can resume where you left off"；**无交接/总结文档**。#1485（2026-07-29）：缩进子任务不可见 → change 被当作完成并归档。

**多代理/多开发者/分发**：37 个目标（amazon-q、antigravity、auggie、bob、claude、cline、command-code、codeartsagent、codex、devin、forgecode、codebuddy、continue、costrict、crush、cursor、factory、gemini、github-copilot、hermes、iflow、junie、kilocode、kimi、kiro、lingma、minimax-code、vibe、oh-my-pi、opencode、pi、qoder、qwen、roocode、trae、zcode、agents）——含用户的 Claude/Codex/OpenCode/Pi，**不含 Grok Build 与 DeepSeek Harness**（可用 `agents` = `.agents/skills/` 中立目标）。`openspec init` 写 skills（`<tool>/skills/openspec-*/SKILL.md`）和/或 commands（`.claude/commands/opsx/<id>.md`、`.cursor/commands/opsx-<id>.md`、`.opencode/commands/opsx-<id>.md`、`.pi/prompts/opsx-<id>.md`、`.kiro/prompts/`、`.gemini/commands/opsx/<id>.toml`、`.github/prompts/`、`.devin/workflows/`、`.kilocode/workflows/`、`.clinerules/workflows/`、`.agents/skills/`）；Codex/Kimi/Vibe/Hermes 等 skills-only；`openspec update` 重新生成并盖版本戳（"generated files are OpenSpec's to own"）；旧 `openspec/AGENTS.md` 与 CLAUDE.md/AGENTS.md 标记块已废弃并被 update 清除；#1139：commands 与 skills 近乎重复、团队定制位置不明。团队：并行 change 目录、`bulk-archive` 的 agent 式冲突解决、Stores（beta：跨代码仓的共享规划仓 + worksets）。

**体量**：~10 个运行依赖；每项目 6（核心）或 12（扩展）个 skill，各 120–170 行，模板由 CLI 按需返回。Discussion #1159（2026-06-02）bake-off：比裸 Claude Code 多 50% 代码与圈复杂度、2× 时间、3× API 成本，但 "surfaced 3 more gaps"，且作者没读生成的 spec。README 建议 "Codex 5.5 and Opus 4.7" 并在实现前清空上下文。

**失败模式**："sync is optional... keeps drifting until you have duplication and contradictions"、用户停止维护主 spec、verify 只建议、`--no-validate` 可绕过（codemyspec 2026-06-03）；agent 静默缩窄/推迟任务却打勾（#1529 → 1.9.0 补丁 "surface added scope, never narrow silently"）；跳过审批停顿（#262）；未完成子任务被归档（#1485）；并行 MODIFIED 冲突（#1387）；HN 2026-08-05 "agents still improvise code outside requirements"；中文（cnblogs 2026-05-15）：无宪法机制、无需求澄清、验证式（事后）质量、命令格式不统一、Schema 复杂度；对比文章一致认为 OpenSpec 比 Spec Kit 轻但结构少。

**值得采纳**：CLI 校验的 delta 语法（SHALL + `#### Scenario:` + 整块 MODIFIED；`validate --strict` 进 CI；`--archived` 门）；"状态 = 文件存在性"的工件 DAG + `status --json / instructions --json`（工具无关）；单一指令源渲染到各工具；`skip_specs` 显式豁免；"surface added scope, never narrow silently"；update-vs-new 启发式；explore 先于 propose；REMOVED 必带 Reason+Migration。
**应避免**：只靠提示的审批边界（已被 Codex/Cursor/Factory 绕过）；可选 sync 导致漂移；delta 不存基线快照；不阻断的 verify；只跟踪顶层 checkbox；skills/commands 双份文件。
## E. Superpowers（obra/superpowers）

**基本面（2026-08-17 核验）**：最新 v6.3.0（2026-08-12），本地安装即最新（`C:\Users\NF3317\.claude\plugins\cache\claude-plugins-official\superpowers\6.3.0\`）；MIT；GitHub 272,963 stars / 24,409 forks / 343 open issues+PRs；claude.com/plugins 显示 1,009,371 installs；2025-10-09 创建，10 个月 43 个 tag。作者 Jesse Vincent（Prime Radiant）。PR 政策 "94% PR rejection rate"，技能改动需 eval 证据。

**机制**：
- 唯一 hook = `hooks/hooks.json` 的 `SessionStart`（matcher `startup|clear|compact`），把 `skills/using-superpowers/SKILL.md` 全文注入为 `additionalContext`（实测 3,530 字节 ≈ 880 tokens）。无 PreToolUse/Stop/pre-commit hook。其余 14 个技能靠 harness 的 Skill 工具按需加载（渐进披露）。
- "1% 规则"原文："If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill … This is not negotiable." 并要求"Invoke relevant or requested skills BEFORE any response or action"，附 12 行 "Red Flags" 反合理化表。
- 技能 description 只写触发条件（"Use when…"），绝不概述流程——`writing-skills` 记录过一个案例：description 概述了流程后 agent 只做了 1 次 review 而非技能正文要求的 2 次。
- `brainstorming` v6.3.0 引入三条路径 **Spike / Bounded / Architectural**（"When in doubt … take the heavier one. The ratchet is one-way"）；一次只问一个问题、优先选择题；提出 2-3 个方案并给推荐；设计按节展示并逐节确认；写入 `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` 并提交；`<HARD-GATE>`："Do NOT invoke any implementation skill, write any code … until you have told your human partner what you intend and they have approved it. … the ceremony scales with the task; the approval gate never does."
- `writing-plans`：面向"零上下文、品味可疑"的工程师；每步 2-5 分钟（写失败测试 / 跑失败 / 最小实现 / 跑通过 / 提交 各为一步）；任务模板含 Files(Create/Modify/Test 精确路径)、Interfaces(Consumes/Produces 精确签名)、Run/Expected；"No Placeholders" 清单；保存到 `docs/superpowers/plans/YYYY-MM-DD-<feature>.md`；结束问 "Subagent-Driven (recommended) or Inline Execution?"。
- `subagent-driven-development`（SDD，32 KB + 3 个提示模板 + 3 个脚本）：每任务一个新鲜 implementer 子代理 → 一个 task-reviewer（spec 合规 + 代码质量两票）→ 全分支终审；`scripts/task-brief` 把任务切成文件、`scripts/review-package` 生成 diff 包（**以文件而非粘贴历史交给子代理**）；implementer 报告必须含 "TDD Evidence (RED/GREEN command + output)"，reviewer "Do Not Trust the Report" 且只读；每任务最多 5 轮修复（4-5 轮换更强模型的新 implementer）后由 controller 裁决并记入 ledger；"Always specify the model explicitly"；"Never dispatch multiple implementation subagents in parallel"；"Do not pause to check in … between tasks"，只有四类事停机（不可逆操作/安全敏感/超出 worktree 的副作用如 merge、push、publish/计划彻底坏掉）。ledger `.superpowers/sdd/<plan>/progress.md`（"After compaction, trust the ledger and git log over your own recollection"），完成后整个工作区 `rm -rf`。
- `test-driven-development`："The Iron Law: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST"；"Write code before the test? Delete it. Start over. No exceptions … Delete means delete."；例外须问人（原型/生成代码/配置）。
- `systematic-debugging`：四阶段（根因调查 → 模式分析 → 单一假设与最小测试 → 先写失败用例再修）；"If ≥ 3 [fixes]: STOP and question the architecture … Discuss with your human partner"。
- `verification-before-completion`："Evidence before claims, always … If you haven't run the verification command in this message, you cannot claim it passes"；给出"声称 → 需要的证据"表（如 "Agent completed | VCS diff shows changes | Agent reports 'success'" 不算证据）。
- `using-git-worktrees`（先检测既有隔离、再用平台原生、最后 git；须征得同意）、`finishing-a-development-branch`（菜单：本地合并 / push+PR / 保留分支；丢弃需键入 `discard`）、`requesting/receiving-code-review`、`writing-skills`（"Writing skills IS TDD applied to process documentation"：先用子代理做无技能基线压力测试记录合理化借口，再写技能，再堵漏洞；常驻技能 <200 词）、`dispatching-parallel-agents`（仅独立问题域并行）。

**人审位置**：brainstorm 硬门（每条路径都要"explicit yes"）；设计逐节确认；spec 写好后 "Please review it … Only proceed once the user approves"；执行方式选择；worktree 同意；SDD 期间刻意**不**逐任务打断；分支收尾菜单；TDD/调试例外须获人许可。**没有**"批准计划"的显式提示（只有 handoff 选择）；HN 用户抱怨没有 "Sounds good, but it needs these edits" 的廉价修订路径，改计划会整篇重生成。

**调研**：**没有任何 research 技能**——只有 brainstorming 的"Explore project context"（查文件/文档/近期提交）与"2-3 approaches with trade-offs"；无外部技术调研、无逐决策确认、无 ADR。

**测试/验证硬度**：**全部为提示层**（Iron Laws、反合理化表、`<HARD-GATE>` 标签）；脚本只产出文件不阻断；技能本身的"执行力"靠维护者线下 LLM-judged evals（`superpowers-evals`，"not part of CI today"）。

**记录**：持久的只有 design spec、plan、细粒度 commits；SDD ledger/裁决/报告在 gitignored 目录且完工即删（裁决只出现在最终聊天消息 "Rulings I made"）；无 ADR / 教训 / 问题日志 / 每功能总结 / 需求变更记录；维护者拒绝了 `/create_handoff`（#931）。

**交接**：plan 即交接物（"execute in a separate session"）；compaction 后靠 ledger + `git log`；bootstrap 在 `compact` 时重注入。

**跨 harness**：Claude Code（官方 marketplace）、Antigravity、Codex（openai/plugins marketplace——**该仓库 2026-08-16 已归档**）、Cursor、Devin、Droid、Gemini CLI（`GEMINI.md` @-include）、Copilot CLI、**Grok Build**（`grok plugin install superpowers@xai-official`，已在 xai-org/plugin-marketplace 核验）、Kimi、**OpenCode**（`.opencode/plugins/superpowers.js`）、**Pi**（`.pi/extensions/superpowers.ts`）、Hermes；**DeepSeek Harness 零覆盖**。原理见 `docs/porting-to-a-new-harness.md`："Skills name actions, not tools" + 每 harness 一份 `references/<harness>-tools.md` + 一个 bootstrap 注入器——"The bootstrap is the entire integration"。Codex 因"reliably triggers skills on its own"在 v6.1.0 去掉了 SessionStart hook。

**体量与代价**：14 个技能，全部 SKILL.md 138.6 KB / 20,748 词；一次完整 brainstorm→plan→SDD 会让 controller 载入约 80 KB ≈ 20k tokens 的技能正文（子代理 token 另计）。维护者自认的成本问题：v5.0.6 删除子代理审阅循环（"doubled execution time (~25 min overhead) without measurably improving plan quality"）；v6.0.0 重写 SDD（一次实测 "26 reviewers on the top tier"、"42k chars of which 99% was pasted history"）；v6.2.0 加 5 轮熔断；v6.3.0 修 "blocked for almost nine hours" 的停摆。用户报告：#743 变慢；#750 / #1194（68M tokens 写 ~3,000 行，规划就 22M）/ #2017 求 "Slim" 版；#1988 Codex 一个 SDD 任务 4 小时 / 120.7M tokens（子代理继承了 `gpt-5.6-sol / max`）；#895 计划过度指定；#781 审批太繁琐；#73（作者自提）brainstorm 问显而易见的问题；#1246 提交太碎；#892 visual companion 与默认遥测惹人反感；HN "Superpowers 6"（196 分/77 评论）："consuming a stupid amount of tokens, it did materially worse"、"fills up the context windows with garbage"；也有正评（TDD "stops the model from jumping to conclusions"）。中文：cnblogs 称 "Brainstorming + TDD 会多消耗 10-20% 的 Token"、"改个文案也要走 Brainstorm 会让人烦"。

**值得采纳**：小体积 bootstrap 且在 compact 重注入；触发式 description；"审批不随任务缩水，缩水的是工件"（三路径分类）；计划模板（Global Constraints 逐字复制、Interfaces、精确路径、Run/Expected、No Placeholders）；以文件交付子代理、禁止粘贴历史；每次派发显式指定模型 + 熔断 + 裁决入账；ledger 抗 compaction；verification 的"声称→证据"表；技能写作即 TDD（基线压力测试）；分支收尾菜单 + 键入 `discard`。
**应避免**：全软门禁（用户无法得知技能是否触发 #446）；小任务的 token/延迟税与一问一答疲劳；过度指定的计划把实现者变成抄写员；无上限的子代理循环继承最贵模型；决策记录随工作区删除；无调研技能；单人单分支世界观（Agent Teams 不支持 #429）；提交过碎；默认遥测；跨 harness 平权脆弱（Windows hook 多次回归 #331/#404/#414/#1751/#1918）；依赖第三方 marketplace（openai/plugins 已归档）。
## F. Kiro（AWS）

**基本面（2026-08-17 核验）**：2025-07-14 预览，2025-11 GA；"one agent, every surface"：IDE 1.0.309（2026-08-13）、CLI 2.18.0（2026-08-12，可选 v3 引擎 `kiro-cli --v3`）、Kiro Web（预览：云沙箱、PR 交付、autonomous mode、automations）、Mobile（预览）、Kiro Crew（开源个人 agent）、Powers（Agent Plugin 格式）、GovCloud。定价：Free $0/50 credits、Pro $20/1,000、Pro+ $40/2,000、Pro Max $100/5,000、Power $200/10,000、加购 $0.04/credit；模型含 Sonnet 4.5/4.6、Haiku 4.5、Opus 4.5–4.8、Opus 5（2.2× 倍率）、GPT-5.6 Sol/Terra/Luna、DeepSeek/Qwen/MiniMax/GLM；"executing a spec task typically costs more than 1 credit"。前 5 天 10 万开发者。

**Specs**：`.kiro/specs/<feature>/{requirements.md | bugfix.md, design.md, tasks.md}`；Requirements（或 Bug Analysis）→ Design → Tasks → 执行。变体：Feature Specs（Requirements-First 或 Design-First）、**Bugfix Specs**（Current / Expected / Unchanged behaviour 三段）、**Quick Spec**（先集中问澄清问题，然后一次生成三个工件 "without approval gates"）、Plan mode（只读问答 → 计划 → 自动交接，不落盘）、**Analyze Requirements**（neuro-symbolic：LLM 形式化 + SMT 求解器找不一致/歧义/缺口，流式给出二选一问题；AWS 自承首稿需求常 "thesis-level: too vague to formalize"）。EARS 文档写法："WHEN [condition/event] THE SYSTEM SHALL [expected behavior]"；bugfix "WHEN [condition] THEN the system SHALL CONTINUE TO [existing behavior]"；WHILE/WHERE 等 EARS 族在当前文档中 **unverified**。

**审批点**："You approve each one before the next begins"（requirements → design → tasks 逐阶段）；CLI v3 的 spec-phase checkpoint 屏（Ctrl+X 读文档、行内暂存评论、回答 checkpoint 问题）；Quick Spec 与 Plan mode 有意去掉门。任务执行：tasks.md 带 in-progress/completed；单跑或 "Run all Tasks"（2026-01-16 才上线，此前拒绝了 6 个月；依赖 PBT + dev-server/LSP 校验 + 子代理）；2026-05-12 起并行依赖 "waves"（同文件任务永不并行；测试排在代码后）。保持同步：改 requirements.md → design.md 上 **Refine** → tasks.md 上 **Sync Files**（"Check which tasks are already complete"）；`#spec:<name>` 引用。**Correctness / PBT（仅 IDE）**：设计阶段从 EARS 需求抽取 properties；"PBTs are optional by default"；失败时可选修实现/修测试/修需求；bugfix spec 生成 bug-exists / bug-fixed / no-regression 三类 PBT。CLI：`/spec new|run|view|analyze_requirements`（v3）、headless 模式供 CI。

**Steering**：`.kiro/steering/*.md`，front-matter `inclusion: always | fileMatch(fileMatchPattern) | manual(#name) | auto(name+description)`；基础三件 `product.md / tech.md / structure.md`（生成，always）；全局 `~/.kiro/steering/`；`#[[file:path]]` 活引用；AGENTS.md 支持（always；2026-08 起支持嵌套）；custom agents 用 `resources` 选择；CLI 忽略 inclusion 模式。与 CLAUDE.md 的差别是条件装载 + 生成的基础文档；#2250 显示 `inclusion: always` steering 会输给 spec 任务指令。

**Hooks**：`.kiro/hooks/*.json` v1：PostFileSave/Create/Delete、PreToolUse（可阻断）、PostToolUse、UserPromptSubmit（可阻断）、SessionStart、Stop、PreTaskExec（阻断，IDE）、PostTaskExec（IDE）、Manual；动作 `command`（shell，JSON stdin，不耗 credits）或 `agent`（提示，耗 credits）。文档示例：保存时维护测试覆盖、Stop 时安全扫描、i18n 同步、文档生成、PostTaskExec "Run tests after a task completes"。

**测试/记录/交接/多人**：测试不强制（design.md 有 testing strategy；PBT 可选；hooks 是执行路径）。记录：三件工件 + design decisions（`#spec` 可查）+ 会话导出 zip + checkpoints/rewind + Web autonomous mode → 带理由的 PR。交接：`.kiro/` 入 git 跨 IDE/CLI/Web；跨团队 spec 用中央仓/submodule。MCP 本地/远程 + OAuth，可被 hook，Powers 打包。

**失败模式**：dev.to 2025-09-13：阶段顺序僵硬、每次 refinement 烧 credits、hook 也算完整请求、任务过度生成测试、hook 只在编辑器保存触发、终端挂起；2025-08 重定价（spec 请求 $0.20 vs vibe $0.04，"wallet-wrecking tragedy"，"one request consumes 4–6"，AWS 承认计量 bug；HN 90 分）；中文评测（2025-12-19）：每天 8 小时约 3 天烧完 1,000 credits，"不再推荐"企业；#10275（2026-07-16）steering/stop 条件被忽略、credits 2–3×，无维护者回复；2026-03 反欺诈误封号潮；2026-02 FT 报道的 AWS 故障归咎 Kiro，AWS 称是角色配置错误并加了强制同行评审；"60% of requirements had bugs" 标题（正文未取到）。

**值得采纳**：EARS 原子验收条件 → 测试/属性映射；每阶段 checkpoint + 行内评论；开场把澄清问题按 scope/ambiguity/forks/direction 分组一次问完（Quick Spec）；设计前的需求一致性/完备性检查（Analyze Requirements）；bugfix 三段式（defect / expected / unchanged）；PostTaskExec/PreToolUse 的 shell hook 作确定性门；steering inclusion 模式控 token；任务依赖图 → waves + 同文件互斥；Refine/Sync Files 重对齐任务。
**应避免**：让模型持有门（steering/stop 条件被忽略）；按次计费的 refinement 焦虑迫使用户跳过评审；默认过度生成测试；把 PBT 等关键能力锁在单一 IDE；无人监督的自治运行。
## G. Conductor / cc-sdd / Agent OS / PRPs / compound-engineering / GSD（简要画像）

### G.1 Conductor（gemini-cli-extensions/conductor，Google）
- **基本面**：Apache-2.0；3,701 stars / 287 forks；最新 tag conductor-v0.4.1（2026-03-11，Gemini CLI 形态）；PR #171（2026-07-15 合并）改为 "agent plugin"（SKILL.md + rules）服务 Antigravity（`agy plugins install`）与 Claude Code（`/plugin marketplace add gemini-cli-extensions/conductor`），Gemini CLI manifest 被移除（#176 求恢复；Google 2026-05-19 宣布 Gemini CLI → Antigravity CLI 过渡）。
- **阶段/工件**："Context → Spec & Plan → Implement"。`/conductor:conductor-setup` 写 `conductor/{product.md, product-guidelines.md, tech-stack.md, workflow.md, code_styleguides/*.md, index.md("the Handshake")}`；`-new-track` 建 `conductor/tracks/<shortname_YYYYMMDD>/{spec.md, plan.md, metadata.json, index.md}` 并登记 `conductor/tracks.md`；plan = Phases > Tasks > Sub-tasks（`[ ]/[~]/[x]`），每阶段以 "Phase Verification & Checkpoint" 元任务收尾；`-implement`、`-status`、`-review`、`-revert`。
- **人审**：重且显式：一次一问（Antigravity 上用原生 `ask_question` 模态），全部选择题 + "Other" + "(Recommended)" 默认；每个工件 Approve/Revise/Refine；spec.md、plan.md 各需 Approve；implement 前 Yes/No；每阶段结束：自动测试 → agent 写的手工验证步骤 → "PAUSE and await the user's response. Do not proceed without an explicit yes"；product/tech-stack 同步需对 diff 说 Yes/No；revert 给出计划并选 Safe(`git revert`)/Hard-reset。
- **调研**：无。brownfield 只读扫描；每 track "3-4 relevant questions" 循环至用户满意。
- **测试**：提示层但细：`workflow.md` 模板强制 TDD（"Write Failing Tests (Red Phase)... CRITICAL: Run the tests and confirm that they fail"）、>80% 覆盖、`CI=true` 非交互、每任务提交 + `git notes` 摘要、plan.md 写入 7 位 SHA、阶段 `[checkpoint: <sha>]`、失败最多修 2 次后停问；`/conductor-review` 重跑测试并按 Critical/High/Medium/Low 报告、向 plan.md 追加 `## Phase: Review Fixes`。**#30 记录 agent 跳过手工验证任务**（"Skipping manual validation since I've written such expansive tests!"）。
- **记录/变更**：决策写在 `tech-stack.md`（"Changes to the tech stack must be documented in tech-stack.md *before* implementation"；偏离时 "STOP implementation, update tech-stack.md, add dated note"）；验证报告与任务摘要挂 git notes；无 ADR/教训文件；需求变更无命令（#149，`/conductor:refine` "considered"）。
- **交接**：plan.md 勾选 + `tracks.md` + `metadata.json`；`scripts/resume.py`。单 agent 顺序执行；团队 = 共享 `conductor/` 目录。体量：6 个 SKILL.md ≈ 70 KB（~17k tokens）+ 16 KB workflow.md；README 自承 "can lead to increased token consumption"。
- **偷师**：选项优先的提问协议（推荐默认 + Other）；`index.md` 握手文件；git notes 承载可审计验证报告；git 感知的任务/阶段/track 逻辑回滚；"Review Fixes" 阶段追加到计划；技术栈偏离先记录再写码。**避免**：track 中途无法改 spec；agent 可越过纯提示的人工门；每步提交堆栈；与单一厂商扩展格式耦合（宿主转向即断）。

### G.2 cc-sdd（gotalab/cc-sdd）
- **基本面**：MIT；3,619 stars；v3.0.2（2026-04-13）；en/ja/zh-TW 文档；npm 3.0.2 = 410 文件 / 1.9 MB。
- **阶段/工件**：v3.0 skills 模式，17 个技能在 8 个 agent 上同集：`/kiro-discovery`（路由：扩展既有 spec / 无需 spec / 单 spec / 多 spec / 混合；写 `brief.md`、`roadmap.md`）、`/kiro-steering`、`/kiro-spec-init`、`/kiro-spec-requirements`（EARS）、`/kiro-spec-design`、`/kiro-spec-tasks`、`/kiro-spec-quick`、`/kiro-spec-batch`、`/kiro-impl`、`/kiro-validate-gap|design|impl`、`/kiro-spec-status` + `kiro-review/debug/verify-completion`。工件：`.kiro/steering/{product,tech,structure}.md`、`.kiro/specs/<feature>/{spec.json, requirements.md, research.md, design.md, tasks.md(P0/P1 waves, _Boundary:_, _Depends:_, ## Implementation Notes), brief.md, roadmap.md, gap-report.md, design-validation.md}`。
- **人审（数据化门）**：`spec.json` 的 `approvals.{requirements,design,tasks}.{generated,approved}` + `ready_for_implementation`；下游技能 "Verify approval status (stop if unapproved)"；`-y` 自动批准（"only use auto-approval in tightly controlled experiments"）；哲学 "Agents write the spec, humans approve the contract at phase gates, code is what ships."
- **调研（内建于设计）**：分类 feature（greenfield/extension/simple/complex）→ `design-discovery-full|light.md` → 并行研究子代理（代码库 + WebSearch/WebFetch）→ 写 `research.md` "with sources and implications" → 综合 → ≤2 轮 `design-review-gate.md`；需求技能 "Ask as many questions as needed; do not generate requirements that contain your own assumptions."
- **测试**：`/kiro-impl` 自治模式：每任务新鲜 implementer 子代理 TDD（RED→GREEN，Feature Flag 协议）→ 独立 reviewer 子代理（`git diff`、grep TODO、跑套件、查边界）→ `kiro-verify-completion` "fresh-evidence gate before success claims"（VERIFIED/NOT_VERIFIED/MANUAL_VERIFY_REQUIRED）→ 2 次拒绝后 debugger（最多 2 轮）；结构化 `STATUS:`/`VERDICT:` 解析（不可解析即重派）；1 任务/迭代；父级选择性提交；`/kiro-validate-impl` → GO/NO-GO/MANUAL_VERIFY_REQUIRED；preflight 从 manifest/CI 发现 TEST/BUILD/SMOKE 命令。全部提示层（无 hook）。
- **记录/变更**：决策与理由在 `research.md`；跨任务教训写 `tasks.md ## Implementation Notes` 并注入后续 implementer；变更 = 重跑阶段技能（merge 模式），spec.json 标志翻回；多 spec 规则 "fix the owning upstream spec first... re-run validation for dependent specs"。交接：`brief.md` 跨会话、`/kiro-impl` "safe to re-run after interruption"。
- **分发**：`npx cc-sdd@latest --claude-skills|--codex-skills|--cursor-skills|--copilot-skills|--windsurf-skills|--opencode-skills|--gemini-skills|--antigravity`（+13 种 `--lang`）→ `.claude/skills/`、`.agents/skills/`（Codex，附 `agents/openai.yaml` 与 `.codex/agents/spec-reviewer.toml`）、`.cursor/skills/`、`.github/skills/`、`.opencode/skills/`、`.gemini/skills/`、`.agent/skills/` + 共享 `.kiro/` + 每 agent 的 CLAUDE.md/AGENTS.md；子代理用各平台原生原语。体量：17 SKILL.md ≈ 133 KB（~37k tokens 按需）。
- **偷师**：spec.json 机器可读审批标志；边界注解驱动评审；结构化 status/verdict 块 + 歧义重派；任何 "done" 前的 verify-completion 门；Implementation Notes 前向传播；可返回"无需 spec"的 discovery 路由。**避免**：`-y` 滥用无阻拦；审批只是文件标志（无 CI 检查）；design.md 易膨胀。

### G.3 Agent OS（buildermethods/agent-os）
- **基本面**：MIT；5,286 stars；v3.0.0（2026-01-20，刻意做小：5 个命令）；文档邮箱门控。
- **阶段/工件**：`/plan-product`（AskUserQuestion 访谈 → `agent-os/product/{mission,roadmap,tech-stack}.md`）、`/shape-spec`（"must be run in plan mode"；Task 1 = 保存 `agent-os/specs/YYYY-MM-DD-HHMM-slug/{plan.md, shape.md(Scope/Decisions/Context/Standards Applied), standards.md, references.md, visuals/}`）、`/discover-standards`、`/inject-standards`、`/index-standards`（`agent-os/standards/index.yml`）；基础安装 `~/agent-os/{config.yml, profiles/<name>/standards/**.md}`，`project-install.sh --profile` 经 profile 继承链复制到项目。v2.x 有 6 阶段与 verifier 子代理。
- **人审**：会话式，一次一问；计划审批交给宿主 Plan Mode；无文件门。**调研**：无。**测试**：v3 无强制（实现阶段 "retired—frontier models handle this well on their own now"）；v2.1 移除 "verification bloat"，2.0.3 减少 "excessive tests writing"。
- **记录**：v1.x 有 `.agent-os/product/decisions.md`（date、`DEC-XXX`、status proposed/accepted/rejected/superseded、category、stakeholders；"Override Priority: Highest"），**v1.4.1（2025-08-18）删除**："rarely used and didn't help future development"，改为实现后 "Recaps"；v3 决策仅存 `shape.md`；标准（standards）才是持久知识（`sync-to-profile.sh` 回推基线）。
- **偷师**：标准 `index.yml` + 按需注入；profile 继承 base→profile→project；"Task 1 = 持久化 spec"；`shape.md` 记录 shaping 决策；把学到的标准同步回基线。**避免**：没人读的决策日志（让记录喂给后续步骤，否则删掉）；重复宿主功能的角色/验证器。

### G.4 PRPs（Wirasm/PRPs-agentic-eng → Wirasm/prp）
- **基本面**：MIT；2,233 stars；无 release；2026-08-17 仍在推送。"PRP = PRD + curated codebase intelligence + agent/runbook"。
- **形态**：2026 为 skills-only 插件 `prp-core`（`/prp-core:<name>`）：`/prp-prd`、`/prp-plan`、`/prp-implement`、`/prp-issue`、`/prp-prd-update`、`/prp-debug`、`/prp-commit`、`/prp-pr`、`/prp-review`、`/prp-loop`（headless `claude -p` 逐阶段）、`/prp-orchestrate`、`/prp-spike`、`/prp-research-team`…；旧命令（`prp-base-create/execute`、`prp_runner.py`、`prp_base.md` 模板）保留于 `old-prp-commands/`。**工件放在仓库之外**：`~/.prp/<project-key>/{prds/, plans/, research/, reports/, reviews/, debug/, state/prp-loop.state.json}`（worktree 共享 project key）。
- **人审**：`/prp-plan` "Hold the design gate"（缺基础件、意图不明、证据与请求矛盾、未决决策导致不同计划时停问；"Ask the user only when ambiguity changes the product contract"）；评审发现的人工处置 "are binding"。
- **调研**：旧版 "spawn as many agents and subagents as needed... we optimize for chance of success and not for speed"、`PRPs/ai_docs/`、"No Prior Knowledge" 测试、置信度 1-10；现行并行 `codebase-explorer/analyst/root-cause-analyzer` + 条件 `web-researcher` + `/prp-spike`；计划模板要求 `file:line` 证据与 Alternatives considered。
- **测试（核心思想 = 可执行验证门）**：旧模板 "Validation Loop" Level 1 语法/风格 → 2 单测 → 3 集成 → 4 创造性/领域，"Each level must pass before proceeding"；新模板每任务 **Validation** 命令 + `## Acceptance`（AC1..）+ `## Validation` 门表（focused / project gate / runtime-manual）；`/prp-implement` "Validate to green... Never report completion with a known failing required check"，以字面量 `VALIDATION: GREEN|FAILED` 结束；`--validate "<cmd>"` 给循环一个权威检查。提示层，但循环以退出码为准。
- **记录/变更**：计划的 `Risks and Decisions`、`Alternatives considered`、`Root Cause`、`Agent Notes`；实现报告 `reports/<plan>-report.md` 记录偏离/决策（"the durable handoff across context windows"）；发现处置 FIXED / NOT A FINDING / TRACKED FOLLOW-UP / DECLINED；stale-plan 门（"do not implement a knowingly stale plan"）。仅 Claude Code。
- **偷师**：可执行命令阶梯作为完成定义；"No Prior Knowledge" 完备性测试；`file:line` 证据；显式发现处置；`VALIDATION: GREEN` 哨兵供自动化；stale-plan 门。**避免**：工件放在仓库外（伤多人可追溯）；单 harness 锁定。

### G.5 compound-engineering（EveryInc/compound-engineering-plugin）
- **基本面**：MIT；24,320 stars；v3.22.1（2026-08-17）；33 个技能，从 `/workflows:*` 改名为根级 `ce-*`（skills-only）。
- **闭环**：`/ce-brainstorm`（一回合一问；写 requirements-only 计划 `docs/plans/YYYY-MM-DD-HHMM-<type>-<name>-plan.md`，frontmatter `artifact_readiness: requirements-only`，R/A/F/AE 编号）→ `/ce-plan`（并行研究：仓库、`docs/solutions/` 教训、框架文档；U-ID；每单元测试场景；`artifact_readiness: implementation-ready`）→ `/ce-work` → `/ce-simplify-code` → `/ce-code-review` → **`/ce-compound`**（写 `docs/solutions/[category]/[file].md`，bug-track / knowledge-track，frontmatter 枚举，`CONCEPTS.md`）；`/lfg` 自动驾驶（never merges）；另有 `/ce-handoff`、`/ce-worktree`、`/ce-debug`、`/ce-setup`。
- **人审**：`ce-plan` 前置范围确认（"always get the explicit checkpoint"；`confirm:auto` 可跳）；`session-settled: user-directed|user-approved` 决策不再重问、仅在证据失效时推翻；`ce-work` 剩余工作门 "apply / file tickets / accept with durable sink / stop, but never silently ship"；评审默认只报告不改（`apply:local` 才改）。
- **调研**：本地研究常开（仓库模式 + `docs/solutions/`），外部按意图；`ce-compound` Full 模式跑 Context Analyzer / Solution Extractor / Related Docs Finder + 跨 Claude Code/Codex/Cursor/Pi/omp 的会话历史探针 + **grounding validator（核验引用的路径/SHA/代码断言）**。
- **测试**：`ce-work` 每单元幂等检查；"Test discovery and evidence selection before behavior changes, plus integration coverage before any task is marked done"；出货需要 `ce-code-review` 回执或显式跳过语；`ce-code-review` 按 diff 选人格（`correctness-reviewer` 常驻；条件启用 project-standards/testing/security/performance/API contract/data-migration/reliability/adversarial/previous-comments/learnings；`deployment-verification-agent`），P0-P3 + autofix 类别，跨模型对抗同行（`codex → claude → grok → composer`）。提示层 + 结构化回执。
- **记录/变更**：`docs/solutions/` = 可检索教训，重叠评分（update vs create）+ 到 `AGENTS.md`/`CLAUDE.md` 的可发现性编辑；`docs/plans/` 决策文档；`STRATEGY.md`；变更 `ce-plan deepen`；工作期间计划正文只读（"progress derived from git, not the plan body"）。交接：`/ce-handoff` 写不可变快照到 `/tmp/compound-engineering-<uid>/ce-handoff/<repo>/<topic>.md`（或显式路径/发布），`resume` 定向后等待。
- **分发（本报告中最广）**：Claude Code、Cursor、Codex App/CLI（原生插件）、Kimi Code CLI（`.kimi-plugin`）、Cline、**Grok Build CLI（`grok plugin install`，`.grok-plugin`）**、Devin CLI、Copilot、Factory Droid、Qwen Code、**OpenCode**（`plugin` 数组）、**Pi**（`pi install git:...` + `pi-subagents`）、oh-my-pi、Antigravity CLI；一套 `skills/<skill>/SKILL.md`，"each skill seeds generic subagents with its own prompts instead of relying on standalone plugin agents, keeping the workflows portable"。**未见 DeepSeek Harness**。
- **失败模式**：HN "best results... but it burns tokens like crazy, especially in the review phase where it does reviews with 5 - 12 agents in parallel"；持续重构命名（marketplace 快照不刷新则用户静默停留旧版）；"opinionated by design"；74 open issues。
- **偷师**：闭环教训捕获（去重/重叠评分 + 可发现性检查）；计划文件上的 `artifact_readiness` 状态；`session-settled` 决策标签；剩余工作门；只报告的评审与独立的 apply 权限；围绕一套技能的每宿主原生 manifest。**避免**：无上限评审扇出；命名折腾。

### G.6 GSD（glittercowboy/get-shit-done → gsd-build（2026-06-26 归档）→ open-gsd/gsd-core）
- **基本面**：MIT；归档仓 64,687 stars（最后 v1.43.0-rc2，2026-05-17）；社区续作 open-gsd/gsd-core ≈8.3k stars，1.10.0（2026-08-08，npm 879 文件 / 11.2 MB）；作者的 TS "GSD 2"（`.gsd/`）→ open-gsd/gsd-pi（完整本地 agent）。76 个命令、30+ agent（v1.40 用 6 个 namespace router 把 eager 列表从 ~2,150 降到 ~120 tokens）；`--profile=core|standard|full`。
- **闭环**：`/gsd-new-project`（提问 → 4 个并行研究者 STACK/FEATURES/ARCHITECTURE/PITFALLS → 综合 → `REQUIREMENTS.md` → `ROADMAP.md`，加 `PROJECT.md`、`STATE.md`、`config.json`）→ `/gsd-discuss-phase N`（`CONTEXT.md`、`DISCUSSION-LOG.md`）→ `/gsd-plan-phase N`（researcher → `RESEARCH.md`；planner → `PLAN.md`；plan-checker ≤3 轮；**requirements-coverage gate（REQ-ID → plans）与 decision-coverage gate（CONTEXT 决策 → plans，阻断）**）→ `/gsd-execute-phase N`（依赖 waves、每 plan 新鲜 executor、每任务原子提交、`SUMMARY.md`、verifier → `VERIFICATION.md`）→ `/gsd-verify-work`（`UAT.md`，"honest verifier" 弃权）→ `/gsd-ship`（PR 带 REQ-ID 与决策）→ `/gsd-complete-milestone`；`/gsd-pause-work`（`continue-here.md`）/ `/gsd-resume-work`；`/gsd-extract-learnings`（`.planning/learnings/`）；`.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE,MILESTONES}.md, phases/XX/{CONTEXT,RESEARCH,PLAN,SUMMARY,VERIFICATION,VALIDATION,UAT}.md, debug/knowledge-base.md, learnings/, continue-here.md`。
- **人审**：`config.json mode: interactive|yolo`；REQUIREMENTS/ROADMAP 审批；discuss-phase 决策；`checkpoint:human-verify`（`[SUS]/[ASSUMED]` 包安装前）；`checkpoint:decision`（单向门决策，`--no-reversibility-gates` 可关）；UAT 人工签字（`human_judgment: true` 永远路由到人）；里程碑收尾 `[R]/[A]/[C]` 分诊。
- **调研（默认必做）**：阶段研究默认必做（`--skip-research` 可绕；research gate "blocks if RESEARCH.md has unresolved open questions"）；Package Legitimacy Gate（npm/PyPI/crates 注册表 API → `[OK]/[SUS]/[SLOP]`，WebSearch 来源 = `[ASSUMED]`）；仓内 `[VERIFIED: path:lines]` 引用规则。
- **测试**：多层但多为提示：plan-checker、`--tdd`、executor 验证 tracer slice、verifier、`VALIDATION.md`（Nyquist 覆盖）、SUMMARY `coverage:` 块把需求 → 测试 → 状态连起来（全 `pass` 且 `human_judgment: false` 才自动通过）、`WINDOWS.md` 破窗账本、安全 ship gate；**唯一代码级硬门是 `gsd-write-guard.js` PreToolUse hook**（阻止 ROADMAP/STATE 灾难性缩水，"the only one enforced by code rather than by instructions to a model"）。
- **记录/变更**：`STATE.md` "Living memory: position, decisions, blockers, metrics"；`PROJECT.md` "vision, constraints, decisions, evolution rules"；每阶段 CONTEXT 决策 + 覆盖门；`.planning/learnings/`、`debug/knowledge-base.md`（含 `why_not_caught` / `recurrence_guard`）；ADR 摄入（`--ingest`、`INGEST-CONFLICTS.md`）；REQ-ID 追溯到 plans/PR；`deferred-items.md` 在里程碑收尾浮出。
- **多代理/分发**：新鲜上下文子代理（各达 200K，"main context window stays at 30–40%"）、waves、worktree、workstreams/workspaces、跨 AI 评审通道（`--gemini --codex --coderabbit --opencode --qwen --cursor --agy --ollama --kimi-code`）；安装器 `npx @opengsd/gsd-core@latest` 支持 Claude Code、OpenCode、Antigravity CLI、Kimi CLI、Kilo、Codex、Copilot、Cursor、Windsurf、Cline、Hermes、Qwen、Trae、Augment、ZCode、pi（`--pi`）、VS Code 扩展；"Host-Integration Interface"（ADR-1239）每宿主适配器；每宿主生成命令/技能文件而非共享 AGENTS.md。**无 Grok Build / DeepSeek Harness**。
- **失败模式**：HN "it was all an illusion... increases the time and effort by a lot without any real improvement other than briefly making me feel more organized"（2026-01-22）、"not worth the amount of time (and additional context)... just added too much planning"（2026-05-05）、正评 "keeps token use low... /clear and it still remembers"；原 README 推荐 `claude --dangerously-skip-permissions`（这是评测中的一个发现，不是给本框架的建议）；治理动荡（作者归档 v1 转社区）；功能蔓延。
- **偷师**：新鲜上下文子代理 + 薄编排器 + 文件状态；执行前 REQ-ID 与决策覆盖门；SUMMARY `coverage:` 块；诚实验证者弃权（`human_needed`，绝不静默通过）；包合法性与 `[VERIFIED path:lines]` 引用纪律；hook 保护精选文档；namespace router 省 eager token。**避免**：蔓延与成本；yolo 模式 + 跳过权限文化；版本/所有权动荡。
## H. 横向对比表

（"硬度"图例：**硬** = 脚本/CLI/hook 以退出码阻断，CI 可复跑；**软** = 仅提示词/清单；**半** = 脚本校验存在但只覆盖局部。数据截至 2026-08-17。）

| 框架 / 版本 / 许可 | 阶段与核心工件 | 人审位置（形态） | 调研 | 测试/验证硬度 | 决策/教训记录 | 交接/功能总结 | 多人/多 agent | 跨 harness 分发 | 体量 |
|---|---|---|---|---|---|---|---|---|---|
| **Trellis** 0.6.15 / AGPL-3.0-only / 13,971★ | Plan→Execute→Finish；`.trellis/{workflow.md, spec/, tasks/<t>/{prd,design,implement,jsonl×2,research/}, workspace/journal}` | 建任务同意、start 前 review、提交计划一次确认（全**软**：`task.py start/archive` 不校验工件） | `1.2 [optional]`；维护者自用仅 18% 任务有 research/ | 软（check 清单 + lint/typecheck；`tdd` 变体仍是提示层）；无 CI | update-spec 六模板入 spec（散文混排）；break-loop 五分类（on-demand）；无 ADR/问题日志 | 会话级 journal（2000 行滚动）；**无功能级总结**（#326 被推迟） | 开发者身份 + 每会话任务指针 + channel 运行时（重型可选）；journal 合并冲突多 | 单源模板 + 22 平台 configurator（含全部六 harness）+ hook/pull 双模式 | SessionStart ~5 KB + 面包屑 <1 KB；Python 7.3k 行 |
| **Spec Kit** 0.16.4 / MIT / 129,645★ | constitution→specify→clarify→plan→checklist→tasks→analyze→implement→converge；`specs/NNN/…` | clarify 一问一答、implement 前 checklist 停问（软）；**workflow engine gate（硬，持久化 run）** | plan Phase 0 **必做**（措辞）→ `research.md` Decision/Rationale/Alternatives；无脚本核验 | 测试默认 OPTIONAL；脚本仅查文件存在；社区 tdd/verify-tasks/gates 补硬门 | research.md + Complexity Tracking + Clarifications 日志；无 ADR/教训 | `feature.json` 指针 + tasks `[X]`；**无总结/交接** | `[P]` 标记 + 多 agent 安装（hash manifest）；无锁 | 39 集成，"single template, many renderers"，sh/ps/py 三套脚本 | 命令 134 KB≈33k tok（28% 样板） |
| **BMAD** 6.11.0 / MIT / 51,977★ | Analysis→Planning→Solutioning→Implementation，一切汇于 `bmad-build`；spec-{slug}.md、sprint-status.yaml | build CHECKPOINT-1（Approve&continue/stop/Review）+ frozen-after-approval + Ask-First 层 + 评审分诊回人（软但精细）；TEA hook（**硬**） | deep-recon（可选但装备最全：research firewall、来源+日期、staleness map）；brainstorm 108 技法 | Verification-Gap/矩阵测试审计（"exists but did not run = missing"）为软；`sprint_plan.py`/`render_skill.py`/TEA `tea-enforce.cjs` 为硬 | `.memlog.md`（append-only decision/assumption/…）+ Spec Change Log + retro（证据化 verdict）+ correct-course 变更单 | spec 状态驱动恢复；每工作流新鲜会话；无统一功能总结（retro 近似） | sprint-status 共享账本；无锁（并行 2/5 分）；BMad Loop tmux 编排 | 47 平台复制 SKILL.md（多数走 `.agents/skills`）；web bundles | 每次运行 just-in-time ~60 KB；$85–200/功能（对比实测） |
| **OpenSpec** 1.9.0 / MIT / 65,144★ | propose→(explore)→apply→verify→archive；`openspec/specs/` + `changes/<id>/` delta | "Planning boundary" 停等（软，曾被 Codex/Cursor 绕过 #232/#262） | 无（explore 是自由讨论） | **`openspec validate --strict` / `--archived` 硬校验 spec 格式**（唯一 CI 级门）；测试无要求 | design.md Decisions；archive 目录 = 审计线；**delta 语法是最好的需求变更模型** | `status --json` + tasks 勾选；无总结 | 并行 change 目录；MODIFIED 冲突晚发现（#1387） | 37 目标生成 skills/commands（`openspec update` 重生成） | 6–12 skill×120-170 行；bake-off：2× 时间 3× API 成本 |
| **Superpowers** 6.3.0 / MIT / 272,963★ | brainstorm(Spike/Bounded/Architectural)→plan→SDD 执行→finish branch；docs/superpowers/{specs,plans} | 设计逐节确认 + `<HARD-GATE>`（软）；"审批不缩水，工件缩水" | **无 research 技能**（只探索代码库） | Iron Law TDD + verification 证据表 + RED/GREEN 证据（全软）；reviewer 只读 | 仅 design/plan/commits；SDD ledger 完工即删；拒绝 handoff 功能（#931） | plan 即交接；ledger 抗 compaction | SDD 每任务新鲜子代理 + 双评审 + 5 轮熔断；单人单分支世界观 | Claude 插件 + 13 harness 港口（bootstrap 即集成）；**无 DSH** | 14 技能 138.6 KB；bootstrap 3.5 KB；68M/120M token 案例 |
| **Kiro** IDE 1.0.309 / 专有 / — | requirements(EARS)→design→tasks→执行；.kiro/specs、steering、hooks | **每阶段显式批准 + checkpoint 屏（产品级硬）**；Quick Spec 免门 | Analyze Requirements（SMT 找矛盾/歧义）设计前检查 | PBT 从 EARS 抽取（可选）；hooks（PostTaskExec 跑测试）可做硬门 | 三工件 + design decisions；无教训机制 | specs 入 git 跨 IDE/CLI/Web；无总结 | 中央 spec 仓/submodule；waves 并行（同文件互斥） | 专有多端（IDE/CLI/Web/Mobile）；AGENTS.md 支持 | credits 计费：spec 任务 >1 credit，refinement 烧钱 |
| **Conductor** 0.4.1→plugin / Apache-2.0 / 3,701★ | setup(product/tech-stack/workflow)→new-track(spec+plan)→implement→review/revert | 每工件 Approve/Revise/Refine + 每阶段 PAUSE 等 yes（软，#30 被绕过） | 无 | workflow.md 强制 TDD + >80% 覆盖 + git notes 报告（软） | tech-stack.md 先记录再偏离；git notes；无 ADR | plan 勾选 + tracks.md + resume.py | 单 agent；共享 conductor/ 目录 | Gemini ext→Antigravity/Claude 插件（宿主转向即断） | 6 skill ≈70 KB |
| **cc-sdd** 3.0.2 / MIT / 3,619★ | discovery→steering→spec-init→requirements(EARS)→design→tasks→impl→validate-*；.kiro/specs | **spec.json approvals.{requirements,design,tasks}.approved 数据化门**（软执行，`-y` 可绕） | design 阶段并行研究子代理→research.md（内建） | impl：TDD 子代理 + 独立 reviewer + verify-completion（VERIFIED/NOT_VERIFIED）+ GO/NO-GO（软但结构化） | research.md 决策；Implementation Notes 前传 | brief.md 跨会话；spec-status | 每任务新鲜子代理；spec 边界并行 | 8 agent×17 skill 同集生成 | 133 KB 按需 |
| **Agent OS** 3.0.0 / MIT / 5,286★ | plan-product→shape-spec→(宿主 plan mode)；standards 三层 | 宿主 Plan Mode 承担（软） | 无 | v3 无测试强制（v2 verifier 被删） | **decisions.md 已删**（"rarely used"）；standards 是持久知识 | specs 目录即记忆 | profile 继承 base→profile→project | Claude Code 为主 | 极轻（22 文件） |
| **PRPs** dev 分支 / MIT / 2,233★ | prd→plan→implement→review→loop；工件在 `~/.prp/`（仓外） | plan 的 design gate（软）；评审处置有约束力 | 并行探索 agent + spike；"No Prior Knowledge" 测试 | **4 级可执行验证门 + `VALIDATION: GREEN` 哨兵**（软壳硬芯：以退出码为准） | 计划 Decisions/Alternatives + 实现报告 + 处置四态 | report = "durable handoff"；stale-plan 门 | worktree + orchestrate | 仅 Claude Code | ~16 技能 |
| **compound-eng** 3.22.1 / MIT / 24,320★ | brainstorm→plan→work→review→**compound**（教训入 docs/solutions/） | 范围确认 + session-settled 决策标签 + 残余工作门（软） | 本地研究常开 + grounding validator 验证引用 | 评审回执 + 跨模型对抗评审（软）；"progress derived from git" | **docs/solutions/ 可检索教训库（重叠评分 + 可发现性）** | `/ce-handoff` 不可变快照 + resume | 5-12 评审 agent 并行（token 大户） | 14+ harness 原生插件（含 Grok Build、OpenCode、Pi）；无 DSH | 33 技能；评审期烧 token |
| **GSD** core 1.10.0 / MIT / 64,687★(旧) | new-project→discuss→plan→execute→verify→ship→milestone；.planning/ | interactive/yolo + checkpoint:decision/human-verify + UAT 人签（软）+ **write-guard hook（硬）** | **默认必做**（research gate 阻断未决问题）+ 包合法性门 + `[VERIFIED path:lines]` | plan-checker + verifier + SUMMARY coverage 块 + 诚实弃权（软）；唯一硬门是文档保护 hook | STATE.md decisions + learnings/ + debug/knowledge-base（why_not_caught/recurrence_guard）+ REQ-ID 追溯 | **每 plan SUMMARY.md + continue-here.md**（最接近用户要的 handoff） | 新鲜子代理 waves + workstreams + 跨 AI 评审 | 16+ harness 安装器（无 Grok/DSH） | 879 文件/11.2 MB；HN 毁誉参半 |

## I. 值得采纳的机制（合并清单，附来源）

**需求访谈与澄清（R-01、P-01）**
1. 有界澄清预算 + 优先级排序 + 一次一问带推荐答案 + 答案写回所属章节并留日期化日志（Spec Kit `/clarify`：≤5 问、Impact×Uncertainty、`## Clarifications`；§B）。
2. 访谈契约与证据规则（Trellis brainstorm："Interview me relentlessly"、"If a question can be answered by exploring the codebase, explore the codebase instead"、PRD 无损收敛 pass；§A.1）。
3. 任务三分类决定工件重量、但审批门不缩水（Superpowers Spike/Bounded/Architectural "The ratchet is one-way … the approval gate never does"；§E）。
4. 需求条目结构化 + 可校验：EARS 原子验收（Kiro/cc-sdd）+ `#### Scenario:` 强制（OpenSpec validate）+ REQ-ID（GSD）；§F、§D、§G.6。
5. 设计前需求一致性检查（Kiro Analyze Requirements SMT；Spec Kit analyze 覆盖矩阵；§F、§B）。

**调研与逐条决策确认（R-02、P-01）**
6. research.md 三段式 Decision / Rationale / Alternatives considered 作为规范工件（Spec Kit plan Phase 0；§B）。
7. 研究防火墙与来源纪律："Never conclude from training data alone"、每断言带 publisher/date/access date、staleness map（BMAD deep-recon；§C）；包合法性门 `[OK]/[SUS]/[SLOP]` 与 `[VERIFIED: path:lines]`（GSD；§G.6）。
8. 决策逐条向人确认可组合实现：Spec Kit 选项表 + Conductor 的"选择题 + (Recommended) + Other" + cc-sdd 的 `approvals.*.approved` 数据标志 + Spec Kit workflow engine 的持久化 approve/reject（§B、§G.1、§G.2）。
9. 未确认假设显式标记并冻结：BMAD `<frozen-after-approval>` + "Ask First: DECISIONS_REQUIRING_HUMAN_APPROVAL … HALT and ask"（§C）。

**测试与验证（R-03、R-09）**
10. 可执行验证门阶梯 + 完成哨兵：PRPs Level 1-4 + "Never report completion with a known failing required check" + `VALIDATION: GREEN`（§G.4）。
11. 测试证据审计："a covering test that exists but did not run counts as missing"、"never edit the expectation to match the code"（BMAD 矩阵审计）；"the audit re-checks it against git history rather than taking the log's word for it"（Spec Kit 社区 tdd 扩展）；RED/GREEN 命令+输出作为报告必填（Superpowers SDD）；§C、§B、§E。
12. 声称→证据表（Superpowers verification-before-completion："If you haven't run the verification command in this message, you cannot claim it passes"；§E）。
13. 把硬门放进脚本/hook/CI 而非提示：OpenSpec `validate --strict`/`--archived`、TEA `tea-enforce.cjs`、GSD write-guard、Kiro PostTaskExec shell hook、Spec Kit `{SCRIPT}` 三套一致脚本（§D、§C、§G.6、§F、§B）。
14. 诚实验证者弃权：`human_needed` / MANUAL_VERIFY_REQUIRED，绝不静默通过（GSD、cc-sdd；§G.6、§G.2）。

**记录体系（R-04、R-05、P-02）**
15. append-only 决策流水：BMAD `memlog.py --type decision|assumption|override…`（§C）；Agent OS 教训——决策日志必须被后续步骤消费否则会死（decisions.md 被删的原因 "rarely used and didn't help"；§G.3）。
16. 教训库闭环：compound-engineering `docs/solutions/`（分类 frontmatter + 重叠评分 update-vs-create + 写完检查可发现性）；GSD `debug/knowledge-base.md` 的 `why_not_caught`/`recurrence_guard` 字段（§G.5、§G.6）。
17. 问题→规则/测试闭环：Trellis break-loop 根因五分类 + "The analysis is worthless if it stays in chat"（§A.1）；BMAD retro 每条发现带 file/line/commit/log 且 action items 回写状态文件（§C）。
18. 需求变更单：OpenSpec delta（ADDED/MODIFIED/REMOVED/RENAMED + REMOVED 必带 Reason+Migration + archive 审计线）为最佳模型；BMAD correct-course 的影响分析/回滚三选一提案；§D、§C。

**交接与功能总结（R-10、P-04）**
19. 每计划/阶段 SUMMARY + `coverage:` 块（需求→测试→状态）+ `continue-here.md`（GSD；§G.6）；`/ce-handoff` 不可变快照（§G.5）；plan 本身作为跨会话交接物 + ledger 抗 compaction（Superpowers；§E）。
20. 状态=文件存在性 + `--json` 机器可读（OpenSpec instructions/status；Trellis `task.py --json`、工件驱动恢复路由；BMAD spec 状态驱动 step 恢复；§D、§A、§C）。

**上下文/token 预算（R-08）**
21. 上下文清单（manifest）而非全量注入：Trellis `implement.jsonl/check.jsonl`（只列 spec/research，不列代码文件）+ 0.6.9 的 32/64/128 KiB 封顶（§A.2、§A.10）。
22. 小 bootstrap + 渐进披露：Superpowers 3.5 KB SessionStart + 触发式 description；BMAD "NEVER load multiple step files simultaneously" + `pick_methods.py` 按需取目录；GSD namespace router 2,150→120 tokens；spec 尺寸预算 900–1600 tokens（BMAD）；§E、§C、§G.6。
23. 新鲜上下文子代理 + 文件而非粘贴历史（Superpowers review-package；GSD "main context window stays at 30-40%"；BMAD 无上下文评审者 + 不同模型评审；§E、§G.6、§C）。

**多人/多 agent（R-07）**
24. 开发者身份 + 每会话活动任务指针 + 每开发者记录文件（Trellis；§A.7）；`merge=union` 处理日志冲突仍不彻底——记录应随功能 PR 走而非脚本自动提交（Trellis 教训 #284/#303/#415；§A.11）。
25. 每任务显式指定模型 + 轮数熔断 + 裁决入账（Superpowers SDD；§E）；跨模型对抗评审（compound-engineering `codex→claude→grok→composer`；§G.5）。

**跨 harness 分发（R-06）**
26. 单源模板 + 每平台薄渲染器 + 文件 hash manifest（Spec Kit IntegrationBase / Trellis configurators + `.template-hashes.json`；§B、§A.3）；`.agents/skills/`（agentskills.io）作共享层 + AGENTS.md 受管块（Trellis/BMAD/Codex/DSH 均已采用；§A.3、§C）。
27. **任何必做步骤不得依赖 hook**：hook 只做加速，必做门放在"工件状态 + CI 脚本"里（证据：Codex hook 需用户级开关+逐个批准、DSH 无 session-start hook、Copilot/Gemini hook 无法改写子代理提示、Trellis 全部 pull-based 回退设计；§A.3、§A.10）。

## J. 应避免的错误（合并清单，附来源）

1. **散文门禁**：把 "must/ERROR/gate" 写成提示而无脚本核验 → 步骤被静默跳过、幻影完成（Trellis 0.5.0 manifest 自述；Spec Kit 社区被迫造 verify-tasks；OpenSpec #232/#262 审批被绕；Conductor #30；BMAD #2003 "superficial fixes"）。
2. **测试可选却宣传 test-first**（Spec Kit "Tests are OPTIONAL" vs "NON-NEGOTIABLE" 宣言；Trellis 默认工作流仅 lint/typecheck）。
3. **调研可选**导致选型草率（Trellis `1.2 [optional]` + 自用 18%；Superpowers/OpenSpec/Conductor/Agent OS 干脆没有）——本框架必须把调研做成有工件、有门的必经阶段。
4. **记录不成体系**：会话流水日志 ≠ 知识（Trellis journal 增长/冲突/启动不注入）；知识一次性沉入散文 spec 后无复发升级路径（AGE 对 Trellis 的批评）；只写不读的账本（BMAD deferred-work #2199；Agent OS decisions.md 被删）；决策记录随工作区删除（Superpowers SDD）。
5. **无功能级 handoff**：Trellis #326/#288/#339 被推迟、Spec Kit/OpenSpec 无此物、Superpowers 拒绝 #931——这是本框架的直接差异化点。
6. **上下文失控**：SessionStart 超限被静默截断（Trellis #154 曾 29 KB）；命令样板重复 28%（Spec Kit）；无上限内联引用文件（Trellis #441/#464）；评审扇出 5-12 agent（compound-eng）；1% 规则强加载（Superpowers 68M/120M token 案例）。
7. **仪式随任务不分级**：小改动也走全流程 → 用户逃回裸 agent（BMAD "战列舰在池塘钓鱼"、Kiro credits 焦虑、GSD "it was all an illusion"、Superpowers "改个文案也要走 Brainstorm"）。正解是工件分级 + 审批不分级。
8. **平台蔓延与双运行时**：22+ 平台 → changelog 大半是适配器修复；Node+Python 双栈 → Windows GBK/路径/版本长尾（Trellis #218/#476/#483/#503；BMAD v6.11 反而新增 uv+Python 硬依赖）。六 harness 已定的本项目应选"一层共享 skills + 最薄桥接"，避免为每平台造 hook。
9. **身份/状态耦合陷阱**：feature 身份绑 git 分支（Spec Kit 2026 才解耦）；全局 `.current-task` 指针互踩（Trellis 0.5.0 才改）；会话身份在 Windows/`--continue`/fork 下拿不到导致 degraded（Trellis 长期 issue）。
10. **脚本自动提交记录文件** → 合并冲突与扫入无关文件（Trellis #284/#303/#415，每任务 3 个 commit）。
11. **配额式评审与过度生成**：强制"每次至少找 N 个问题"制造捏造发现（BMAD #1332）；自动生成上百个无意义测试（Spec Kit #1784）；过度指定计划把实现者变抄写员（Superpowers #895）。
12. **改名折腾与 breaking 频率**：命令/技能在 minor 间更名且 docs 滞后（BMAD #2690；compound-eng v2→v3；GSD 治理动荡；Trellis 六周两个 breaking minor）。
13. **AGPL 逐字复用风险**：Trellis 双包均 AGPL-3.0-only 且商业衍生需联系 Mindfold——新框架必须 clean-room 重写机制（§A.9、§A.11）。
14. **把关键能力锁在单一宿主**（Kiro PBT 仅 IDE；PRPs 仅 Claude Code；Conductor 随宿主转向断裂）。

## K. 对本框架设计的直接含义（映射需求）

- **R-01/P-01**：采纳 Trellis 访谈契约 + Spec Kit 澄清预算与写回 + Superpowers 三分类（工件缩放、审批不缩放）；需求条目用 REQ-ID + EARS/Scenario 双写并以 CLI 校验（OpenSpec 模式）。
- **R-02**：调研必须成为带工件的必经阶段（Spec Kit research.md 三段式 + BMAD 来源纪律 + GSD research gate 阻断未决问题）；逐条确认用"决策清单文件 + 每条 status: proposed/confirmed/provisional + 确认记录"，机器可查（cc-sdd approvals 标志 + Spec Kit workflow verdict 的合成）。
- **R-03/R-09**：功能↔测试追溯表（GSD coverage 块）+ 测试证据（RED/GREEN 输出、"ran and passed" 审计）+ 一份门禁脚本本地/hook/CI 同源（Spec Kit {SCRIPT} 契约 + OpenSpec --archived 模式）。这是全场空白，最值得做硬。
- **R-04/R-05/P-02**：三层记录——append-only 决策流水（memlog）、问题日志带闭环字段（why_not_caught/recurrence_guard）、教训库（docs/solutions 模式 + 可发现性检查）；决策与假设分开（frozen-after-approval + Ask First）。
- **R-10/P-04**：功能完成 = 归档前必须生成 handoff 总结（项目现状 + 本功能做了什么/为什么/证据/剩余），作为硬门（归档脚本校验存在性）——GSD SUMMARY + ce-handoff 的合成，填 Trellis 最大缺口。
- **R-06**：核心 = 仓库内工件 + 一个跨平台 CLI（校验/状态/门禁）；分发 = `.agents/skills/` 共享 SKILL.md + AGENTS.md 受管块 + 每 harness 最薄入口；hook 仅增强。DSH/Grok Build 均已原生读 skills（Trellis 0.6.8/0.6.15 与 Superpowers/compound-eng 港口证明可行）。
- **R-08**：manifest 式上下文 + 字节封顶 + 小 bootstrap + 按需加载；R-11 用 OpenSpec delta 变更单；R-15 审批点全部落为可查验的文件状态而非对话记忆。

## L. References（主要来源；全部访问日期 2026-08-17，除注明）

**Trellis（本地）**：`C:\Users\NF3317\AppData\Roaming\npm\node_modules\@mindfoldhq\trellis\`（v0.6.5：`dist/templates/**`——workflow.md、common/skills/*、common/commands/*、claude|codex|opencode|pi 等平台模板、shared-hooks/*.py、trellis/scripts/**、migrations/manifests/*.json）；`node_modules/@mindfoldhq/trellis-core/dist/**`（2026-08-21 复核，无内嵌模板）。
**Trellis（远端）**：https://github.com/mindfold-ai/Trellis ；https://api.github.com/repos/mindfold-ai/Trellis ；https://registry.npmjs.org/@mindfoldhq/trellis ；https://docs.trytrellis.app/changelog/v0.6.6 … v0.6.15 与 /v0.4.0、/v0.5.0、/v0.6.0、/v0.7.0-beta.*；https://docs.trytrellis.app/start/how-it-works 、/advanced/roadmap 、/advanced/appendix-f 、/advanced/channel 、/blog/*；https://raw.githubusercontent.com/mindfold-ai/Trellis/main/LICENSE 、COPYRIGHT、packages/cli/src/templates/**；issues/discussions：https://github.com/mindfold-ai/Trellis/issues/ 编号 141,145,154,182,184,190,191,193,195,197,211,217,218,226,234,237,240,241,242,243,251,256,260,263,267,269,274,284,288,292,298,302,303,320,323,326,328,339,340,355,370,379,383,385,386,415,416,417,426,441,444,446,459,464,476,483,500,503,511,514,521,522,525,530,537,546,549,553；marketplace：https://raw.githubusercontent.com/mindfold-ai/marketplace/main/index.json 与 workflows/tdd/workflow.md。中文评测：https://juejin.cn/post/7638044535416176692 、7666404460445564943、7648130407951908879、7650046834333171750、7649754424470749194、7656630532714168355、7620826561293320235、7638465945442467891；CSDN 两篇（见 §A.11）。
**Spec Kit**：https://github.com/github/spec-kit ；https://raw.githubusercontent.com/github/spec-kit/main/templates/commands/ 下 specify/clarify/plan/tasks/analyze/checklist/implement/constitution/converge 与 templates/*.md、scripts/bash/*、workflows/speckit/workflow.yml、extensions/catalog*.json、docs/**；本地实装 `specify init` 0.16.4；issues 617/1191/1401/752/609/1147、discussions 152/1784、PR 2118；评论：https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html ；https://blog.scottlogic.com/2025/11/26/putting-spec-kit-through-its-paces-radical-idea-or-reinvented-waterfall.html ；https://www.thoughtworks.com/radar/languages-and-frameworks/github-spec-kit ；掘金 7605885766167756852、7605494530017165352、7603781883974385683、7666700111078768655。
**BMAD**：https://github.com/bmad-code-org/BMAD-METHOD （v6.11.0）与 raw src/core-skills、src/bmm-skills、docs、tools/installer/ide/platform-codes.yaml；TEA：https://github.com/bmad-code-org/bmad-method-test-architecture-enterprise （1.23.1）；bmad-loop；issues 1332/2003/2178/2199/2337/2690；评论：https://ranthebuilder.cloud/blog/i-tested-three-spec-driven-ai-tools-here-s-my-honest-take/ ；https://guillim.github.io/ai/development/2026/02/08/bmad-method-disappointment.html ；https://kopanev.me/blog/2026-02-22-bmad-gsd-methodology-graveyard/ ；dev.to arch4g；HN item 47756473/47253518/48005233；掘金 7657070407262421007、7647063256624447540。
**OpenSpec**：https://github.com/Fission-AI/OpenSpec （v1.9.0）+ raw docs/**、CHANGELOG；issues 232/258/262/584/1139/1387/1485/1529、PR 1501、discussion 1159；codemyspec 评论（2026-06-03）；cnblogs（2026-05-15）。
**Superpowers**：本地 `C:\Users\NF3317\.claude\plugins\cache\claude-plugins-official\superpowers\6.3.0\`（hooks/hooks.json、skills/*/SKILL.md 全文）；https://github.com/obra/superpowers （v6.3.0，2026-08-12）；issues 73/331/404/414/429/446/743/750/781/895/892/931/1194/1246/1751/1918/1988/2017；HN "Superpowers 6"；xai-org/plugin-marketplace；openai/plugins（2026-08-16 归档）；cnblogs 中文评测。
**Kiro**：https://kiro.dev/docs/specs/ 、docs/steering/、docs/hooks/、docs/cli/、pricing/、changelog/（2026-08-17 抓取）；dev.to 2025-09-13 评测；r/kiro（部分 unverified）；issue 2250、10275。
**Conductor / cc-sdd / Agent OS / PRPs / compound-engineering / GSD**：各仓库 README/SKILL.md/CHANGELOG raw 文件与 GitHub API（详见 §G 内联引用）：gemini-cli-extensions/conductor；gotalab/cc-sdd；buildermethods/agent-os；Wirasm/prp；EveryInc/compound-engineering-plugin（v3.22.1）；gsd-build/get-shit-done、open-gsd/gsd-core；HN Algolia 评论 46721845、48019386、48019245、47662753、46909930、48020962。
**其他**：https://api-docs.deepseek.com/quick_start/agent_integrations/harness/ 与 …/reasonix/ （DeepSeek Harness 与 Reasonix 为两个不同集成）。

> 注：本报告调研主体完成于 2026-08-17（含六个并行子流的原始报告，存档于会话 scratchpad `S1…S6`），2026-08-21 复核 trellis-core 并成稿。WebSearch 配额在研究后期耗尽，Reddit/X/知乎/linux.do 等有反爬的来源未能直接核验处均已标注 unverified。
