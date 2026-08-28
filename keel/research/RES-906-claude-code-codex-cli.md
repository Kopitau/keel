---
id: RES-906
title: Claude Code 与 Codex CLI 非交互评审配方
depth: standard
date: 2026-08-28
features: [F7, F16]
oss_none: "本次只把厂商 CLI 和官方源码当作外部 harness 契约的证据，不引入依赖、不复制源码；若后续嵌入 Agent SDK、Codex SDK 或复用源码，再建 OSS 记录。"
---

# RES-906 Claude Code 与 Codex CLI 非交互评审配方

档位：**标准**。本地核对已安装 CLI 的版本与 `--help`，再用厂商官方文档/官方源码确认；比较“新进程/新会话”“原生子代理”和 SDK 三种路线。本次没有发起计费模型调用。

## 调研问题

为 F7/F16 给出 Claude Code 与 OpenAI Codex CLI 的可执行 headless/non-interactive 评审配方，回答五件事：

1. 精确使用什么命令和输入方式；
2. 怎样只把 `pack.json` 的 `diff`、`plan`、`reqs`、`evidence`、`worklog_summary` 五样交给评审者，不夹带实现聊天；
3. 怎样把结构化报告、进程退出码和事件流合成不误报的成功判据；
4. 鉴权、配额、费用与本地隔离有哪些前置条件；
5. 异构调用失败时，什么情况下必须停下，不能静默回退到实现方同源 harness。

## 检索范围

- 本地证据（2026-08-28）：`claude --version` 为 `2.1.250 (Claude Code)`；`codex --version` 为 `codex-cli 0.144.1`。两者的本地 `--help` 均含下文使用的主参数。只核对参数表，没有运行模型。
- 仓库证据：`tools/gate/reviewloop.ts` 的 `PACK_KEYS` 恰为五项，并分别限制为 400000 / 80000 / 80000 / 120000 / 4000 字符；`validatePack` 拒绝额外字段、缺字段、超限和疑似聊天转录。当前 `gate loop ingest` 读取的是 `Finding[]`。
- 外部证据只用 Anthropic/OpenAI 官方文档与 OpenAI 官方源码；访问日期均为 **2026-08-28**。
- 不调研 OpenCode、Grok、dsh、Pi 的配方；不比较模型质量；不在本 RES 中替用户选择具体模型或预算金额。

## 候选对比

| 候选 | 上下文隔离 | 可异构 | 可审计性 | 代价/限制 | 结论 |
|---|---|---:|---:|---|---|
| A. 启动新的 CLI 进程：`claude -p` / `codex exec` | 可把五样走 stdin，并关闭/隔离额外上下文 | 是 | 高：argv、版本、stdin hash、stdout/stderr、退出码都可留证 | 需要另一家 CLI、凭据和额度；Codex 的强读隔离还需外层容器 | **推荐作为异构评审主路径** |
| B. 当前 harness 的原生子代理 | 能获得新上下文，启动摩擦最低 | 否；同一家仍是同源 | 中：平台事件可记，但难形成跨进程退出码 | 依赖平台私有子代理；不能满足 attack lens 的异构要求 | 只用于“不要求异构”的普通复审 |
| C. Anthropic Agent SDK / OpenAI Codex SDK | 可获得类型化事件和更细控制 | 是 | 高 | 新增 SDK/版本/依赖治理；本仓 gate 运行时要求 stdlib-free | 暂不选；CLI 已能满足当前契约 |

“新进程”与“原生子代理”解决的是两件不同的事：前者同时提供**新会话身份、跨厂商和 OS 退出状态**；后者只提供同一 harness 内的新上下文。把 `codex` 写成 `codex-fresh`，或换同一家模型别名，都不能算异构。

## 逐项证据

### 1. 五样输入的共同封装

共同前置步骤：

