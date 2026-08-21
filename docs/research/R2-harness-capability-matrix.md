<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# R2 — 六大 Harness 扩展机制能力矩阵（2026-08 现状）

> 研究流 R2 报告。调研主体完成于 2026-08-17（本机实测 + 官方文档/仓库在线核验），2026-08-21 收尾并对快变事实（最新版本号/changelog）做了廉价复核。所有事实均标注来源（URL 或本地路径/命令）与访问日期；无法核实处显式标注"未核实"。本报告不读取 E:\program\trel 与 E:\program\kk。

**本机实测版本**（`--version`，2026-08-17）：Claude Code 2.1.233；Codex CLI 0.144.1；OpenCode 1.18.18；Grok Build 1.0.4 (d846eb93d9)。Pi 未安装（npm latest 0.84.2，2026-08-17/21 核验）；DeepSeek Harness 未安装（npm `@deepseek-ai/dsh` 0.1.0-rc.7，2026-08-21 核验）。

**上游最新版**（2026-08-21 复核）：Claude Code changelog 顶部 2.1.238；Codex GitHub releases 0.149.0（stable）/0.150.0-alpha.1；OpenCode npm 1.18.19。与 08-17 调研结论无机制级差异。

**置信度标记**：`[高]`=本机实测或官方文档明文；`[中]`=官方文档但可能随版本漂移/表述不全；`[低]`=推断或二手信息，需复核。

---

## 目录

