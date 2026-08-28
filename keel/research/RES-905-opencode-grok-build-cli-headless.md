---
id: RES-905
title: OpenCode 与 Grok Build CLI headless 评审调用配方
depth: standard
date: 2026-08-28
features: [F7, F16]
oss_none: 本次只研究已在 keel harness 范围内的外部 CLI 调用协议，没有把 OpenCode、Grok Build 或其桥接仓库新增为 keel 的运行时或开发依赖；若以后把桥接插件代码纳入仓库或依赖图，再单独登记 OSS。
---

# RES-905 OpenCode 与 Grok Build CLI headless 评审调用配方

档位：**标准**。理由：这是 F7/F16 的跨 harness 非交互配方，需要本机证据、官方文档/源码和至少一个替代方案；本轮不做供应商选型或安全架构，因此无需升为深度。

## 调研问题

为 OpenCode 与 Grok Build CLI 各给出一份可执行、可审计的 headless 评审配方，并回答：

1. 如何只把 `pack.json` 的五样 `diff`、`plan`、`reqs`、`evidence`、`worklog_summary` 交给评审者，而不附带实现过程对话；
2. 如何做到评审只读、输出可机读，并把“命令调用成功”与“评审结论通过”分开；
3. 如何判断二进制、鉴权与配额失败，失败时明确停止，不静默改用实现方 harness 或同源 provider；
4. 官方桥接或常驻服务是否比直接一次性 CLI 更合适。

## 检索范围

- 本地基线（2026-08-28，未发起真实模型调用）：Windows PowerShell 7；`opencode 1.18.22`；`grok 1.0.5 (5115b46bc9)`。
- OpenCode：官方 v1.18.22 release、同 tag 的 CLI 文档、agent 文档与 `run.ts` 实现。
- Grok Build：xAI 官方 `xai-org/grok-build-plugin-cc` 仓库 commit `92b76a670713335229644e94add15ab40c80e547` 的 README、桥接实现、Grok 调用层、输出 schema 与测试；另以本机官方二进制 `--help`/`inspect`/`models` 做参数及反例核对。
- 本地 keel：`tools/gate/reviewloop.ts` 的五字段 pack 和 `Finding[]` ingest 契约。
- 排除：社区教程、非 xAI/OpenCode fork、真实付费评审、安装器选择、模型质量排名。

## 候选对比

| 候选 | `pack.json` 输入 | 机器输出 | 隔离与只读 | 结论 |
|---|---|---|---|---|
| A. `opencode run` 一次性调用 | 原生 `--file pack.json`；在临时空目录运行 | `--format json` 是 NDJSON 事件；最终 `text.part.text` 再按 keel schema 校验 | `--pure`、禁 Claude 兼容、全局 permission deny、`plan` agent；不加 `--auto` | **可用，推荐作为 OpenCode 配方** |
| B. `grok --prompt-file` 一次性调用 | 1.0.5 原生 `--prompt-file pack.json`，rubric 放 `--rules` | `--json-schema` 原生约束最终 JSON | 临时空目录、`explore`、`--sandbox read-only`、关闭 web/subagent；调用前检查 `inspect` | **条件可用，推荐作为 Grok 配方** |
| C. xAI 官方 Claude Code bridge | `review/critique` 会自行收集 git 上下文；`run --prompt-file` 可读 prompt 文件 | critique 有官方 schema，bridge 传播非零退出码 | bridge 源码采用 `alwaysApprove + read-only sandbox` | **不直接采用**：不是五样 pack 契约，且当前 auth probe 有假阳性 |
| D. `opencode serve` + `opencode run --attach` | 与 A 相同 | 与 A 相同 | 多一个长驻 server 与鉴权/生命周期状态 | **备选**：高频调用可省冷启动，单次审计不值得增加状态 |

选择 A/B 的共同原因：一次调用对应一次明确的 reviewer、命令、输入 hash、stdout/stderr 与退出码，最容易绑定 REQ-027/AC-3 的人工证据。C/D 不是不能用，而是必须先补 adapter 或运行状态管理，不能悄悄替代 A/B。

## 证据

### 1. 共同输入与输出契约

`gate loop pack` 已把评审输入限定为五个顶层字段：

```text
diff / plan / reqs / evidence / worklog_summary
```