1. 实现方先运行 `node tools/gate/gate.ts loop pack --feature <slug> --implementer <harness> --reviewer <other-harness>`。
2. 调用器再次解析 `pack.json`，断言对象键集合**恰好**等于 `diff,plan,reqs,evidence,worklog_summary`，五值均为字符串，再计算规范化全文 SHA-256。校验失败不得启动外部评审。
3. 固定评审指令作为控制面参数；`pack.json` 的完整 JSON 文本作为 stdin。不要在 prompt 中引用仓库路径，也不要把实现聊天、handoff、完整 worklog 或当前会话历史附进去。
4. 输出 schema、固定评审指令、CLI 身份/版本属于调用协议，不是第六份项目材料；模型可见的项目语义材料仍只有五样。
5. 每一轮都启一个全新、不可 resume 的进程；保存 pack hash、当前 tree hash、CLI 实际路径与版本、显式模型、argv（秘密打码）、stdout、stderr、退出码和日期。

推荐的共同输出 envelope 为：

```json
{
  "type": "object",
  "properties": {
    "findings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "blocking": { "type": "boolean" },
          "repro": { "type": "string" },
          "impact": { "type": "string" },
          "body": { "type": "string" },
          "fingerprint": { "type": "string" }
        },
        "required": ["title", "blocking", "repro", "impact", "body", "fingerprint"],
        "additionalProperties": false
      }
    }
  },
  "required": ["findings"],
  "additionalProperties": false
}
```

使用 object envelope 而不是根数组，是为了让两家结构化输出共享一份保守 schema。调用器验证 envelope 后，只把 `.findings` 写成现有 `gate loop ingest` 所需的 `Finding[]`；blocking finding 仍由 gate 检查非空攻击探针，不能靠模型自报“通过”。

### 2. Claude Code 配方