1. [各 Harness 逐项能力档案](#1-各-harness-逐项能力档案)
2. [DeepSeek Harness 身份判定](#16-deepseek-harness-dsh)
3. [大矩阵表](#2-能力大矩阵)
4. [零适配最小公倍数（LCD）](#3-零适配最小公倍数lcd)
5. [每 Harness 桥接方案](#4-每-harness-桥接方案复用一套规范文件)
6. [硬门禁（可阻断）能力对比](#5-硬门禁能力哪些-harness-能真正阻断一步)
7. [CI 无头调用配方](#6-headlessci-调用配方)
8. [已知限额汇总](#7-已知限额汇总)
9. [跨 Harness 标准现状](#8-跨-harness-标准现状agentsmd--agent-skills--acp)
10. [对框架设计的含义](#9-对框架设计的含义)
11. [References](#references)

---

## 1. 各 Harness 逐项能力档案

### 1.1 Claude Code（v2.1.233 本机；上游 2.1.238）

**指令文件** `[高]`
- 只读 `CLAUDE.md`，**不原生读 AGENTS.md**。官方 memory 文档原话："Claude Code reads `CLAUDE.md`, not `AGENTS.md`"，推荐在 CLAUDE.md 里写一行 `@AGENTS.md` import，或建符号链接（Windows 上建 symlink 需管理员/开发者模式，官方推荐用 `@AGENTS.md` import）。
- 发现顺序（加载序从宽到窄）：managed policy（macOS `/Library/Application Support/ClaudeCode/CLAUDE.md`；Linux/WSL `/etc/claude-code/CLAUDE.md`；**Windows `C:\Program Files\ClaudeCode\CLAUDE.md`**，也可用 managed-settings.json 的 `claudeMd` 键内嵌）→ `~/.claude/CLAUDE.md` → 从文件系统根到 cwd 逐级目录的 `CLAUDE.md`/`CLAUDE.local.md`（全部拼接，越靠近 cwd 越后读）→ 子目录 CLAUDE.md **惰性加载**（Claude 读到该目录文件时才注入）。
- `@path` import：相对/绝对路径，递归最多 **4 跳**；代码块/反引号内的 `@` 不解析；项目文件里指向工作目录外的 import 首次弹批准对话框。
- `.claude/rules/*.md`（项目）与 `~/.claude/rules/`（用户）：递归发现、支持 symlink；可用 YAML frontmatter `paths:` glob 做**路径条件加载**（brace 展开预算：每条 rule 共 1000 个展开 pattern / 4 MiB）。
- 尺寸建议：CLAUDE.md 建议 <200 行（无硬截断）；`claudeMdExcludes` 可按 glob 排除 monorepo 里他队的 CLAUDE.md。块级 HTML 注释注入前被剥离。
- `/init` 生成 CLAUDE.md（`CLAUDE_CODE_NEW_INIT=1` 时会读 AGENTS.md、.cursor/rules、.github/copilot-instructions.md 等）；`/import`（v2.1.213+）与 CLI `claude import codex|gemini` 可一次性导入他家配置（指令文件→CLAUDE.md、MCP、commands、subagents、skills）。

**Skills** `[高]`
- 官方声明遵循 **Agent Skills 开放标准（agentskills.io）**并做了扩展。目录：企业 managed、`~/.claude/skills/<name>/SKILL.md`、项目 `.claude/skills/`（cwd 起向上每个父目录直到仓库根都扫）、插件 `<plugin>/skills/`；**嵌套** `.claude/skills/`（子目录）惰性加载。**不扫 `.agents/skills`**（文档无此路径）。
- Frontmatter（Claude Code 全集）：`name, description, when_to_use, argument-hint, arguments, disable-model-invocation, user-invocable, allowed-tools, disallowed-tools, model, effort, context: fork, agent, background, hooks, paths, shell(bash|powershell), metadata, license, compatibility(≤500 字符)`。标准外字段在 claude.ai/Skills API 通道会报 "Unexpected key(s)"（spec 只允许 name/description/license/compatibility/metadata/allowed-tools）。
- 调用：skills 即 slash command（`/skill-name`，目录名决定命令名；插件为 `/plugin:skill`；嵌套冲突用 `/apps/web:deploy` 限定名）；`.claude/commands/*.md` 旧 custom commands 已**合并进 skills**（同名时 skill 优先）。可一条消息堆叠最多 1+5 个 skills。
- 渐进披露：仅 name+description(+when_to_use) 常驻上下文；正文调用时载入并**在会话内持续**；压缩后重注入（每 skill 上限 5,000 tokens、总计 25,000 tokens，最旧先丢）。
- 限额：单条列表项 description+when_to_use 合并截断于 **1,536 字符**（`skillListingMaxDescChars` 可调）；整张 skills 清单预算 = **模型上下文窗口的 1%**（`skillListingBudgetFraction` 或 `SLASH_COMMAND_TOOL_CHAR_BUDGET` 覆盖），超预算按"最少使用"先砍描述。
- 动态注入：`` !`cmd` `` 与 ```` ```! ```` 块在展开时执行（`shell: powershell` 可切 PowerShell；`disableSkillShellExecution` 可全局关闭）；替换变量 `$ARGUMENTS/$1..$9/$named/${CLAUDE_SKILL_DIR}/${CLAUDE_PROJECT_DIR}/${CLAUDE_SESSION_ID}/${CLAUDE_EFFORT}`。
- `allowed-tools` 授权仅**当轮**有效；不受工作区信任门控（`-p` 未信任目录也生效——需注意安全）。

**Hooks** `[高]`
- 配置位置：`~/.claude/settings.json`、`.claude/settings.json`（需工作区信任）、`.claude/settings.local.json`、managed settings、插件 `hooks/hooks.json`、**skill/agent frontmatter**（`once: true` 支持）、`--settings`。
- 事件（2026-08 完整清单，30 个）：`SessionStart, Setup, UserPromptSubmit, UserPromptExpansion, PreToolUse, PermissionRequest, PermissionDenied, PostToolUse, PostToolUseFailure, PostToolBatch, Notification, MessageDisplay, SubagentStart, SubagentStop, TaskCreated, TaskCompleted, Stop, StopFailure, TeammateIdle, InstructionsLoaded, ConfigChange, CwdChanged, DirectoryAdded, FileChanged, WorktreeCreate, WorktreeRemove, PreCompact, PostCompact, Elicitation, ElicitationResult, SessionEnd`。
- 可阻断事件：`PreToolUse`（deny/ask/allow + `updatedInput` 改写入参）、`UserPromptSubmit`、`UserPromptExpansion`、`PostToolBatch`、`Stop`、`SubagentStop`、`TeammateIdle`、`TaskCreated`、`TaskCompleted`、`ConfigChange`、`WorktreeCreate`、`Elicitation(Result)`。
- 5 种 handler：`command`（stdin JSON→exit code/stdout JSON）、`http`（POST，allowlist `allowedHttpHookUrls`）、`mcp_tool`、`prompt`（LLM 判定，默认 30s）、`agent`（带工具的子代理判定，默认 60s）。
- 退出码语义：`0` 成功（stdout JSON 解析）；`2` **强制阻断**（JSON `allow` 也压不掉；stderr 作为理由）；其他码=非阻断错误（若 stdout JSON 合法仍按 JSON 决定；`WorktreeCreate` 例外：任何非零都算失败）。
- JSON 输出：`continue/stopReason/systemMessage/suppressOutput/terminalSequence` + `hookSpecificOutput.permissionDecision(allow|deny|ask)/permissionDecisionReason/updatedInput/additionalContext/decision(block)/reason/retry`。字符串截断于 10,000 字符。
- 超时：command/http/mcp_tool 默认 **600s**（UserPromptSubmit 降为 30s、MessageDisplay 10s）；`async: true` 后台执行、`asyncRewake` exit 2 时唤醒 Claude。
- **`-p` 无头模式也运行 hooks**（未信任目录的项目 hooks 在 `-p` 下会直接跑——用 `--bare` 关掉）。Windows：`shell` 字段 `bash|powershell`，无 Git Bash 时默认 powershell。

**Subagents / 多代理** `[高]`
- 定义：`.claude/agents/*.md`（递归）、`~/.claude/agents/`、插件 `agents/`、`--agents '<json>'`、managed。frontmatter：`name, description, tools, disallowedTools, model, permissionMode, maxTurns, skills(预载), mcpServers, hooks, memory(user|project|local), isolation: worktree, background, effort, color, initialPrompt`。
- 内置：Explore、Plan（跳过 CLAUDE.md/git status）、general-purpose；`subagent_type:"fork"` 继承全量对话（2.1.232 起默认开启）。
- 并行：默认并发 **20**（`CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`）；嵌套深度默认 **3**（`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`）；后台执行为默认，完成后可用 `SendMessage` 续聊（保留完整上下文）。
- Worktree 隔离：agent frontmatter `isolation: worktree`、CLI `-w/--worktree [name]`（支持 PR/MR URL）、`EnterWorktree` 工具；无改动自动清理；强制校验 Bash cwd 与 git 重定向（PowerShell 仅校验 cwd）。
- Agent teams（teammates）：`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`，`TeammateIdle`/`TaskCompleted` hooks 可当团队级门禁；`@名字` 跨会话发消息（2.1.232）。

**Plan mode / 权限 / 沙箱** `[高]`
- 权限模式：`default(Manual)/acceptEdits/plan/auto/dontAsk/bypassPermissions`。Pro/Max/Team 交互默认已是 auto（分类器审查每个动作；2.1.228+，原生 Windows 2.1.233+）。plan mode 只读（bypass 会话除外），批准计划后切换模式；`--permission-mode plan`、Shift+Tab 循环、`/plan` 前缀。
- 权限规则 `Tool(pattern)`：`Bash(git *)`、`Edit(path)`、`Read(./.env)`、`WebFetch(domain:...)`、`mcp__server__tool`、`Agent(name)`；allow/deny/ask 跨 scope 合并，**deny 在 bypassPermissions 下仍生效**。
- 沙箱（`sandbox.enabled` 等 settings）：macOS Seatbelt / Linux bubblewrap；**原生 Windows 不支持沙箱**（WSL2 支持）——官方 setup 页明表。

**Headless/CI** `[高]`
- `claude -p "..."`；`--output-format text|json|stream-json`（`json` 含 `result/session_id/total_cost_usd/usage/num_turns/structured_output`）、`--input-format stream-json`、`--json-schema`（结构化输出）、`--max-budget-usd`（超限停后台子代理）、`--fallback-model`、`--max-turns`（SDK/文档层面）、`--session-id/--resume/--continue`（2.1.223 起跨目录可 resume）、`--bare`（跳过 hooks/skills/插件/MCP/CLAUDE.md 自发现，官方推荐 CI 用，未来将成 `-p` 默认）。
- 退出码：0 成功、非零失败（文档明说可分支判断）、SIGTERM=143、`--verbose` + `--include-partial-messages` 流式。stdin 管道上限 10MB。`Setup` hook 事件配合 `--init/--maintenance`。`claude ultrareview` 云端多代理评审可在 CI 非交互运行（exit 0/1）。GitHub Actions/GitLab CI 官方集成 + Agent SDK（TS/Python）。

**记忆 / 上下文 / 成本** `[高]`
- Auto memory 默认开：`~/.claude/projects/<project>/memory/MEMORY.md`（索引，会话首**200 行或 25KB**载入）+ 主题文件按需读；`autoMemoryEnabled`/`CLAUDE_CODE_DISABLE_AUTO_MEMORY`/`autoMemoryDirectory`。subagent 可用 `memory:` 字段开独立记忆。
- `/context`（分类占用+已加载 memory 文件清单）、`/compact [focus]`、`/autocompact 500k`（`autoCompactWindow`/`--autocompact`）；压缩后：项目根 CLAUDE.md/无路径 rules/auto memory 从盘重注入，被调用过的 skills 重挂（5k/25k tokens 上限）。`/cost`、`/usage`、`/stats`；effort：`low|medium|high|xhigh|max`（`--effort`、`/effort`、skill/agent frontmatter `effort`）。1M 上下文 `[1m]` 型号可选。

**配置 / Windows / MCP** `[高]`
- settings 优先级：managed > CLI `--settings` > `.claude/settings.local.json` > `.claude/settings.json` > `~/.claude/settings.json`；权限规则跨层合并。
- Windows：原生支持（Win10 1809+）；**Git for Windows 可选**——有则 Bash 工具走 Git Bash（`CLAUDE_CODE_GIT_BASH_PATH` 指定），无则用 PowerShell 工具（`CLAUDE_CODE_USE_POWERSHELL_TOOL=1` 可与 Bash 并存）。
- MCP：`.mcp.json`（项目）、`claude mcp add`、`--mcp-config`、`--strict-mcp-config`；MCP 工具 schema 默认**延迟加载**（tool search；`ENABLE_TOOL_SEARCH`）。插件系统：marketplace（GitHub/GitLab/command 源）、`claude plugin` 全套 CLI（含 `eval`）。

### 1.2 OpenAI Codex CLI（v0.144.1 本机；上游 0.149.0）

**指令文件（AGENTS.md）** `[高]`
- 全局：`~/.codex/AGENTS.override.md` 优先于 `~/.codex/AGENTS.md`（取第一个非空）。项目：**从仓库根走到 cwd**，每目录取一个文件（`AGENTS.override.md` > `AGENTS.md` > `project_doc_fallback_filenames` 里的候选），根在前 cwd 在后拼接（"Files closer to your current directory override earlier guidance"）。启动时一次性构建（无惰性子目录加载）。
- 限额：合并总量 `project_doc_max_bytes` 默认 **32 KiB**，超限停止追加。
- 兼容：**默认不读 CLAUDE.md**；可 `project_doc_fallback_filenames = ["CLAUDE.md", ...]` 自行加入。`/init` 生成 AGENTS.md 脚手架；`model_instructions_file` 可整体替换内置指令。`## Code Review Rules` 小节被 GitHub 代码评审读取。

**Skills** `[高]`
- 遵循 open Agent Skills standard。扫描目录（官方文档原话）："Codex scans `.agents/skills` in every directory from your current working directory up to the repository root"，加 `$HOME/.agents/skills`（用户）、`/etc/codex/skills`（管理员）、系统内置；本机实测 `~/.codex/skills/` 存放内置/`$skill-installer` 安装的 curated skills（含 `.system` 子目录）`[高，本机 ls]`。symlink 跟随；同名不合并（都出现在选择器）。
- SKILL.md 必填 `name`+`description`；可选 `scripts/ references/ assets/` 与 **`agents/openai.yaml`**（`display_name/short_description/icon_*/brand_color/default_prompt/policy.allow_implicit_invocation/dependencies.tools`(MCP 依赖)）。
- 调用：`/skills` 或 **`$skill-name`** mention（区别于 slash）；隐式调用按 description 匹配，`allow_implicit_invocation: false` 可关。禁用：config.toml `[[skills.config]] path=... enabled=false`。
- 渐进披露预算：清单最多占**上下文窗口 2% 或 8,000 字符**（窗口未知时），过多时先缩 description。
- 旧 custom prompts（`~/.codex/prompts/*.md`，`/prompts:name`，`$1..$9/$ARGUMENTS/$NAMED/$$`）**已弃用**，官方指向 skills。

**Hooks** `[高]`（0.144.1 本机 `codex features list` 显示 `hooks stable true`；文档 config-reference 仍写 default off——版本口径差异，标注）
- 位置：`~/.codex/hooks.json`、`~/.codex/config.toml [hooks]`、`<repo>/.codex/hooks.json` 与 `.codex/config.toml`（**需项目信任**）、插件捆绑、`requirements.toml` managed（`hooks.managed_dir`/`windows_managed_dir`）。各层**叠加合并**不覆盖。
- 事件：`SessionStart, UserPromptSubmit, PreToolUse, PermissionRequest, PostToolUse, PreCompact, PostCompact, SubagentStart, SubagentStop, Stop, SessionEnd`（SubagentStart 的输出"parsed, not enforced"，即不可阻断）。
- 语义与 Claude Code 高度同构：`PreToolUse` `permissionDecision deny`（或 legacy `decision: block`）+ **`updatedInput` 改写**；`PermissionRequest` `decision {behavior: allow|deny}`；`Stop/SubagentStop` `decision: block` 续跑；**exit 2 + stderr 同义**；超时默认 600s（SessionEnd 上限 300s）。matcher 正则：`Bash`、`apply_patch|Edit|Write`、`mcp__server__.*`、函数工具名（`spawn_agent` 亦匹配 `Agent`）。
- 信任机制：非 managed 的 command hooks **需显式信任（按哈希记录）**，`/hooks` 界面审核；`--dangerously-bypass-hook-trust` 一次性绕过（CLI 帮助原文，本机）。`allow_managed_hooks_only = true`（requirements.toml）只跑管控 hooks。
- `async: true` 后台（每会话最多 8 个，不能阻断）；`additionalContextLimit` 默认 2500 tokens，超量落盘 `<temp>/hook_outputs/`；Windows 用 `commandWindows`/`command_windows` 覆盖命令。文档明说 Claude Code 插件采用**同一 hook schema**。

**Subagents / 多代理** `[高]`
- `features.multi_agent` 默认开（本机 features list `multi_agent stable true`）。内置角色 `default/worker/explorer`；自定义 agent：`~/.codex/agents/*.toml`、`.codex/agents/*.toml`，必填 `name/description/developer_instructions`，可带 `model/model_reasoning_effort/sandbox_mode/mcp_servers/skills.config`。
- 并发：`agents.max_concurrent_threads_per_session`（默认由 Codex 决定；旧名 `max_threads`）；并行执行、`/agent` 切换线程；子代理继承沙箱策略；深度上限未见文档 `[未核实]`。
- Worktree：**桌面 ChatGPT app 专属功能**（docs/environments/git-worktrees），CLI `codex` 无 `--worktree` 旗标（本机 `codex --help` 证实）；CLI 侧等价物是 `codex cloud`（云任务）与手工 git worktree。

**Plan mode / 审批 / 沙箱** `[高]`
- `/plan` slash 命令切 plan mode（可带内联提示）；`plan_mode_reasoning_effort` 配置。plan 模式为提议式（"propose an execution plan before implementation"），非硬只读门（硬门靠 sandbox/approval）。
- `approval_policy`：`untrusted | on-request | never | {granular={sandbox_approval, rules, mcp_elicitations, request_permissions, skill_approval}}`；`approvals_reviewer = user|auto_review`（自动评审代理，`--approve-for-me` 0.147+）。
- `sandbox_mode`：`read-only | workspace-write | danger-full-access`（exec 默认 read-only）+ `sandbox_workspace_write.{network_access, writable_roots, ...}`；平台机制：macOS Seatbelt、Linux/WSL2 bubblewrap、**Windows 原生 restricted-token 沙箱**（`[windows] sandbox = "elevated"|"unelevated"`，本机 `codex sandbox --help` 证实存在 Windows 沙箱子命令）。
- execpolicy `.rules`（Starlark `prefix_rule(pattern=[...], decision="allow|prompt|forbidden")`）：`~/.codex/rules/default.rules`（本机实测存在）、项目 `.codex/rules/`（需信任）；`codex execpolicy check` 可测。

**Headless/CI** `[高]`
- `codex exec "任务"`（别名 `e`）；进度走 stderr、最终消息走 stdout；`--json`（JSONL 事件：`thread.started/turn.started/turn.completed{usage}/item.*`）、`-o/--output-last-message 文件`、`--output-schema schema.json`（结构化输出）、`--ephemeral`、`--skip-git-repo-check`（默认要求在 git 仓库内）、`--ignore-user-config`、`--ignore-rules`、`-C dir`、`--add-dir`。
- 续跑：`codex exec resume --last` / `resume <SESSION_ID>`。审批：`-a never` + `--sandbox workspace-write`（`--full-auto` 已删除）。认证：`CODEX_API_KEY`（单次调用）或预置 `~/.codex/auth.json`；官方 **codex-action** GitHub Action（安全代理密钥）。退出码未枚举（`required=true` 的 MCP 起不来会异常退出）`[中]`。`codex review` 非交互代码评审；`codex mcp-server` 可把 Codex 自身作为 MCP server 嵌入其他代理；`codex app-server` 富协议；TypeScript Codex SDK。

**记忆 / 上下文 / 成本** `[高]`
- Memories：`features.memories` **默认关**；`[memories]` 细粒度（`generate_memories/use_memories/disable_on_external_context/max_*`）；存 `~/.codex/memories/`（本机目录存在）；`/memories` 命令。
- `/compact` 手动压缩；`model_auto_compact_token_limit`（不设则用模型默认）+ `_scope`；`/status` 显示会话配置与 **token 用量/剩余上下文**；`/usage` 账户级额度；effort `minimal|low|medium|high|xhigh`（`model_reasoning_effort`；子代理另有 `ultra/max` 档位表述）`[中]`。

**配置 / Windows / MCP** `[高]`
- `~/.codex/config.toml`（本机实测）；项目 `.codex/config.toml` 仅信任后加载（`projects.<path>.trust_level`）；profile：`$CODEX_HOME/<name>.config.toml`（`-p/--profile`）；企业 `requirements.toml`/`managed_config.toml`；`-c key=value` 单点覆盖。
- MCP：`[mcp_servers.<id>]` stdio/HTTP（`enabled_tools/disabled_tools/default_tools_approval_mode/startup_timeout_sec/tool_timeout_sec/http_headers/bearer_token_env_var`）；`codex mcp` 管理。
- Windows：原生支持（含原生沙箱两档与 `/sandbox-add-read-dir`、`/setup-default-sandbox` 命令）；WSL 路线亦官方支持；hooks 有 `commandWindows`。
- `/import`：从 **Claude Code 或 Cursor** 导入（指令文件→AGENTS.md、settings.json→config.toml、skills、plugins、MCP、hooks、slash commands→skills、subagents→agents、最近 30 天/50 条会话）。

### 1.3 OpenCode（v1.18.18 本机；npm 1.18.19）

**指令文件** `[高]`
- 主文件 **AGENTS.md**：项目（cwd 向上直到 git worktree 根）+ 全局 `~/.config/opencode/AGENTS.md`。**CLAUDE.md 为回退**：项目无 AGENTS.md 时用项目 CLAUDE.md；全局无则用 `~/.claude/CLAUDE.md`；每类**首个命中者独占**（AGENTS.md 存在时 CLAUDE.md 被忽略）。`OPENCODE_DISABLE_CLAUDE_CODE(=_PROMPT/_SKILLS)` 关兼容。
- `instructions` 配置数组可挂任意文件/glob/远程 URL（5 秒超时），与 AGENTS.md 合并；**不自动解析 @file 引用**（官方建议在 AGENTS.md 里写"读到 @x 就去 Read"的说明或用 instructions 数组）。`/init` 生成/改进 AGENTS.md。

**Skills** `[高]`
- 原生 `skill` 工具 + 渐进披露（`<available_skills>` XML 列表→按需加载正文）。扫描：`.opencode/skill(s)/`、`~/.config/opencode/skill(s)/`、**`.claude/skills/` + `~/.claude/skills/`**、**`.agents/skills/` + `~/.agents/skills/`**（项目路径从 cwd 走到 git worktree 根）；另有 `skills.paths`（递归扫 `**/SKILL.md`）与 `skills.urls`（远程清单）。
- Frontmatter 只认标准六项之五：`name`(必填，1-64，kebab-case，**须与目录同名**)、`description`(必填，1-1024 字符)、`license`、`compatibility`、`metadata`(string map)；未知字段忽略。**不支持** `disable-model-invocation`/`user-invocable`/`allowed-tools` 等 Claude 扩展字段——控制靠 `permission.skill` patterns（allow/ask/deny，可按 agent 覆盖）与 `tools.skill=false`。
- Skills **不是 slash 命令**（slash 命令是独立的 commands 体系）；本机实测 `opencode debug skill` 确认会加载 `~/.claude/skills` 与自配 `skills.paths`。

**Commands（slash）** `[高]`
- `.opencode/command(s)/*.md`、`~/.config/opencode/command(s)/*.md` 或 JSON `command{}`；文件名=命令名；frontmatter `description/agent/model/variant/subtask`；正文即模板：`$ARGUMENTS`、`$1..$n`、`` !`cmd` `` shell 注入、`@file` 引用。

**Hooks（无独立 hooks，走 Plugins）** `[高]`
- JS/TS 插件：`.opencode/plugin(s)/`、`~/.config/opencode/plugin(s)/`、npm（`plugin` 数组）。Hook 面（本机内置 customize-opencode skill 全文证实）：`event`（全事件总线）、`config`、`chat.message/chat.params/chat.headers`、**`tool.execute.before/after`**（改参或 **throw 阻断**）、`tool.definition`、`command.execute.before`、`shell.env`、`permission.ask`、`experimental.chat.messages.transform`、`experimental.session.compacting`、`experimental.compaction.autocontinue`、`experimental.text.complete`；对象型：自定义 `tool`、`auth`、`provider`。
- 阻断方式=在 `tool.execute.before` 抛异常（官方 .env 保护示例即如此）或 `permission.ask` 干预；**无 Stop 类"完成门禁"事件**（`session.idle` 仅观察）`[高]`。配置改动不热载，需重启。

**Agents / 多代理** `[高]`
- 两类：primary（Tab 切换；内置 Build/Plan）与 subagent（内置 General/Explore/Scout + 隐藏 compaction/title/summary）。定义：`.opencode/agent(s)/*.md`、`~/.config/opencode/agent(s)/*.md` 或 JSON `agent{}`；frontmatter：`description/mode(primary|subagent|all)/model/variant/temperature/top_p/steps(轮数上限)/permission/tools/hidden/color/disable`；正文=系统提示词。
- 调用：`@mention` 手动或模型经 **Task 工具**自动（`permission.task` glob 可限制可派生的 subagent）；子会话导航 `<Leader>+Down`。并行=Task 子会话（**后台 subagent 仍为实验**：`OPENCODE_EXPERIMENTAL_BACKGROUND_SUBAGENTS`）；**无 worktree 隔离机制**（plugins 仅拿到 worktree 路径）。

**权限 / plan / 沙箱** `[高]`
- `permission`：`allow/ask/deny`；键：`read, edit, glob, grep, list, bash, task, external_directory, todowrite, question, webfetch, websearch, lsp, doom_loop, skill`；bash/edit 等支持 pattern 对象（**最后匹配者胜**）；`external_directory` 管工作区外路径；每 agent 可覆盖；`OPENCODE_PERMISSION` 环境变量可内联。
- Plan：内置 Plan agent = 关键操作全 `ask`（软门）；`OPENCODE_EXPERIMENTAL_PLAN_MODE` 实验性 plan mode。`--auto`/`opencode run --auto` 自动批准（显式 deny 仍拦）。**无 OS 级沙箱**（纯权限模型）`[高]`。

**Headless/CI** `[高]`
- `opencode run "msg" --format default|json`（json=原始事件流）`-m provider/model --agent X --command name --continue/--session/--fork --variant high --auto --title --attach http://host:port`；`opencode serve`（HTTP API + JS SDK）与 `opencode acp`（ACP stdio）；`opencode github`（官方 GitHub agent）；`opencode export/import` 会话 JSON。退出码未见文档 `[未核实]`。

**上下文 / 成本** `[高]`
- `compaction { auto: true, prune, reserved }`（内置 skill 版本还示例 `tail_turns`）；`OPENCODE_DISABLE_AUTOCOMPACT`；`/compact`、`/undo` `/redo`（快照系统 `snapshot`）；`opencode stats` = token 用量与成本统计；`tool_output.max_lines/max_bytes` 截断工具输出；`--variant` = provider 推理档位（high/max/minimal 等）；`small_model` 廉价模型分流标题等杂务。

**配置 / Windows / MCP** `[高]`
- `opencode.json(c)`：项目根（或 `.opencode/opencode.json`，cwd 向上找到 worktree 根）> 全局 `~/.config/opencode/opencode.json`；深合并；`OPENCODE_CONFIG`/`OPENCODE_CONFIG_CONTENT`/`OPENCODE_CONFIG_DIR`；企业 managed 目录（plist/MDM）。数据在 `~/.local/share/opencode`（本机 `opencode debug paths` 证实）。
- Windows：原生可跑但**官方推荐 WSL**；`OPENCODE_GIT_BASH_PATH` 指定 Git Bash。MCP：`mcp{}` local(`command` 数组)/remote(`url/headers`，`{env:VAR}` 插值)；OAuth 支持（`opencode mcp auth`）。

### 1.4 Pi（@earendil-works/pi-coding-agent 0.84.2；仓库已迁至 earendil-works/pi）

**定位** `[高]`：极简 harness，"adapt pi to your workflows"；**故意不内置 subagents 与 plan mode**（README 明言），一切经 TypeScript Extensions / Skills / Prompt Templates / Themes / Packages 扩展。四种运行模式：interactive、print/JSON、RPC、SDK。

**指令文件** `[高]`
- 启动加载 **AGENTS.md 或 CLAUDE.md**：`~/.pi/agent/AGENTS.md`（全局）→ 从 cwd 向上各父目录 → cwd；目录内如有 `AGENTS.override.md` 则**替代**该目录的 AGENTS/CLAUDE.md；全部拼接。`--no-context-files/-nc` 关闭。无大小上限文档 `[未核实]`。
- 系统提示词可整替（`.pi/SYSTEM.md`、`~/.pi/agent/SYSTEM.md`）或追加（`APPEND_SYSTEM.md`；CLI `--system-prompt/--append-system-prompt`）。

**Skills** `[高]`
- 实现 **Agent Skills standard**（宽松校验：允许 name≠目录名，README/docs 明言这是对共享技能目录的让步）。位置：`~/.pi/agent/skills/`、**`~/.agents/skills/`**、`.pi/skills/`（项目信任后）、**`.agents/skills/`（cwd 及祖先目录直到 git 根）**、pi packages、settings `skills` 数组（官方示例即用它挂 `~/.claude/skills`、`~/.codex/skills`）、CLI `--skill`。
- Frontmatter：`name`(必)、`description`(必，≤1024)、`license`、`compatibility`(≤500)、`metadata`、`allowed-tools`(实验)、**`disable-model-invocation`**（true 时只能 `/skill:name` 手动调）。校验超限仅告警仍加载；无 description 不加载；同名冲突保留首个。
- 调用：`/skill:name [args]` slash；模型自动按 description 用 `read` 加载正文（渐进披露）。`enableSkillCommands` 开关。

**Prompt Templates（slash commands）** `[高]`：`~/.pi/agent/prompts/*.md`、`.pi/prompts/`、packages；`/文件名` 展开；`description/argument-hint` frontmatter；`$1..$9/$@/$ARGUMENTS`、默认值与切片。

**Hooks（无独立 hooks，走 Extensions）** `[高]`
- TypeScript 扩展：`~/.pi/agent/extensions/*.ts(或 dir/index.ts)`、`.pi/extensions/`（项目信任后）、packages、`-e` CLI。事件极全：`tool_call`（**可阻断**：`return { block: true, reason, terminate }`，且 `event.input` 可原位改写）、`tool_result`（可改结果）、`before_agent_start`、`agent_start/end`、`turn_start/end`、`session_before_compact/compact`、`user_bash`、`input`、`model_select` 等；可注册工具/命令/快捷键/Provider、替换内置工具、做权限门/子代理/plan mode（官方"what's possible"清单）。`/reload` 热载。
- 项目信任：交互式首次询问并记 `~/.pi/agent/trust.json`；**非交互模式不弹窗**，按 `defaultProjectTrust`（默认 ask→视为不信任、忽略项目资源），CLI `-a/--approve` 或 `-na` 覆盖。

**Subagents** `[高]`：无内置；官方立场是用扩展或第三方 pi package 实现（社区包存在，细节未核实 `[低]`）。

**权限 / 沙箱** `[高]`：无内置权限系统/沙箱；靠 `--tools read,grep,find,ls` 白名单、`-xt` 排除、`--no-tools`，以及扩展实现门禁。内置工具集：`read, bash, edit, write, grep, find, ls`。

**Headless/CI** `[高]`
- `pi -p "任务"`（支持管道 stdin 合并、`@file` 附件）；`--mode json`（LF 分隔 JSONL 事件：`session` 头、`agent_start/turn_start/message_update/tool_execution_*/agent_end`）；`--mode rpc`（stdin/stdout JSON-RPC 式协议，嵌入他进程）；SDK（`createAgentSession`）。退出码未文档化 `[未核实]`。CI 建议 `--no-extensions/--no-skills` + 显式 `-e/--skill` 求确定性。
- 会话：`~/.pi/agent/sessions/` JSONL 树结构；`-c/-r/--session <id>/--fork <id>/--no-session`；`/tree` 任意点回溯分支。

**上下文 / 成本** `[高]`：底栏实时显示 token（↑↓/R/W/CH 缓存命中）、成本、上下文占用、模型；`/compact [说明]` 手动 + 自动压缩（`compaction.enabled=true, reserveTokens=16384, keepRecentTokens=20000`）；thinking 档 `off|minimal|low|medium|high|xhigh|max`（`--thinking`、`--model sonnet:high` 简写）；`PI_CACHE_RETENTION=long` 延长提示缓存。

**配置 / Windows / MCP** `[高]`
- `~/.pi/agent/settings.json`（全局）、`.pi/settings.json`（项目，信任后）；`PI_CODING_AGENT_DIR` 改家目录。**原生 Windows 支持**（官网 install.ps1；文档多处 Windows 快捷键/Notepad 回退）。MCP **不内置**，经扩展接入（官方"what's possible"列 MCP server integration）`[高]`。包管理：`pi install npm:...|git:...`、`pi update --all`、`pi config`。

### 1.5 Grok Build（xAI `grok` v1.0.4 本机，2026-08-13 发布）

**指令文件** `[高，全部来自本机 ~/.grok 文档]`
- 识别文件名（每目录全部加载并去重）：`Agents.md, Claude.md, CLAUDE.md, CLAUDE.local.md, AGENT.md, AGENTS.md`。顺序：`~/.grok/` 全局 → git 仓库根到 cwd 逐级 →（非 git 时仅 cwd）；深目录靠后=优先。gitignore 的文件跳过（可借此做个人 local 文件）。
- Rules 目录：每级 `<dir>/.grok/rules/*.md` + **`.claude/rules/` + `.cursor/rules/`**（兼容开关 `[compat.claude|cursor] rules`），家目录 `~/.grok/rules/`、`~/.claude/rules/`、`~/.cursor/rules/`。
- 尺寸：README 写"每文件 10,000 字符截断+警告"，但 user-guide 12-project-rules 写"加载全文，无字符上限不截断"——**同版本文档自相矛盾，取 user-guide 为准但标注冲突** `[中]`。`--rules "文本"` 追加会话级规则；`--system-prompt-override` 整替。
- 本机 `grok inspect` 实测：当前目录加载了 `~/.claude/Claude.md`（标 `[claude]`）并显示 token 数。

**Skills** `[高]`
- 目录（优先级从高到低）：`./.grok/skills/`、`<repo_root>/.grok/skills/`、`~/.grok/skills/`、**`~/.claude/skills/`**；再加 `./.claude/skills/`、`./.cursor/skills/`、`~/.cursor/skills/`，且"**Grok 还会在每一层同时扫 `.agents/skills/`（及 commands/）**"（user-guide 08 原文）；`[skills] paths/ignore/disabled` 配置扩展；bundled skills 在 `~/.grok/bundled/skills/`（本机 24 个，含 execute-plan/design/review 等工作流技能）。skill 发现**不吃 .gitignore**。
- Frontmatter：`name`(≤64, kebab; 缺省用目录名)、`description`(缺省取正文首段)、`when-to-use`、`allowed-tools`、`argument-hint`、**`user-invocable`(默认 true)**、**`disable-model-invocation`(默认 false)**、`model`、`effort`、`license`、`compatibility`、`metadata`(author/short-description 提升显示)。
- 调用：每个 skill 即 `/skill-name` slash 命令（带参数）；冲突时限定名 `/local:x /user:x /repo:x /plugin:x`；模型可自动调用；`grok inspect --json` 全量报告。旧式 `commands/` 目录平铺 `*.md` 也成为 slash 命令（Claude legacy 兼容）。

**Hooks** `[高]`
- 发现（全部合并）：`~/.grok/hooks/*.json`（信任）、**`~/.claude/settings.json(+local)`**、**`~/.cursor/hooks.json`**、项目 `.grok/hooks/`、项目 `.claude/settings.json(+local)`、项目 `.cursor/hooks.json`（项目源**需 folder-trust**：`/hooks-trust` 或 `--trust`，与 MCP/LSP 共用信任库 `~/.grok/trusted_folders.toml`）、`config.toml [[hooks.Event]]`（user/managed/requirements 三层，叠加）、插件。
- 事件：`SessionStart, UserPromptSubmit, PreToolUse(可 deny + updatedInput 改写), PostToolUse, PostToolUseFailure, PermissionDenied, Stop(可 block), StopFailure, StopCancelled(1.0.4 新增), Notification, SubagentStart, SubagentStop(可 block; SubagentEnd 别名), PreCompact, PostCompact, SessionEnd`。Cursor camelCase 事件名兼容映射。
- 语义：`{"decision":"deny","reason"}` 阻断；`updatedInput` 改写工具入参（1.0.4+）；Stop `{"decision":"block","reason"}` 续跑、`{"continue":false}` 强停、`additionalContext` 反馈；**exit 2 = deny/block（stderr 作理由）**；其他失败**fail-open**（必须显式 deny 才拦——写门禁脚本要自己兜错误）。超时默认 5s，**Stop/SubagentStop 默认 600s**（"matching Claude Code"）；连续 block 上限 8 次。
- 工具名别名映射 Claude 风格（`Bash→run_terminal_command` 等）；环境变量注入 `GROK_HOOK_EVENT/GROK_SESSION_ID/GROK_WORKSPACE_ROOT` + **`CLAUDE_PROJECT_DIR` 兼容别名**；HTTP hooks（POST 事件）。

**Subagents / 多代理** `[高]`
- `spawn_subagent` 工具：参数 `prompt/description/subagent_type(general-purpose|explore|plan+自定义)/background/capability_mode(read-only|read-write|execute|all)/**isolation: none|worktree**/resume_from/cwd`。**嵌套深度=1**（子代理不能再生子代理）。后台任务：`get_task_output/kill_task`、Ctrl+G 转后台、Tasks 面板、`/loop` 定时任务、monitor 工具、scheduler。
- 自定义：`.grok/agents/`、`~/.grok/agents/`（`--agent`、`--agents '<json>'`、`[agent]` config、`GROK_AGENT`）；**roles**（`.grok/roles/*.toml`：能力/模型默认）与 **personas**（`.grok/personas/*.toml`：口吻+输入/输出契约，`[[inputs]]/[[outputs]]` 文件契约）；`[subagents.toggle/models]` 每类型开关与模型路由；**Claude 兼容**：`.claude/agents/`、`~/.claude/agents/` 直接作为 subagents 加载。
- Worktree：`isolation: worktree` 子代理隔离（`x.ai/git/worktree/*` ACP 扩展方法，含 apply 合并回主区）；CLI `-w/--worktree [名]` + `--worktree-ref`（headless `-p` 不建 worktree）；`grok worktree` 子命令管理。

**Plan mode / 权限 / 沙箱** `[高]`
- Plan mode：`/plan`、Shift+Tab；**硬只读**（计划文件 `plan.md` 之外的编辑一律拒绝，"holds in every permission mode, including always-approve"）；`enter_plan_mode/exit_plan_mode` 工具 + 批准界面；状态机持久化。注意：**子代理不受父会话 plan 门控**（文档明示）。
- 权限模式：`default(ask)/acceptEdits/plan/auto/dontAsk/bypassPermissions(=always-approve/--yolo)`；规则 `Bash(...)/Edit(...)/Write(...)/Read(...)/Grep(...)/WebFetch(domain:...)/MCPTool(...)`，**兼容 Claude 的 `Bash(cmd:*)` 写法**；deny > ask > allow 跨层合并；规则来源：`~/.grok/config.toml`、项目 `.grok/config.toml`（逐级）、**`.claude/settings.json(+local)` 直读**（含 `permissions.defaultMode`）；`Ctrl+I` / `/import-claude` 导入 Claude 设置。授权管线：PreToolUse hooks → 规则 → 记忆授权 → 内置只读放行 → 模式策略。
- 沙箱：`--sandbox workspace|read-only|strict|自定义`（`sandbox.toml`，`extends` 继承）；机制 Linux Landlock / macOS Seatbelt，进程级不可逆；**Windows 未列支持**（文档只写 Linux/macOS，失败则警告继续）`[中]`。

**Headless/CI** `[高]`
- `grok -p "任务"`；`--output-format plain|json|streaming-json|streaming-messages-json`（json 含 `text/stopReason/sessionId/usage/num_turns/modelUsage/cost`；streaming-messages-json 为 **Anthropic Messages 线格式**，`--include-partial-messages` 增量）；`--json-schema` 结构化输出；`-s` 新会话指定 UUID、`-r/--resume <id|标题>`、`-c`；`--tools/--disallowed-tools`（含 `Agent`/`Agent(explore)` 拦派生）、`--max-turns`、`--allow/--deny` 规则旗标、`--permission-mode`、`--reasoning-effort`。
- **退出码文档化**：0 成功 / 1 错误 / 130 SIGINT / 143 SIGTERM。认证：`XAI_API_KEY` 或 `grok login --device-auth`。`grok agent stdio` = **ACP server**（JSON-RPC over stdio；Zed/Neovim/Emacs/marimo 客户端）。

**记忆 / 上下文 / 成本** `[高]`
- Memory（实验）：`--experimental-memory`/`GROK_MEMORY=1`/`[memory] enabled`；`~/.grok/memory/MEMORY.md`（全局）+ `<project-slug>-<hash8>/MEMORY.md`（工作区，哈希取 git remote，克隆/worktree 共享）+ 会话日志；SQLite FTS5+向量混合检索；`/memory workspace|global 文本`、`/flush`（LLM 总结入库）、`memory_search/memory_get` 工具、`grok memory edit/stats`。
- `/compact [context]`、自动压缩阈值 `[session] auto_compact_threshold_percent = 85`（本机 config 默认档）；`/context` 分类占用+skills/MCP 估算 token；`/session-info`；`/usage`；effort `low|medium|high|xhigh`（`/effort`、`--effort`，本机 config `default_reasoning_effort="xhigh"`）；外部 OTEL 用量导出（alpha，schema v1）。

**配置 / Windows / MCP** `[高]`
- `~/.grok/config.toml` 主配置；项目 `.grok/config.toml`（仅 `[mcp_servers]`+插件+权限规则，逐级向上到仓库根）；managed_config.toml/requirements.toml 企业层；`GROK_HOME` 改家目录。
- **Claude Code 兼容矩阵**（`[compat.claude]` skills/rules/agents/mcps/hooks/sessions 六格，全默认 on；cursor 同；codex 仅 sessions 占位）：skills(`.claude/skills`)、agents(`.claude/agents`)、plugins(`~/.claude/plugins` 含 installed_plugins.json)、MCP(`~/.claude.json`、`.mcp.json`)、rules(`CLAUDE.md/.claude/CLAUDE.md`)、permissions(`.claude/settings.json`) 全部直读——本机 `grok inspect` 实测确认加载了 `~/.claude.json` 的 6 个 MCP server、3 个 Claude 插件、`~/.claude/settings.json` 权限。
- Windows：原生运行良好（本机即 Windows；1.0.4 changelog 专门修了仅 USERPROFILE 时的 `grok du`/worktree）；沙箱除外（见上）。MCP：`[mcp_servers.<name>]` stdio/Streamable HTTP（headers 模板 `{{session_id}}`），工具命名 `server__tool`。

### 1.6 DeepSeek Harness（dsh）

**身份判定** `[高]`：**官方产品**。DeepSeek AI 出品的开源 agent harness（GitHub `deepseek-ai/deepseek-harness`，默认分支 master，MIT），口号 "Everything is a Plugin"，基于 Cordis 插件框架。**Developer preview**（README 大写警告会有破坏性变更），产品页 www.deepseek.com/harness/en/（2026-08-14 前后上线，2026-08-17 搜索时标"3 天前"）；npm `@deepseek-ai/dsh` **0.1.0-rc.7**（2026-08-21 查）。入口是 **Web UI**：`npx @deepseek-ai/dsh web`（默认 127.0.0.1:3080），另有 Python SDK（`deepseek-harness-sdk`）与 headless bundle；文档站 deepseek-harness.github.io。运行模式：standard / code mode（TS 编排工具）/ minimal / creator；一切写入 append-only session log（JSONL，可选 SQLite 后端）。

**指令文件** `[高，docs]`：`dsh-agent-instructions` 插件——用户全局 `AGENTS.md` 在 `$DSH_HOME`（默认 `~/.dsh`）；从会话 cwd 向上按 `projectRootMarkers`（默认 .git）找项目根；`instructionFileCandidates`（有序候选名单，含 AGENTS.md/CLAUDE.md 一类，逐目录取全部存在者并去重）+ `localInstructionFileCandidates`（local 覆盖层）；`maxBytes` 字节预算 + `maxSourceBytes` 单文件上限；核心配置里另有 `workspaceContext`（"Controls automatic AGENTS.md/CLAUDE.md loading; configure a byte budget or set false"）；子目录 AGENTS.md 作为动态上下文注入。

**Skills** `[高，docs]`：目录扫描优先级：`<projectRoot>/.dsh/skills`(rank100) → **`<projectRoot>/.agents/skills`**(200) → `customSkillDirs`(300) → `~/.dsh/skills`(400) → **`~/.agents/skills`**(500) → bundled(600)。名称 kebab-case；接受 `<name>/SKILL.md` 目录包或平铺 `<name>.md`；**不支持嵌套递归 `**/SKILL.md`**；`modelInvocable/userInvocable` 双开关（对应标准的 disable-model-invocation/user-invocable 语义）；模型目录只见 name+description（+whenToUse），正文经 `skill` 工具加载；Chokidar 热监听。

**Commands / Hooks / Subagents** `[高，docs]`
- 人类命令注册表（`dsh-commands`）：插件注册 slash 命令，直接执行不经模型。
- Hooks：**没有自有 hook 格式，而是两座桥**——`dsh-hooks-claude-code`（读 Claude Code 的 `hooks.json` 或 settings 文件的 `hooks` 键；注入 `CLAUDE_PROJECT_DIR`；默认超时 600000ms=CC 默认）与 `dsh-hooks-codex`（读 Codex hooks.json）。当前为进程级一次性加载，项目级 per-session 发现仍是 TODO `[中]`。
- Subagents：subagent seam 多 provider 并存：`spawn-in-process`、`fork`、**`acp`**、**`codex`**、**`claude-code`**、`dsh-sdk`——即可把 **Codex/Claude Code/任意 ACP agent 作为子代理拉起**；能力旗标 `outputSchema/depthLimit/toolFilter/persona`，不支持的请求**响亮拒绝**（fail loud）。

**Plan / 权限 / 沙箱** `[高，docs]`：plan mode 是"软引导"（激活时注入 `plan:policy` 提示段，**硬约束靠 sandbox+approval**）；权限预设把两旋钮打包：默认 `workspace-write`（workspace-write 沙箱+ask 审批）与 `danger-full-access`（+never）；审批 `ask/never`，结局 `allowed-once/rejected/cancelled/unavailable` **fail-closed**；沙箱 `read-only|workspace-write|danger-full-access`，后端 Linux bwrap/Landlock、macOS Seatbelt、**Windows ACL restricted-token（报告 partial enforcement）**。

**Headless / 记忆 / 上下文** `[中，docs]`：`dsh-headless` bundle="一次性 runner，无服务器"（CI 姿态：approval `never` 确定性拒绝）；profiles（`web`/`headless` 模板）；Python SDK 平台**仅 Linux x64/arm64 与 macOS 14+ arm64——无 Windows**；PTY 持久终端组合也不支持 Windows。压缩：compaction seam（`compaction/start|summary|end` 事件、手动命令+自动）；token-meter 快照；goals/schedule 子系统；跨会话记忆未见文档 `[未核实]`；MCP 未在已读文档中确认（产品页也未提）`[未核实]`。CLI 旗标/退出码等细节未文档化（preview）`[低]`。

---

## 2. 能力大矩阵

列：CC=Claude Code 2.1.233；CX=Codex CLI 0.144.1；OC=OpenCode 1.18.18；PI=Pi 0.84.2；GK=Grok 1.0.4；DS=DSH 0.1.0-rc.7。括号内为置信度（高/中/低）。

| 能力 | CC | CX | OC | PI | GK | DS |
|---|---|---|---|---|---|---|
| 读 AGENTS.md | ✗ 需 @import/symlink（高） | ✓ 原生+override（高） | ✓ 原生（高） | ✓ 原生+override（高） | ✓ 原生（高） | ✓ 原生可配（高） |
| 读 CLAUDE.md | ✓ 本体（高） | ✗ 默认；可加 fallback（高） | ✓ 仅无 AGENTS.md 时回退（高） | ✓ 与 AGENTS.md 并列候选（高） | ✓ 与 AGENTS.md 同读（高） | ✓ 候选名单可含（高） |
| 指令文件逐级目录作用域 | ✓ 上溯+子目录惰性（高） | ✓ 根→cwd（高） | ✓ 上溯（高） | ✓ 上溯（高） | ✓ 根→cwd（高） | ✓ cwd→根（高） |
| 指令 @include | ✓ 4 跳（高） | ✗（高） | 半：instructions 数组/URL（高） | ✗（高） | ✗（高） | ✗（中） |
| rules 目录（多文件规则） | ✓ .claude/rules + paths glob（高） | ✗（.rules 是执行策略非提示）（高） | 半：instructions glob（高） | ✗（高） | ✓ .grok/.claude/.cursor rules（高） | ✗（中） |
| Agent Skills 标准（SKILL.md） | ✓ 标准+私有扩展（高） | ✓（高） | ✓ 严格子集（高） | ✓ 宽松实现（高） | ✓ 超集（高） | ✓（高） |
| 扫 `.agents/skills` | ✗（高） | ✓ 主路径（高） | ✓（高） | ✓（高） | ✓（高） | ✓（高） |
| 扫 `.claude/skills` | ✓ 本体（高） | ✗（高） | ✓（高） | 手动加 settings（高） | ✓（高） | 手动加 customSkillDirs（中） |
| skill=slash/用户可调 | ✓ /name（高） | ✓ $name、/skills（高） | ✗（skill 工具；命令另设）（高） | ✓ /skill:name（高） | ✓ /name（高） | ✓ 用户可调策略（中） |
| disable-model-invocation | ✓（高） | 半：openai.yaml allow_implicit_invocation（高） | ✗ 用 permission.skill（高） | ✓（高） | ✓（高） | ✓ 等价开关（中） |
| skills 清单预算 | 1% ctx / 1536 字符/条（高） | 2% ctx 或 8000 字符（高） | 未见（低） | 无（描述≤1024）（高） | 未见（低） | 目录仅 name+desc（高） |
| 自定义 slash 命令（模板+参数） | ✓ commands=skills（高） | ✓ prompts 已弃用→skills（高） | ✓ command(s)/*.md（高） | ✓ prompts/*.md（高） | ✓ commands/ 兼容+skills（高） | ✓ 插件注册（中） |
| 模板内 `!` shell 注入 | ✓（高） | ✗（高） | ✓（高） | ✗（模板仅参数）（高） | 未见（低） | ✗（低） |
| 生命周期 hooks（外部脚本） | ✓ 30 事件（高） | ✓ 11 事件（高） | ✗ 走 JS 插件（高） | ✗ 走 TS 扩展（高） | ✓ 16 事件（高） | ✓ 经 CC/Codex 桥（高） |
| PreToolUse 阻断 | ✓（高） | ✓（高） | ✓ throw（高） | ✓ block:true（高） | ✓（高） | ✓ 桥接（高） |
| PreToolUse 改写入参 | ✓ updatedInput（高） | ✓ updatedInput（高） | ✓ 改 output.args（高） | ✓ 改 event.input（高） | ✓ updatedInput 1.0.4+（高） | 视桥实现（中） |
| Stop/完成门禁（可续跑） | ✓ Stop/SubagentStop（高） | ✓ Stop/SubagentStop（高） | ✗（高） | ✗ 内置无（可自造）（中） | ✓ Stop/SubagentStop 600s（高） | ✓ 桥接 Stop（中） |
| hook 失败语义 | exit2 强拦；其他非阻断（高） | exit2 同 CC（高） | throw 即拦（高） | 返回值控制（高） | **fail-open**，须显式 deny（高） | 桥接依源语义（中） |
| 读 Claude hooks 配置 | 本体（高） | 同 schema 不同路径（高） | ✗（高） | ✗（高） | ✓ 直读 settings.json（高） | ✓ 直读 hooks.json（高） |
| Subagents 定义文件 | ✓ .claude/agents md（高） | ✓ .codex/agents toml（高） | ✓ .opencode/agent(s) md（高） | ✗ 内置无（高） | ✓ .grok/agents + .claude/agents（高） | ✓ 多 provider（高） |
| 并行子代理 | ✓ 默认 20（高） | ✓ 上限可配（高） | ✓ Task（后台=实验）（高） | ✗（高） | ✓ 后台+Tasks 面板（高） | ✓（高） |
| 子代理嵌套 | 3 层默认（高） | 未文档（低） | 未文档（低） | n/a | **1 层**（高） | depthLimit 能力位（中） |
| worktree 隔离 | ✓ agent/CLI/工具（高） | ✗ CLI（桌面 app 有）（高） | ✗（高） | ✗（高） | ✓ isolation+`-w`（高） | 未见（低） |
| 把他家 CLI 当子代理 | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ codex/claude-code/acp provider（高） |
| Plan mode | ✓ 硬只读+批准（高） | ✓ /plan 软（高） | Plan agent 软+实验 flag（高） | ✗ 可扩展（高） | ✓ 硬只读 plan.md 例外（高） | ✓ 软引导（高） |
| 权限规则（allow/ask/deny） | ✓ Tool(pattern)（高） | ✓ granular+.rules（高） | ✓ permission 键+glob（高） | ✗ 仅工具开关（高） | ✓ 兼容 CC 语法（高） | ✓ 预设+审批（高） |
| OS 沙箱 | macOS/Linux/WSL2；**无原生 Win**（高） | macOS/Linux/**原生 Win 两档**（高） | ✗（高） | ✗（高） | Linux/macOS；Win 未列（中） | Linux/macOS/**Win ACL partial**（高） |
| 无头命令 | `claude -p`（高） | `codex exec`（高） | `opencode run`（高） | `pi -p / --mode json`（高） | `grok -p`（高） | headless bundle/PySDK（中） |
| JSON/流式输出 | text/json/stream-json+schema（高） | --json JSONL+--output-schema（高） | --format json 事件流（高） | --mode json JSONL（高） | 4 格式+--json-schema（高） | JSONL 会话日志（中） |
| 退出码文档化 | 0/非零/143（高） | 未枚举（中） | 未见（低） | 未见（低） | **0/1/130/143**（高） | 未见（低） |
| 会话恢复（headless） | --resume 跨目录（高） | exec resume（高） | --session/--fork（高） | --session/--fork（高） | -r/-c/-s UUID（高） | resume_from（中） |
| 跨会话记忆 | ✓ auto memory 默认开（高） | ✓ memories 默认关（高） | ✗（高） | ✗（高） | ✓ 实验 flag（高） | 未见（低） |
| 自动压缩+手动 /compact | ✓ +/autocompact（高） | ✓ 阈值可配（高） | ✓ compaction{}（高） | ✓ 阈值可配（高） | ✓ 85% 默认（高） | ✓ seam（高） |
| 成本/token 可视 | /cost /usage /context（高） | /status /usage（高） | opencode stats（高） | 底栏实时（高） | /context /usage OTEL（高） | token-meter（中） |
| effort/thinking 控制 | low..max（高） | minimal..xhigh（高） | --variant（高） | off..max（高） | low..xhigh（高） | 未见（低） |
| MCP | ✓ 深度（延迟加载）（高） | ✓ 深度（高） | ✓ local/remote+OAuth（高） | 扩展实现（高） | ✓ +读 ~/.claude.json（高） | 未确认（低） |
| ACP | ✗（未见）（中） | ✗（app-server 私有协议）（中） | ✓ `opencode acp`（高） | ✗（RPC 私有）（高） | ✓ `grok agent stdio`（高） | ✓ acp provider/demo（高） |
| 原生 Windows | ✓（PS/GitBash）（高） | ✓（含沙箱）（高） | 可跑，官方荐 WSL（高） | ✓（高） | ✓（本机即 Win）（高） | 部分（PySDK/PTY 无 Win）（高） |
| 配置文件 | settings.json 四层（高） | config.toml+profiles（高） | opencode.json 深合并（高） | settings.json 两层（高） | config.toml 三层+compat（高） | cordis 组合/profiles（高） |
| 导入他家配置 | claude import codex/gemini（高） | /import Claude/Cursor（高） | ✗（读兼容即代替）（高） | ✗（读兼容即代替）（高） | /import-claude（高） | 兼容桥即代替（高） |

---

## 3. 零适配最小公倍数（LCD）

**能在六家全部直接生效、不做任何桥接的东西非常少，且瓶颈几乎总是 Claude Code：**

1. **仓库根 `AGENTS.md`**：Codex/OpenCode/Pi/Grok/DSH 五家原生读取；Claude Code 不读。⇒ 严格 LCD 不含 CC。
2. **`.agents/skills/<name>/SKILL.md`（仅标准字段 name/description/license/compatibility/metadata）**：Codex/OpenCode/Pi/Grok/DSH 五家原生扫描；Claude Code 不扫 `.agents/skills`。⇒ 同上。
3. **约束条件交集**（写规范文件时必须同时满足）：skill `name` = 小写 kebab-case ≤64 且**与目录同名**（OpenCode/规范硬性；Pi 宽松但别依赖）；`description` ≤1024 字符（OpenCode 硬校验、Pi 告警、规范上限），且把关键触发词放前 1536 字符内（CC 截断）/前 8000 字符预算内（CX）；不用嵌套 `**/SKILL.md`（DSH 不支持）；不依赖任何 Claude 专有 frontmatter（OpenCode 忽略、claude.ai 通道报错）。
4. **无头一发调用**：六家都有非交互模式与 JSON 输出（DSH 处于 preview、Windows 不全），但**旗标、输出 schema、退出码完全不同**——LCD 只能是"给一段 prompt、拿回一段文本"，工程上必须做每家一个薄封装脚本。
5. **完全没有 LCD 的领域**：hooks 配置格式（四种体系：CC settings.json 系 / Codex hooks.json 系 / OpenCode JS 插件 / Pi TS 扩展）、slash 命令定义、子代理定义、权限规则语法、plan mode、沙箱。

**实用 LCD 结论**：以 `AGENTS.md + .agents/skills/（标准字段）` 为规范源，**加一条一行桥**（CLAUDE.md 内容仅 `@AGENTS.md`）即可覆盖六家的指令+技能读取；这是当前生态的事实最大公约数（Grok 甚至同时读两者并去重，Pi 的 override 机制兼容）。

---

## 4. 每 Harness 桥接方案（复用一套规范文件）

设仓库规范源为：`AGENTS.md`（英文，供代理）+ `.agents/skills/`（标准 SKILL.md）+ `hooks/`（Claude hooks.json 格式的门禁脚本+配置）+ `docs/`（中文人类记录）。

| Harness | 指令桥 | 技能桥 | 门禁（hooks）桥 | 备注 |
|---|---|---|---|---|
| Claude Code | 提交一个只含 `@AGENTS.md` 的 `CLAUDE.md`（Windows 别用 symlink） | **唯一要复制/生成的一家**：CI 或 setup 脚本把 `.agents/skills/*` 镜像到 `.claude/skills/`（或双写提交）；Claude 专有字段可在镜像时叠加 | 原生：hooks 配置进 `.claude/settings.json`（团队提交）；`-p` 下也生效 | `claudeMdExcludes` 防 monorepo 串扰 |
| Codex | 原生读 AGENTS.md；如需也读 CLAUDE.md：`project_doc_fallback_filenames` | 原生 `.agents/skills` | 事件/JSON schema 与 CC 相同：把同一 hooks 对象放进 `<repo>/.codex/hooks.json`；需 `features.hooks` 开 + 项目信任 +（CI）`--dangerously-bypass-hook-trust` 或 requirements.toml 管控层 | matcher 工具名注意 `apply_patch|Edit|Write` 别名 |
| OpenCode | 原生 AGENTS.md | 原生 `.agents/skills`（`OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` 与此无关） | 写一个 ~50 行 TS 插件 `.opencode/plugins/gate.ts`：`tool.execute.before` 里按同一份策略 JSON 判定并 throw；配合 `permission` 配置 | 无 Stop 门：完成校验只能放 CI 或让插件在 `session.idle` 提示 |
| Pi | 原生 AGENTS.md（注意 AGENTS.override.md 语义） | 原生 `.agents/skills`；或 settings `skills` 数组显式挂 | 写 `.pi/extensions/gate.ts`：`tool_call` 返回 `{block:true}`；项目信任：CI 传 `-a` 或 `defaultProjectTrust` | 无内置 subagents/plan——框架流程须全部放进 skills/CI |
| Grok | 原生（AGENTS.md 与 CLAUDE.md 都读） | 原生（`.agents/skills` 各层都扫，还读 `.claude/skills`） | 原生双通道：读项目 `.claude/settings.json` 的 hooks 或 `.grok/hooks/*.json`；CI/首次需 `--trust` 或 `/hooks-trust`；**注意 fail-open**——脚本内部必须兜错并显式 deny | 权限规则兼容 CC 语法，`.claude/settings.json` 一份两用 |
| DSH | 原生（instructionFileCandidates 默认含 AGENTS.md） | 原生 `.agents/skills`（rank 200） | 启用 `dsh-hooks-claude-code` 插件指向仓库 hooks.json（同一份 CC 格式） | preview：路径/组合方式可能变；Windows 团队暂勿作为主力 |

**一份写、六家吃**的最大化组合：`AGENTS.md`（+一行 CLAUDE.md）、`.agents/skills`（+CC 镜像脚本）、**Claude hooks.json 格式作为门禁"源格式"**（CC/Grok/DSH 直读，Codex 同 schema 换位置，OpenCode/Pi 用 ~50 行适配器消费同一份策略 JSON）。

---

## 5. 硬门禁能力（哪些 Harness 能真正阻断一步）

框架要求"每个功能有测试证明、关键节点人审"，需要**机器可执行的硬门**。分三级：

**A 级（工具前拦截 + 完成门禁双全，可在 harness 内闭环强制）**
- **Claude Code**：PreToolUse deny/exit2 + Stop/SubagentStop block（600s 超时跑测试）+ TaskCompleted/PostToolBatch/UserPromptSubmit 均可 block；`-p` 模式 hooks 照跑；deny 权限规则连 bypassPermissions 都压不掉。最强。
- **Grok**：PreToolUse deny + Stop/SubagentStop block（600s，语义对齐 CC）；但 **fail-open**（hook 崩溃=放行，连续 block 上限 8 次）——门禁脚本必须自兜异常；plan mode 是真只读但子代理不受门。
- **Codex**：PreToolUse deny/updatedInput + PermissionRequest 决策 + Stop/SubagentStop 续跑 block；再叠 execpolicy `.rules forbidden`（命令前缀级硬禁）与沙箱。注意 hooks 需 features 开关+信任链，CI 里要么管控层要么 `--dangerously-bypass-hook-trust`。

**B 级（能拦工具调用，但没有"完成前必须过测试"的 Stop 门）**
- **OpenCode**：插件 `tool.execute.before` throw = 硬拦（同步、确定）；`permission deny` 硬拦；但代理宣布"做完了"没有钩子可扣——完成验收必须放 CI/外层脚本。
- **Pi**：扩展 `tool_call {block:true, terminate}` 硬拦且可改参；同样无内置 Stop 门（理论上扩展可在 `agent_end` 后自动 `sendMessage` 续逼，但属自研范畴 `[中]`）。

**C 级（机制存在但成熟度/覆盖未知）**
- **DSH**：经 CC/Codex hook 桥获得 PreToolUse/Stop 语义 + fail-closed 审批层 + 沙箱；理论完备，但 preview 阶段桥的事件覆盖率与稳定性未经验证 `[中]`。

**含义**：跨六家统一的"硬门"只有两条腿最稳——(1) **PreToolUse 级拦截**六家都能落（四家原生+两家 50 行适配器）；(2) **完成/验收门**只有 CC/GK/CX 能在 harness 内强制，OpenCode/Pi/DSH 必须由**外部 CI 门**（可重跑的测试脚本+退出码）兜底。因此框架的验收门应设计为 "CI 脚本是唯一事实（source of truth），harness 内 Stop-hook 只是提前反馈的加速器"。

---

## 6. Headless/CI 调用配方

```bash
# Claude Code —— exit 0/非零；json 里有 total_cost_usd/usage/structured_output
claude -p "运行 R2 验收：pytest -q 并修复失败" \
  --output-format json --permission-mode dontAsk \
  --allowedTools "Bash(pytest *) Read Edit" --max-budget-usd 5 [--bare]
jq -r '.result' ; # 结构化: --json-schema '<schema>' → .structured_output

# Codex —— 进度在 stderr，最终答案在 stdout；JSONL 事件用 --json
codex exec "同上任务" --json -o last.md \
  --sandbox workspace-write -a never [--output-schema schema.json]
codex exec resume --last "继续修"        # 续会话；CI 认证 CODEX_API_KEY

# OpenCode —— 事件流 JSON；--auto 自动批准（deny 仍拦）
opencode run "同上任务" --format json --agent build -m anthropic/claude-sonnet-4-6 --auto
opencode serve &  opencode run --attach http://localhost:4096 "..."   # 免 MCP 冷启

# Pi —— print/JSONL/RPC 三态；CI 求确定性用显式资源
pi -p "同上任务" --no-extensions --no-skills --skill ./.agents/skills/verify -a
pi --mode json "..." | your-parser      # LF 分隔 JSONL

# Grok —— 退出码 0/1/130/143 文档化；四种输出格式
grok -p "同上任务" --output-format json --always-approve \
  --deny "Bash(rm*)" --max-turns 40 -s "$(uuidgen)"   # 或 -r <id> 续
jq -r '.text'                            # XAI_API_KEY 用于 CI

# DSH（preview，仅 Linux/macOS 可靠）
python -m venv .venv && pip install deepseek-harness-sdk   # DEEPSEEK_API_KEY
# 或 headless bundle profile（一次性 runner；approval=never 拒绝一切升权）
```

要点：五家成熟 CLI 都支持 **会话续跑**（可做"分阶段门禁+人审后继续"的流水线）与 **JSON 输出**；只有 CC 与 GK 支持 `--json-schema` 结构化约束；预算护栏只有 CC（`--max-budget-usd`）；轮数护栏 CC（SDK）/GK（`--max-turns`）。

---

## 7. 已知限额汇总

| 项 | Claude Code | Codex | OpenCode | Pi | Grok | DSH |
|---|---|---|---|---|---|---|
| 指令文件总量 | 无硬限（建议<200 行/文件） | **32 KiB 合并**（可调） | 未见 | 未见 | 文档冲突：README 说 10k 字符/文件截断 vs user-guide 说不截断 `[中]` | maxBytes 可配 |
| @import 深度 | 4 跳 | n/a | n/a | n/a | n/a | n/a |
| skill name | ≤64 目录名 | ≤64 | 1-64 且=目录名 | ≤64（可≠目录名） | ≤64 | kebab 正则 |
| skill description | 清单条目合并截断 1536 字符 | — | **1-1024 硬校验** | ≤1024 告警 | 建议具体化 | — |
| skills 清单预算 | 1% 上下文（可调） | 2% 或 8000 字符 | — | — | — | 仅 name+desc |
| compatibility 字段 | ≤500 字符 | — | — | ≤500 | — | — |
| hook 超时默认 | 600s（Stop 同；Prompt30/Agent60） | 600s（SessionEnd≤300） | 插件同进程 | 扩展同进程 | 5s；**Stop 600s** | 桥默认 600s |
| hook 输出 | 字符串 10,000 上限 | additionalContext 2500 tokens 落盘 | — | — | stderr 首行显示 | 摘要字符上限可配 |
| 并发子代理 | 20 默认 | 可配 | — | — | 后台任务面板 | 可配 |
| 嵌套深度 | 3 默认 | 未见 | 未见 | — | **1** | 能力位 |
| headless stdin | 10MB | — | — | — | — | — |
| 压缩后 skills 重挂 | 5k/skill、25k 总 tokens | — | — | — | — | — |

---

## 8. 跨 Harness 标准现状（AGENTS.md / Agent Skills / ACP）

- **AGENTS.md（agents.md）**`[高]`：官网称"用于 60k+ 开源项目"；列名采纳者含 OpenAI Codex、Google Jules/Gemini CLI、Factory、Aider、goose、**opencode**、Zed、Warp、VS Code、Devin、JetBrains Junie、Amp、Cursor、RooCode、GitHub Copilot coding agent、Windsurf 等。**Claude Code 不在其列且文档明确不读**（用 @import 桥）；Grok/Pi/DSH 实际支持但未上官网名单。2026 年新增惯例：`AGENTS.override.md`（Codex、Pi 已实现）——注意这两家语义略异（Codex：目录内覆盖优先；Pi：替代该目录文件）。
- **Agent Skills（agentskills.io）**`[高]`：spec 稳定为 SKILL.md + `name/description/license/compatibility/metadata(/allowed-tools 见 Claude 通道)` + scripts/references/assets 渐进披露。六家全部实现（成熟度：CC 超集、CX/GK 超集、OC 严格子集、PI 宽松、DS 结构对齐）；**没有所谓 "SKILL.md v2"** ——2026 年内未见任何 v2 公告 `[中，检索无果]`。目录惯例 `.agents/skills` + `~/.agents/skills` 已成为 CX/OC/PI/GK/DS 五家交集，唯 CC 缺席。
- **ACP（Agent Client Protocol, agentclientprotocol.com）**`[高]`：编辑器↔代理标准（JSON-RPC/stdio）。原生实现：**OpenCode（`opencode acp`）**、**Grok（`grok agent stdio`，README 引用 ACP spec 与多语言 SDK；会话流即 ACP session updates）**、**DSH（acp subagent provider + acp-demo）**、Zed/Neovim/Emacs/marimo 为客户端。Claude Code 与 Codex 无原生 ACP（Codex 走自家 app-server 协议；Claude 走 Agent SDK）`[中]`。
- **"通用 hooks"**：不存在统一标准，但**事实标准是 Claude Code 的 hooks JSON schema**——Codex 文档自认同 schema，Grok 直读 `.claude/settings.json` 并对齐超时/退出码语义，DSH 造了专门的 `dsh-hooks-claude-code` 桥，Cursor 事件名被 Grok 映射。生态正向"CC schema 为源、各家适配"收敛 `[高]`。
- **配置互认矩阵（谁读谁家的文件）**`[高]`：Grok 读 CC（skills/agents/plugins/MCP/rules/permissions/hooks 七类）与 Cursor；OpenCode 读 CC（CLAUDE.md/skills）；Pi 读 CLAUDE.md（原生）与任意 skills 目录（配置）；Codex 不直读但 `/import` 一次性迁移 CC/Cursor；Claude `claude import` 迁 Codex/Gemini；DSH 读 CC/Codex hooks + AGENTS/CLAUDE 候选。**结论：Claude Code 的文件格式是被兼容最多的"引力中心"，而 AGENTS.md+.agents/skills 是被原生共读最多的"中立地带"。**

---

## 9. 对框架设计的含义

1. **规范源二元制**：代理指令用 `AGENTS.md`（+一行 CLAUDE.md 桥），流程性可复用步骤全部封装成 `.agents/skills`（标准字段），Claude 侧用生成脚本镜像到 `.claude/skills` 并注入 CC 专有增强（`context: fork`、`hooks`、`allowed-tools`）。**不要**把流程写进各家私有 slash 命令。
2. **门禁分两层**：L1 = PreToolUse 拦截（六家可达，两家需 50 行适配器），用同一份"策略 JSON"驱动；L2 = 验收门放 CI 可重跑脚本（测试、覆盖率、记录文件存在性检查），CC/GK/CX 的 Stop-hook 仅作为提前反馈加速器。Grok 的 fail-open 与 OC/PI 的无 Stop 门决定了**CI 是唯一可信执法点**。
3. **AGENTS.md 预算**：Codex 32 KiB 合并上限是最紧约束——根 AGENTS.md 必须精瘦（<8KB 为宜），细则下沉到子目录 AGENTS.md 与 skills 正文（渐进披露免费）。skill description 统一按 ≤1024 字符、关键词前置书写。
4. **并行开发**：worktree 隔离只有 CC/GK 原生；框架的多代理并行应以 **git worktree 由外部脚本创建**为准（六家通吃），harness 内建隔离仅作优化。
5. **会话交接**：六家都有可续会话与 JSON 导出（CC transcript/GK sessions/PI JSONL/OC export/CX resume/DSH append-only log），但格式互不兼容——框架的 handoff 文档必须是**自产 markdown**（per-feature summary），不能依赖任何家的原生会话格式。
6. **Windows 现实**：CC（沙箱除外）/CX/GK/PI 原生可用；OC 建议 WSL；**DSH 当前不适合 Windows 团队主力**。门禁脚本建议双写（bash + PowerShell）或统一走 Python 以规避 shell 差异（CC hooks 的 `shell` 字段、CX 的 `commandWindows`、GK 的 `cmd /C` 语义都能指到同一 Python 入口）。
7. **DSH 策略**：官方、活跃、架构先进（可把 Codex/Claude 当子代理、hook 桥吃现成配置），但 rc 阶段破坏性变更明示——框架应"兼容不依赖"：规范文件它天然能读，门禁与 CI 不为它单独建设，待 GA 再评估。

---

## References

**本地实测（accessed 2026-08-17，除注明外）**
- `claude --version` / `claude --help` / `claude import --help` / `claude agents --help` / `claude plugin --help`（Claude Code 2.1.233）
- `codex --version` / `codex --help` / `codex exec --help` / `codex features list` / `codex plugin --help` / `codex sandbox --help` / `codex review --help`（Codex 0.144.1）
- `C:\Users\NF3317\.codex\`（config.toml、skills/、rules/default.rules、memories/、plugins/、AGENTS.md、version.json）
- `opencode --help` / `opencode run --help` / `opencode agent|debug|session|acp|plugin --help` / `opencode debug paths` / `opencode debug skill`（含内置 customize-opencode skill 全文）/ `opencode debug config`（OpenCode 1.18.18）
- `C:\Users\NF3317\.grok\README.md`（2689 行全读）、`CHANGELOG.md`（1.0.4, 2026-08-13）、`config.toml`、`version.json`、`bundled/`（manifest.json、agents/、roles/、personas/、skills/ 24 项）、`docs/user-guide/01–24`（重点 04/05/08/10/12/14/16/17/19/22/24 全读）；`grok --help` / `grok inspect --help` / `grok inspect`（Grok 1.0.4）

**Claude Code 官方（accessed 2026-08-17）**
- https://code.claude.com/docs/en/memory （CLAUDE.md/rules/auto memory/AGENTS.md 立场/import 语法）
- https://code.claude.com/docs/en/skills （目录/frontmatter 全表/1536 与 1% 预算/`!` 注入/shell 字段）
- https://code.claude.com/docs/en/hooks （30 事件/5 handler/退出码/JSON 输出/超时/Windows shell）
- https://code.claude.com/docs/en/sub-agents （frontmatter/并发 20/深度 3/worktree/fork/teams）
- https://code.claude.com/docs/en/headless （-p/输出格式/--bare/退出码/10MB stdin）
- https://code.claude.com/docs/en/permission-modes （六模式/auto 分类器/plan 细节）
- https://code.claude.com/docs/en/setup （Windows/Git Bash/沙箱支持表）
- https://code.claude.com/docs/en/context-window （压缩存活表/1% 细节/autocompact）
- https://code.claude.com/docs/en/settings （文件位置/优先级/权限规则语法）
- https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md （2.1.x 全文检索；accessed 2026-08-17 与 2026-08-21，后者顶部为 2.1.238）

**Codex 官方（accessed 2026-08-17；developers.openai.com 重定向至 learn.chatgpt.com）**
- https://learn.chatgpt.com/llms.txt （文档索引）
- https://learn.chatgpt.com/docs/agent-configuration/agents-md.md （发现顺序/override/32 KiB/fallback）
- https://learn.chatgpt.com/docs/build-skills.md （.agents/skills 五层/2% 或 8000/openai.yaml）
- https://learn.chatgpt.com/docs/hooks.md （11 事件表/信任/exit2/async/additionalContextLimit/commandWindows）
- https://learn.chatgpt.com/docs/agent-configuration/subagents.md （角色/自定义 toml/并发）
- https://learn.chatgpt.com/docs/agent-configuration/rules.md （execpolicy .rules）
- https://learn.chatgpt.com/docs/non-interactive-mode.md （codex exec/--json/resume/CODEX_API_KEY/codex-action）
- https://learn.chatgpt.com/docs/config-file/config-reference.md （features/agents/memories/hooks/windows.sandbox 键全表）
- https://learn.chatgpt.com/docs/developer-commands.md?surface=cli （slash 全表含 /plan /import /status）
- https://learn.chatgpt.com/docs/customization/memories.md 、/docs/import.md 、/docs/sandboxing.md 、/docs/windows/windows-sandbox.md 、/docs/environments/git-worktrees.md 、/docs/custom-prompts.md（已弃用）、/docs/cli-customization.md 、/docs/changelog（0.147 条目）
- https://github.com/openai/codex/releases.atom （accessed 2026-08-21：0.149.0/0.150.0-alpha.1）；https://raw.githubusercontent.com/openai/codex/main/docs/*.md（config.md 的 allow_managed_hooks_only 注记）

**OpenCode 官方（accessed 2026-08-17）**
- https://opencode.ai/docs/ 及子页：/rules/（AGENTS.md/CLAUDE.md 回退/instructions 数组）、/skills/（六目录/frontmatter 五字段/1024/permission.skill）、/commands/、/agents/（primary|subagent/frontmatter/Task 权限）、/permissions/、/plugins/（hook 面/throw 阻断/事件清单）、/config/（合并序/compaction/snapshot）、/cli/（run/serve/acp/stats/env 表含 OPENCODE_DISABLE_CLAUDE_CODE*）、/acp/、/windows-wsl
- https://registry.npmjs.org/opencode-ai/latest （accessed 2026-08-21：1.18.19）

**Pi 官方（accessed 2026-08-17）**
- https://raw.githubusercontent.com/badlogic/pi-mono/main/packages/coding-agent/README.md （301→earendil-works/pi；全文）
- 同仓库 docs/：skills.md（位置/frontmatter/宽松校验/其他 harness 目录）、extensions.md（事件/tool_call block/位置）、prompt-templates.md、json.md、settings.md（compaction/defaultProjectTrust）、rpc.md、packages.md
- https://pi.dev/ （落地页；install.ps1）；https://registry.npmjs.org/@earendil-works/pi-coding-agent/latest （0.84.2，accessed 2026-08-17 与 08-21 一致）

**Grok 在线**：x.ai/cli 未单独核（本地 README 即权威、随 1.0.4 分发）`[中]`；ACP 参考 https://agentclientprotocol.com （经 Grok README 引用）。

**DeepSeek Harness（accessed 2026-08-17 首查 / 2026-08-21 补全）**
- https://www.deepseek.com/harness/en/ （产品页：developer preview/插件宣言/四模式/append-only log）
- https://github.com/deepseek-ai/deepseek-harness （master；MIT；README 全文 2026-08-21）
- https://deepseek-harness.github.io/deepseek-harness/en/ 子页（2026-08-21）：guide/quickstart、guide/python-sdk（平台限制）、reference/config-catalog（dsh-agent-instructions/workspaceContext/hooks-claude-code/hooks-codex 配置）、reference/subsystems/{skills, subagent, approval, permission-presets, plan, commands, compaction, token-meter, sandbox}、reference/capability-seams
- https://registry.npmjs.org/@deepseek-ai/dsh/latest （0.1.0-rc.7，accessed 2026-08-21）
- Bing 检索 "DeepSeek Harness"（accessed 2026-08-17，确认发布时间线）

**标准站点（accessed 2026-08-21）**
- https://agents.md/ （60k+ 项目/采纳者名单）
- https://agentskills.io/ 与 /clients （spec 概览；client showcase 页为 JS 渲染，名单未抓全 `[低]`）

**未核实/存疑清单**：Codex 退出码枚举；OpenCode/Pi/DSH 退出码；Grok 指令文件 10k 截断与"无上限"文档冲突；Grok 沙箱 Windows 支持（文档未列即视为无）；Pi 第三方 subagent 包细节；DSH 的 MCP 支持、跨会话记忆、CLI 旗标全集（preview）；agentskills.io 官方 adopter 完整名单；"SKILL.md v2" 不存在系检索无果的否定性结论。