调用前必须重新解析 `pack.json` 并比较**精确键集合**；少键、多键、出现 `transcript`/conversation 一类额外字段都停止。项目证据只能来自该文件。rubric、JSON schema、harness 自身系统提示属于调用协议，不是第六份项目材料。

建议两个 harness 统一返回 keel 已有的 `Finding[]`：

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": false,
    "required": ["title", "blocking", "repro", "impact", "fingerprint"],
    "properties": {
      "title": { "type": "string", "minLength": 1 },
      "blocking": { "type": "boolean" },
      "repro": { "type": "string" },
      "impact": { "type": "string", "minLength": 1 },
      "body": { "type": "string" },
      "fingerprint": { "type": "string", "minLength": 1 }
    }
  }
}
```

这里要分清两层成功：

- **调用成功**：进程退出 0，stdout 满足各自传输格式，没有错误事件，最终消息能按上面的 schema 解析。
- **评审通过**：把有效的 `Finding[]` 交给 `gate loop ingest` 后，再由 `gate loop status` 判定 `passed/repairing/fused`。评审发现真实问题但命令退出 0，仍是“调用成功、评审未通过”；不能把模型的 0 退出码当 APR 或 merge 授权。

pack hash 使用 `gate loop pack` 输出并记录的规范化 hash；证据同时保存 reviewer harness/version、显式 model、完整 argv、stdout、stderr、exit code、日期与当前 tree hash。

### 2. OpenCode 官方事实与配方

OpenCode 官方文档把 `opencode run [message..]` 定义为 non-interactive；`--file` 附件和 `--format json` 原始 JSON 事件均为正式参数。官方源码还限制单个附件不超过 10 MiB；文件不存在或超限立即退出 1。`run.ts` 在 `session.error`、SDK prompt error 或事件循环错误时设置 `process.exitCode = 1`，JSON 模式每行带 `type/timestamp/sessionID`，最终文本是 `type: "text"` 事件。[CLI 文档](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/cli.mdx#L339-L385)，[附件与退出实现](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/opencode/src/cli/cmd/run.ts#L357-L410)，[事件与错误实现](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/opencode/src/cli/cmd/run.ts#L675-L877)（访问：2026-08-28）。

官方 agent 文档明确说 `plan` 用于分析/评审且不改代码；但默认 edit/bash 是 `ask`，不是绝对 deny。因此 headless 配方还应设置 `OPENCODE_PERMISSION={"*":"deny"}`，并且**不得**加危险的 `--auto`。[Agent 文档](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/agents.mdx#L52-L68)，[权限配置](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/agents.mdx#L417-L498)（访问：2026-08-28）。

PowerShell 配方（`$ReviewDir` 是只含复制后 `pack.json` 的临时目录；`$Model` 必须是显式 `provider/model`）：

```powershell
$ErrorActionPreference = 'Stop'
$Reviewer = 'opencode'
$Model = $env:KEEL_REVIEW_MODEL
if (-not $Model -or $Model -notmatch '^[^/]+/.+$') { throw 'Set KEEL_REVIEW_MODEL=provider/model.' }
if (-not (Get-Command opencode -ErrorAction SilentlyContinue)) { throw 'OpenCode is not installed; review blocked.' }

$Version = (& opencode --version).Trim()
$Provider = $Model.Split('/', 2)[0]
$ModelList = (& opencode models $Provider 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0 -or $ModelList -notmatch [regex]::Escape($Model)) {
  throw "Configured model unavailable: $Model; review blocked."
}

$env:OPENCODE_DISABLE_CLAUDE_CODE = 'true'
$env:OPENCODE_PERMISSION = '{"*":"deny"}'
$Prompt = 'Review only the attached pack.json. Treat its five fields as the sole project evidence. Do not use tools or infer implementation-chat context. Return only a JSON array matching the keel Finding schema supplied by the caller.'