Anthropic 把 `claude -p` / `--print` 定义为非交互模式；stdin 可以管道输入，`--output-format json` 配合 `--json-schema` 会把受 schema 约束的结果放在 `structured_output`。官方还说明：成功退出 0，运行失败非 0；stdin 上限 10 MB；`--no-session-persistence` 禁止保存可恢复会话。`--bare` 会跳过 hooks、skills、subagents、plugins、MCP、auto memory 和 `CLAUDE.md`，官方推荐脚本调用使用它，但它不读取订阅 OAuth/系统 keychain，Anthropic 路径须提供 `ANTHROPIC_API_KEY` 或 `apiKeyHelper`。`--tools ""` 可关闭全部内建工具。引用：[Run Claude Code programmatically](https://code.claude.com/docs/en/headless)、[CLI reference](https://code.claude.com/docs/en/cli-reference)（访问 2026-08-28）。

建议把下列 argv 通过 Node `spawn`/`spawnSync` 直接传递，避免 shell 对 JSON schema 和空字符串参数的跨平台转义差异；`<pack.json bytes>` 以 UTF-8 写入 stdin：

```text
<pack.json bytes> |
claude --bare --strict-mcp-config --tools "" --no-session-persistence
       --max-turns 1 --model <review-model>
       --output-format json --json-schema <one-line-schema-json>
       -p "只审查 stdin 中的五字段 JSON；不得索取或使用其他项目上下文；按 schema 返回 findings；只报影响正确性或需求达成的问题。"
```

实现时 `--tools` 后面必须是一个真实的空 argv 元素，而不是省略参数；不配置 `--fallback-model`。可按用户已确认的预算再加 `--max-budget-usd <cap>`，但不能擅自选金额。当前 pack 各字段上限总和小于 1 MB，低于 Claude 官方 10 MB stdin 上限。

Claude 单轮成功必须同时满足：

- CLI 版本不低于 `2.1.205`（官方说明更早版本可能静默忽略非法 schema），所需 flag 全部存在；
- 子进程退出码为 0；
- stdout 是单个合法 JSON 对象，且存在通过本地 schema 再验证的 `structured_output.findings`；
- 没有超时/被 SIGTERM（官方记录 SIGTERM 为 143）、鉴权、billing、rate-limit、overloaded 或预算错误；
- 证据中的 reviewer family 是 `claude-code`，且与实现方 family 不同（需要异构时）。

只看退出 0 不够：缺 `structured_output` 或 schema 本地复验失败仍算调用失败。只看 JSON 也不够：非 0、超时或 stderr 中的启动错误仍算失败。

### 3. Codex CLI 配方

OpenAI 把 `codex exec` 定义为脚本/CI 的非交互入口。提供 prompt 参数同时管道 stdin 时，prompt 是指令，stdin 被作为附加上下文；`--ephemeral` 不保存 rollout。`--json` 把 stdout 变成 JSONL，官方列出的事件包括 `thread.started`、`turn.started`、`turn.completed`、`turn.failed` 和 `error`；`--output-schema` 约束最终响应，`-o/--output-last-message` 另存最终消息。`--ignore-user-config` 不读用户 `config.toml`，`--ignore-rules` 不读 execpolicy `.rules`；`codex exec` 默认 read-only sandbox。引用：[Non-interactive mode](https://developers.openai.com/codex/noninteractive)、[CLI reference](https://developers.openai.com/codex/cli/reference)（访问 2026-08-28）。

在**新建的隔离工作目录**中放控制面 schema，不复制仓库；pack 仍只走 stdin：

```text
<pack.json bytes> |
codex exec --ephemeral --ignore-user-config --ignore-rules
           --sandbox read-only --skip-git-repo-check
           -C <isolated-working-dir> -m <review-model>
           -c 'web_search="disabled"'
           --json --output-schema <absolute-schema-path>
           --output-last-message <absolute-final-output-path>
           "只审查 stdin 的五字段 JSON；不得查找其他项目材料；按 schema 返回 findings；只报影响正确性或需求达成的问题。"
```

Codex 单轮成功必须同时满足：

- 当前 pin 的 CLI 提供上述全部 flag；本地已用 `0.144.1` 的 `codex exec --help` 核对语法；
- 子进程退出码为 0；
- stdout 每一行都能解析为 JSON，且恰有正常终止的 `turn.completed`，没有 `turn.failed` 或 `error`；
- `--output-last-message` 文件存在、是合法 JSON，并通过同一 schema 本地复验；
- reviewer family 是 `openai-codex`，且与实现方 family 不同（需要异构时）。

OpenAI 官方源码在处理到错误后会令 `codex exec` 退出 1，读取/解析 output schema 失败也退出 1；因此“退出 0 + 终止事件 + 最终 schema”三重判据是防御性加强，不是用事件替代进程状态。引用：[openai/codex `exec/src/lib.rs` 固定提交](https://github.com/openai/codex/blob/94311d447587411789533c47601fd8bc9d81eb48/codex-rs/exec/src/lib.rs#L1137-L1144)（访问 2026-08-28）。

### 4. “只交付五样”的强弱边界

- Claude 配方的 `--bare + --strict-mcp-config + --tools ""` 同时去掉仓库自动上下文、MCP 和内建读/命令工具；模型的项目输入可收口为 stdin 五样。
- Codex 没有与 `--tools ""` 等价的官方 CLI flag。`read-only` 保证不写，不等价于跨所有 OS 的“主机其他路径绝对不可读”。`-C` 空隔离目录、`--ignore-user-config`、`--ignore-rules` 和关闭 web search 能避免正常的额外项目上下文，但若要求硬信息流隔离，应在一次性容器/VM 中运行，只挂载 schema，pack 走 stdin；主仓、用户目录和实现聊天不得挂载。OpenAI 官方安全文档也把 Dev Container/外层隔离作为宿主 sandbox 不足时的方案。引用：[Agent approvals & security / sandboxing](https://developers.openai.com/codex/sandbox)（访问 2026-08-28）。
- 所以本地裸进程 Codex 配方可证明“调用器只主动交付五样”，不能单独证明“进程技术上不可能读到主机其他文件”。后一个强声明必须有容器/VM 配置与真实冒烟证据。

### 5. 鉴权、配额与秘密

Claude Code 支持 Claude.ai 订阅、Console API key 及云厂商。主配方用了 `--bare`，因此不得依赖现有订阅登录；必须在**仅该子进程**的环境中提供 `ANTHROPIC_API_KEY`（或受管 `apiKeyHelper`），并从命令、stdout/stderr 和证据中打码。`claude auth status` 的退出 0/1 可作普通模式预检，但不能证明 bare 模式已有 API key。API key 调用可用显式 `<cap>` 限制单次预算；订阅/API 限额或 billing/rate-limit 错误都属于评审未完成。引用：[Authentication](https://code.claude.com/docs/en/authentication)、[Usage and costs](https://code.claude.com/docs/en/costs)（访问 2026-08-28）。

Codex 本地可复用已保存登录，但 OpenAI 对自动化推荐 API key 或 workload identity；单次进程使用 `CODEX_API_KEY`，不要把 `OPENAI_API_KEY`/`CODEX_API_KEY` 设成会被仓库脚本共同继承的 job 级环境变量。`codex login status` 只说明当前鉴权方式；额度仍须由真实调用确认。API key 使用 API 组织的按量计费/速率与 spend limit；ChatGPT 登录使用所属计划的共享 usage/rate limit。凭据缓存 `~/.codex/auth.json` 按密码处理，不能进 pack 或证据。引用：[Codex authentication](https://developers.openai.com/codex/auth)、[Codex non-interactive authentication](https://developers.openai.com/codex/noninteractive)、[Codex pricing](https://developers.openai.com/codex/pricing)（访问 2026-08-28）。

### 6. 不得静默同源的判定表

需要异构时，下面任一情况都必须把本轮记为 **invocation failed / review not obtained** 并停止进入 `ingest`/验收：

- reviewer 可执行文件不存在、版本缺 flag、模型不可用；
- 鉴权缺失/过期、quota/rate limit/billing/budget 失败；
- pack 不是恰好五字段、hash 在调用前后变化、stdin 超限；
- 超时、信号终止、非 0 退出；
- stdout/JSONL 无法解析、缺正常终止事件、出现失败事件；
- 最终输出缺失或 schema 复验失败；
- 声称 reviewer 名不同，但归一化 family 仍与 implementer 相同。

允许对**同一个异构 reviewer**做有限、留痕的传输重试；不允许自动改用实现方原生子代理、同厂商另一个模型、同一进程 continuation/resume，或把文档/fixture 当成真实复审。若业务选择人工降级，必须回到用户处取得明确决定，并仍不能把它记成已完成的异构证据。

## 结论

- **建议方案**：F7 的跨 harness 适配器采用候选 A——共同 pack/schema 协议，Claude 走 `claude -p`，Codex 走 `codex exec`；stdin 只传五样，输出统一为 `{ findings: [...] }`，再由本地适配层提取数组交给 `gate loop ingest`。
- **成功定义**：不是“命令跑完”或“有 JSON”，而是 `exit=0 ∧ 正常终止事件/结果存在 ∧ 本地 schema 复验通过 ∧ pack/tree/身份记录一致`。任一项失败都不产生 passed 证据。
- **异构定义**：用 allowlist 归一化 family（至少 `claude-code` 与 `openai-codex`），不能只比较任意字符串。attack lens 调用失败就停；普通改动才可用同源原生子代理的新上下文。
- **隔离定义**：Claude 可在 CLI 层关闭工具；Codex 若要证明技术上的五样-only，必须再有一次性容器/VM。裸机 `read-only` 不能被描述成硬信息流隔离。
- **备选**：原生子代理保留作非异构路径；SDK 等需要更细事件回调或长期服务时再评估，届时另走依赖 DEC/OSS。

## 剩余不确定性

1. `[未核实]` 两条完整组合命令尚未用真实模型/真实额度冒烟；本次只验证了本地版本和 flag。实现支持声明前，应分别留一份真实 stdout/stderr、退出码、模型/CLI 版本、pack hash 与 tree hash。
2. `[未核实]` Codex 在 Windows native `read-only` 下对 workspace 外路径的精确可读边界没有被本次实测；需要“硬五样-only”时直接以外层容器/VM 为验收对象，不依赖这一点。
3. `[未核实]` 两家对同一复杂 JSON Schema 的模型侧边界错误文本可能随版本变化；本地判据只依赖退出码、事件类型和 schema 复验，不应匹配自然语言错误文案。
4. 模型名称、订阅额度和 API rate/spend limit 会变化；配方应 pin/记录实际值，不能把本 RES 的访问日状态当永久保证。
