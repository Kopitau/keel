# 跨 harness 独立评审配方

- status: 0.8.0 本地配方；命令面已核对，真实模型调用仍须另留人工证据
- research: RES-905 / RES-906 / RES-907
- harnesses: Claude Code / Codex / OpenCode / Grok Build / DeepSeek Harness / Pi
- rule: 调用失败就是“未取得评审”，不得把失败包装成空 findings，也不得静默回退到实现方同源 harness

## 共同输入与输出

1. 先运行 `node tools/gate/gate.ts loop pack --base <rev> --implementer <h> --reviewer <other-h>`。`--base` 是规划起点的 commit 或 tree；同一规划再次 pack 继承上次的 base，否则取上次 passed 的树；都没有就拒绝，范围为空也拒绝（ISS-055）。diff 对整文件删除只列名（正文省略）、上下文 2 行。探针在所有平台经 `sh -c` 执行（ISS-054）。
2. 调用前重新解析 `keel/review/pack.json`，顶层键必须恰为 `diff`、`plan`、`reqs`、`evidence`、`worklog_summary`，并记录 `pack_hash` 与当前 tree hash。只把这五样复制到一次性输入目录；实现聊天、handoff、完整 worklog 和主仓不得作为额外项目材料交给 reviewer。
3. 统一 finding 字段为 `title`、`blocking`、`repro`、`impact`、`fingerprint`，可选 `body` 与 `pending_defense`。blocking finding 缺 `repro` 或 `impact` 时不得开 ISS；问题存在时攻击探针退出 0，修复或拒绝后退出非 0。
4. 调用成功至少同时满足：进程退出 0、出现各 harness 的正常终态、最终输出可解析并通过本地 schema、pack/tree 未漂移、旁车证据含 implementer/reviewer family、CLI 版本、显式 model、脱敏 argv、stdout/stderr、退出码、日期。调用成功不等于评审通过；仍须把 `Finding[]` 交给 `gate loop ingest`。
5. 鉴权、配额、429、超时、信号、缺 flag、错误事件、空输出或 schema 错误任一发生即停止。允许显式安排另一家仍然异构的全新调用，但旧失败要保留，same-harness fallback 永远禁止。

共同输出形状：

```json
[
  {
    "title": "简短标题",
    "blocking": true,
    "repro": "问题存在时退出 0 的命令",
    "impact": "对正确性或需求达成的影响",
    "fingerprint": "稳定指纹",
    "body": "可选补充",
    "pending_defense": "可选；未知时写待诊断"
  }
]
```

## claude-code

- mode: headless
- command: `claude --bare --strict-mcp-config --tools "" --no-session-persistence --max-turns 1 --model <model> --output-format json --json-schema <schema-json> -p <fixed-review-rubric>`
- input: `keel/review/pack.json` 的 UTF-8 bytes 经 stdin；Node `spawn` 传 argv，`--tools` 后保留真实空参数
- output: stdout 单个 JSON；取 `structured_output.findings`，本地复验后写 `Finding[]`
- success: exit=0 且有合法 `structured_output.findings`，无超时、信号、鉴权、billing、rate-limit、overloaded 或 budget 错误
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://code.claude.com/docs/en/headless
- retrieved: 2026-08-28
- identity_family: claude-code
- isolation: `--bare --tools ""`；API key 仅注入子进程并从证据打码