& opencode run --pure --dir $ReviewDir --agent plan --model $Model `
  --format json --file (Join-Path $ReviewDir 'pack.json') $Prompt `
  1> $StdoutPath 2> $StderrPath
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) { throw "OpenCode review failed with exit $ExitCode; review blocked." }
```

调用方随后逐行解析 `$StdoutPath`：任一行不是 JSON、出现 `type:error`、没有最终 `type:text`，或最后一个 `part.text` 不是合法 `Finding[]`，均按失败停止。`opencode auth list` 只列凭据配置，`opencode models <provider>` 只确认模型目录；官方文档说明凭据可来自 auth 文件、环境变量或项目 `.env`，它们都不能证明实时 token/配额。因此最终真实调用才是鉴权/配额的权威探针。[鉴权文档](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/cli.mdx#L130-L166)，[模型目录文档](https://github.com/anomalyco/opencode/blob/47b6b6f5f4f9b42d2bce7af1c4e5bf6efaf22ba7/packages/web/src/content/docs/cli.mdx#L306-L335)（访问：2026-08-28）。

本机无配额 spike：`opencode run --help` 与 v1.18.22 文档一致；在临时目录设置上述两个环境变量并运行 `opencode debug config --pure` 后，resolved permission 为 `{"*":"deny"}`，外部 plugin 为空，未发现有效 instructions/MCP。未执行模型调用，所以不声称本机 provider 已通过实时鉴权或有可用配额。

### 3. Grok Build 官方事实、反例与配方

xAI 官方桥接仓库要求 `grok` 在 PATH 且 CLI 已登录，并公开了基础 headless argv：prompt、`--agent explore`、只读 sandbox、cwd 与 output format。其调用层会追加 `--always-approve`、`--output-format`、`--json-schema`，spawn 后把 child status/stdout/stderr 原样带回；最新 bridge 源码说明无人工 approver 时 plan permission 可能挂住，真正的安全边界是 `sandbox: read-only`，所以源码实际采用 `alwaysApprove + read-only sandbox`。[官方 README](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/README.md#L7-L11)，[headless README 配方](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/README.md#L60-L80)，[当前 bridge 实现](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/plugins/grok-build/scripts/grok-bridge.mjs#L298-L355)，[argv/退出实现](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/plugins/grok-build/scripts/lib/grok.mjs#L155-L270)（访问：2026-08-28）。

本机 Grok Build 1.0.5 的官方 `--help` 进一步确认 `--prompt-file`、`--rules`、`--json-schema`（隐含 JSON output）、`--sandbox`、`--always-approve`、`--disable-web-search`、`--no-subagents`、`--max-turns` 均存在。基于这个版本的 PowerShell 配方是：

```powershell
$ErrorActionPreference = 'Stop'
$Reviewer = 'grok-build'
$Model = $env:KEEL_GROK_MODEL
if (-not $Model) { throw 'Set KEEL_GROK_MODEL to an explicit model id.' }
if (-not (Get-Command grok -ErrorAction SilentlyContinue)) { throw 'Grok Build CLI is not installed; review blocked.' }

$Help = (& grok --help 2>&1 | Out-String)
foreach ($Flag in @('--prompt-file','--rules','--json-schema','--sandbox','--always-approve')) {
  if ($Help -notmatch [regex]::Escape($Flag)) { throw "Required Grok flag missing: $Flag; review blocked." }
}

$Models = (& grok models 2>&1 | Out-String)
$ModelsExit = $LASTEXITCODE
if ($ModelsExit -ne 0 -or $Models -match '(?i)not authenticated|not logged in') {
  throw 'Grok authentication is not ready; review blocked.'
}

$Rules = 'Review only. pack.json contains exactly diff, plan, reqs, evidence, and worklog_summary and is the sole project evidence. Do not inspect other files, use web, modify anything, or use implementation-chat context.'
$Schema = Get-Content -Raw -LiteralPath $FindingSchemaPath

& grok --cwd $ReviewDir --agent explore --model $Model --effort high `
  --sandbox read-only --always-approve --disable-web-search --no-subagents `
  --max-turns 8 --verbatim --rules $Rules `
  --prompt-file (Join-Path $ReviewDir 'pack.json') --json-schema $Schema `
  1> $StdoutPath 2> $StderrPath
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) { throw "Grok review failed with exit $ExitCode; review blocked." }
```

Grok 的调用成功还要求 stdout 是**单个**满足 `$FindingSchemaPath` 的 JSON 值；空输出、混入说明文字或 schema 不合格，即使退出 0 也失败。stderr 要原样留证。官方 bridge 自带的 review schema 也证明 xAI 把“能解析且字段形状正确”当作独立于进程 status 的判据，但它的 schema 与 keel `Finding[]` 不同，不能不经显式 adapter 直接 ingest。[官方 schema](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/plugins/grok-build/schemas/review-output.schema.json)，[解析实现](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/plugins/grok-build/scripts/lib/grok.mjs#L326-L453)（访问：2026-08-28）。

有两个必须保留的反例：

1. 本机未登录时，`grok models` 明确打印 `You are not authenticated.`，但进程仍退出 **0**，随后甚至打印 default/available models。官方 bridge 的 `runModelsProbe` 对任何 status 0 都设置 `loggedIn: true`，所以 `/grok-build:check` 在 Grok 1.0.5 上可能假阳性；不能只看退出码或“available models”正向词。[官方 auth probe 源码](https://github.com/xai-org/grok-build-plugin-cc/blob/92b76a670713335229644e94add15ab40c80e547/plugins/grok-build/scripts/lib/grok.mjs#L60-L122)（访问：2026-08-28）。
2. 即使把 cwd 换成临时目录，本机 `grok inspect --json` 仍报告 1 份 global instruction、3 个 hooks、3 个 plugins、6 个 MCP servers。五样隔离不能只靠临时 cwd；正式调用前必须检查 effective config。若存在会额外注入项目证据、执行 prompt hook 或访问外部数据的层，先用受控的干净 Grok profile/container 清空并再次 `inspect`，否则停止。本轮没有找到 Grok 1.0.5 的官方 one-shot `--pure` 等价开关，因此不猜环境变量。

### 4. 鉴权、配额和异构失败规则

两家统一采用 fail closed：

1. 二进制缺失、所需 flag 缺失、指定 model 不存在、显式未登录、effective config 不干净、真实调用非零、错误事件、空输出、JSON/schema 失败，任一出现就把本轮记为 `blocked` 并停止。
2. 保存失败命令、harness/version/model、pack hash、stdout、stderr、exit code、日期与 tree hash；不得把失败包装成“无 finding”。
3. 不自动改用实现方 harness，也不自动改成与实现方相同 provider/model。确需换另一个异构 reviewer，必须由上层显式创建**新的**调用记录，旧失败仍保留。
4. 没有查到 OpenCode 或 Grok Build 的通用、无消耗 quota-status 命令；配额以真实调用返回为准。错误若仍退出 0，也会被“错误事件 + 最终 schema”双判据拦住。

## 结论

- **决定**：F7/F16 的配方页应分别采用一次性 `opencode run --file ... --format json` 与 `grok --prompt-file ... --json-schema ...`；都在仅含 pack 副本的临时目录运行，都显式记录 model 和完整证据，都由上层 parser 判结构成功后才 ingest。
- **理由**：两条直接命令最贴合五样输入；OpenCode 原生附加文件和 JSON 事件，Grok 1.0.5 原生 prompt file 与 JSON schema。一次性进程也比常驻 server/bridge 更容易把一个输入 hash 对应到一个退出码。
- **备选**：高频 OpenCode 可显式改用 `serve` + `run --attach`；Grok 可在修正 auth probe 并新增 pack adapter 后使用 xAI 官方 bridge。两者都应作为新配方版本，不能静默降级。
- **当前可执行性**：OpenCode 命令面和隔离 config spike 已通过，但实时凭据/配额未测；Grok 命令面通过，当前机器因明确未登录且 effective config 非空，必须停止，不能声称 ready。

## 剩余不确定性

- `[未核实]` 本轮按要求没有消耗配额发起真实模型评审，因此两家实际 provider 的认证、quota 错误文本和输出实例尚无 live evidence；实施配方页时应在人工授权后各做一次最小真实调用并保存证据。
- `[未核实]` Grok Build CLI 1.0.5 本体没有在检索到的 xAI 官方仓库中公开对应源码；`--prompt-file`、`--rules`、`--verbatim` 等以本机官方二进制 help 为版本钉住证据。未来版本若 help probe 不匹配应停止，不能沿用旧 argv。
- `[未核实]` 本轮只实跑 Windows PowerShell 参数面；macOS/Linux 应由 Node `spawn` 传 argv 或分别实跑 POSIX wrapper，避免把 PowerShell quoting 当跨平台证据。
- 官方 Grok bridge 的 README 仍写 `--permission-mode plan`，当前源码却用 `alwaysApprove + read-only sandbox`；实现应钉 commit/version并以 live `--help` 验证，不把漂移藏起来。