真实调用前还须核对 [Claude CLI reference](https://code.claude.com/docs/en/cli-reference)；本地命令面已核，真实额度调用未核实。

## codex

- mode: headless
- command: `codex exec --ephemeral --ignore-user-config --ignore-rules --sandbox read-only --skip-git-repo-check -C <isolated-dir> -m <model> -c web_search="disabled" --json --output-schema <schema-path> --output-last-message <result-path> <fixed-review-rubric>`
- input: `keel/review/pack.json` 经 stdin；隔离目录只放控制面 schema，不放主仓
- output: stdout JSONL 事件流加最终 envelope；adapter 只把 `.findings` 写成 `Finding[]`
- success: exit=0、恰有 `turn.completed`、没有 `turn.failed`/`error`、最终文件是合法 JSON 且通过同一 schema
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://developers.openai.com/codex/noninteractive
- retrieved: 2026-08-28
- identity_family: openai-codex
- isolation: 裸机 read-only 只证明不写；要证明硬五样-only，必须用不挂载主仓和用户目录的一次性容器或 VM

参数详见 [Codex CLI reference](https://developers.openai.com/codex/cli/reference)。本地 0.144.1 命令面已核，真实模型调用未核实。

## opencode

- mode: headless
- command: `opencode run --pure --dir <isolated-dir> --agent plan --model <provider/model> --format json --file <isolated-dir>/pack.json <fixed-review-rubric>`
- input: 一次性目录中的 `keel/review/pack.json` 副本；设置 `OPENCODE_DISABLE_CLAUDE_CODE=true` 与 `OPENCODE_PERMISSION={"*":"deny"}`
- output: stdout NDJSON；拒绝错误事件，取最后 `text` 事件的 `part.text` 并按 `Finding[]` 本地复验
- success: exit=0、每行可解析、无 `type:error`、有最终 `type:text`、最终文本通过 schema
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/cli.mdx#L339-L385
- retrieved: 2026-08-28
- identity_family: opencode
- isolation: 禁止 `--auto`；真实调用才是鉴权和配额的最终探针

本地 pure/permission 配置与命令面已核，provider 实时凭据和额度未核实。

## grok-build

- mode: headless
- command: `grok --cwd <isolated-dir> --agent explore --model <model> --effort high --sandbox read-only --always-approve --disable-web-search --no-subagents --max-turns 8 --verbatim --rules <fixed-review-rubric> --prompt-file <isolated-dir>/pack.json --json-schema <schema-json>`
- input: 一次性目录中的 `keel/review/pack.json` 副本；调用前 `grok inspect --json` 必须证明无额外 instructions/hooks/plugins/MCP 注入
- output: stdout 单个 `Finding[]` JSON 值；stderr 原样留证
- success: required flags 存在、effective config 干净、无未登录否定文本、exit=0、stdout 非空且通过 schema
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/README.md#L60-L80
- retrieved: 2026-08-28
- identity_family: grok-build
- isolation: `grok models` 未登录时也可能 exit 0，绝不能只看退出码或 available-model 正向文字

本机 1.0.5 当前未登录且全局配置非空，所以按本配方必须停止；不能声称 ready。

## deepseek-harness

- mode: headless
- command: `npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile headless <fixed-review-rubric>`
- input: cwd 为只含 `keel/review/pack.json` 副本的一次性目录；rubric 只允许读取该文件五键
- output: stdout 只收最终 `Finding[]`，stderr 单独留证
- success: fresh `DSH_HOME`、显式 key/model、终态 completed、exit=0、stdout 非空且通过 schema、pack/tree/身份一致
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.1-rc.2/apps/cli/README.md
- retrieved: 2026-08-28
- identity_family: deepseek-harness
- isolation: 设置 `DSH_PERMISSION_MODE=read-only`；无安全审计，严格隔离用容器/VM；Windows 链失败时可显式转 WSL，不可换成实现方 harness

rc.2 命令面已核；原生 Windows 完整模型/沙箱链与余额未核实。

## cursor

- mode: headless（Cursor 的 CLI `agent`；CHG-012 的契约以桌面客户端为准——客户端原生读根 `AGENTS.md` 与 `.agents/skills`，零适配；本机 CLI 未安装、命令面据文档、真实调用未核实）
- command: `agent -p --output-format json --mode=ask --sandbox enabled --trust --workspace <isolated-dir> --model <model> <fixed-review-rubric>`
- input: 一次性目录只放 `keel/review/pack.json` 副本，rubric 只允许读该文件五键；探测须用绝对路径或 `--version` 鉴别——PATH 上的 `agent` 可能是 Grok Build 的同名二进制（本机即如此）
- output: stdout JSON（`--output-format json`）；取最终文本按 `Finding[]` 本地复验，stderr 单独留证
- success: exit=0、stdout 可解析并通过 schema、pack/tree 未漂移、旁车证据记录 `--model`（家族由模型决定）、CLI 版本、日期；调用成功不等于评审通过
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://cursor.com/docs/cli/reference/parameters
- retrieved: 2026-08-29
- identity_family: 由 `--model` 决定（Cursor 是 harness 不是模型供应方；攻击视角复审的异构性按模型家族判）
- isolation: `--sandbox enabled` + `--mode=ask`（只读）；`--trust` 只对一次性目录；未核实 stdin 与退出码约定

## pi

- mode: sequential-session
- command: `npm exec --yes --package=@earendil-works/pi-coding-agent@0.84.3 -- pi -p --no-session --no-tools --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files --no-approve --provider <provider> --model <model> -- @pack.json <fixed-review-rubric>`
- input: 新进程 cwd 只含 `keel/review/pack.json`；旁车记录交付的 `pack_hash`，不得传原会话聊天
- output: stdout 只收最终 `Finding[]`，stderr 单独留证
- success: 独立新进程、fresh config、文本终态非 error/aborted、exit=0、stdout 非空且通过 schema、原会话与评审会话身份/时间不同
- on_failure: stop
- same_harness_fallback: forbidden
- source: https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/README.md
- retrieved: 2026-08-28
- fresh_context: required
- identity_family: pi
- isolation: 设置 fresh `PI_CODING_AGENT_DIR`；Pi 官方无内置子代理，因此顺序启动全新 `-p --no-session` 进程

v0.84.3 命令面已核，真实 provider 调用未核实；JSON/RPC 备选必须另加终态解析，不能只信 exit 0。
