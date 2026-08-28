---
id: RES-907
title: DeepSeek Harness 与 Pi headless 评审调用配方
depth: standard
date: 2026-08-28
features: [F7, F16]
oss_none: 本次只为仓库已经确认支持的外部 harness 编写调用配方，不新增运行时或开发依赖；若以后把 dsh 或 Pi 固化成 keel 的安装依赖或内置执行器，再单独登记 OSS。
---

# RES-907 DeepSeek Harness 与 Pi headless 评审调用配方

档位：**标准**。采用本仓 `pack.json` 的本地证据、两家官方文档与官方源码，并比较各自至少一种程序化替代入口。未使用社区文章。

## 调研问题

为 DeepSeek Harness（`dsh`）和 Pi 写出可执行的异构评审配方：确认一次性入口、新会话隔离、`pack.json` 五样输入、结构化输出与退出码成功判据，以及 Windows／WSL、鉴权／配额和“不得静默同源”的边界。

## 检索范围

- DeepSeek Harness：官方 npm 已发布标签 `dsh-v0.1.1-rc.2`（commit `b150a551…`）、2026-08-27 的 `dsh-v0.1.2-alpha.1` 发布说明、当前官方安全说明和 DeepSeek API 文档。
- Pi：官方 npm 稳定标签 `v0.84.3`（commit `4e58f324…`）的 CLI、`print-mode.ts`、Windows、security 与 providers 文档。
- 本地只核对 `tools/gate/reviewloop.ts` 的五键 pack／`Finding[]` 契约；Windows 上仅跑官方包的 `--version`／`--help`，未调用模型。
- 访问日期统一为 **2026-08-28**。

## 候选对比

| 候选 | 新上下文 | 输入／输出 | 退出码 | 结论 |
|---|---|---|---|---|
| `dsh --profile headless` | 官方每次创建 fresh persisted Agent | 临时目录中的 `pack.json`；stdout 最终答复 | `completed` 为 0，其余为 1 | **dsh 首选** |
| dsh SDK／ACP stdio | 客户端显式建 session | JSON-RPC／ACP 事件 | 由客户端管理 | 长驻集成备选，单轮过重 |
| `pi -p --no-session` | 独立进程且不保存 session；Pi 官方无内置子代理 | 官方 `@file` 注入 pack；stdout 最终文本 | 文本模式 error／aborted／异常为 1 | **Pi 首选** |
| `pi --mode json`／RPC | 新进程或客户端 session | JSONL／RPC | JSON 模式不能只信 process exit | 深化自动化备选 |

两家都不能把“exit 0”直接解释成“评审 passed”：stdout 还须是合法 `Finding[]`，并绑定本次 `pack_hash`、`tree_hash`、命令、版本、日期和 reviewer harness。

## 输入与回收契约

`gate loop pack` 只允许五个字符串键：`diff`（实现差异）、`plan`（功能规划和测试义务）、`reqs`（需求条目）、`evidence`（验证证据 JSON）、`worklog_summary`（工作日志摘要）。不得加入实现聊天、handoff 或其他仓库材料。最强隔离是把这一文件复制到一次性目录／只读容器，原仓库不挂给 reviewer。

stdout 只输出一个 JSON 数组，不加 Markdown 围栏：

```json
[
  {
    "title": "简短标题",
    "blocking": true,
    "repro": "问题存在时在未修复树退出 0 的命令",
    "impact": "对正确性或需求达成的影响",
    "body": "原因、影响和定位",
    "fingerprint": "可选稳定指纹"
  }
]
```

无 finding 输出 `[]`。`blocking: true` 必须有非空可运行 `repro`。harness／版本、完整命令、pack 与 stdout hash、stderr、退出码、日期和 tree hash 放在调用证据旁车，不能包在数组外层，因为 `gate loop ingest` 直接读取 `Finding[]`。

## 逐项证据

### DeepSeek Harness

1. `dsh --profile headless "job"` 是官方一次性入口：以调用目录为 workspace，新建 fresh persisted session，打印最终答复后退出。[官方 CLI README（rc.2）](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.1-rc.2/apps/cli/README.md)，访问日期 2026-08-28。
2. 官方精确定义：最后 `turn/end` 原因为 `completed` 才 exit 0，否则 exit 1；无 task 是 usage error。rc.2 将最终文本写 stdout，不开端口。[官方 CLI behavior reference（rc.2）](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.1.1-rc.2/apps/cli/reference/README.md)，访问日期 2026-08-28。
3. 2026-08-27 alpha 已改成 progress/reasoning 写 stderr、stdout 仍只留最终结果，所以 stderr 必须单独保存，不能一概视为失败。[官方 0.1.2-alpha.1 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1)，访问日期 2026-08-28。
4. base profile 默认 `workspace-write`，可用 `DSH_PERMISSION_MODE=read-only`；但官方说明读取和网络不受该文件写沙箱限制。项目又明确未安全审计，sandbox／approval 不保证隔离，应优先一次性容器／VM。[官方 Safety](https://github.com/deepseek-ai/deepseek-harness/blob/cd5ef8148158c3a752a658978873241fdf8e2bbc/SAFETY.md)，访问日期 2026-08-28。
5. 凭据按继承环境、`$DSH_HOME/.credentials.yaml`、cwd `.env`、`$DSH_HOME/.env` 解析。配方使用 fresh `DSH_HOME` 和显式 `DEEPSEEK_API_KEY`，避免旧账号／override 偷换来源。DeepSeek API 当前按 token 扣余额；`deepseek-v4-pro` 账户并发上限 500，超出为 HTTP 429，10 分钟未开始推理会断开。[官方 API 首次调用](https://api-docs.deepseek.com/)、[计价](https://api-docs.deepseek.com/quick_start/pricing)、[并发限制](https://api-docs.deepseek.com/quick_start/rate_limit)，访问日期均为 2026-08-28。
6. Windows 状态已经变化：官方 alpha 加入 Python SDK runtime Windows x64，仍无 Windows arm64；这推翻“Python SDK 永远不支持 Windows”，但不等于 npm rc.2 已有完整 Windows live 证据。[官方 Python runtime reference](https://github.com/deepseek-ai/deepseek-harness/blob/cd5ef8148158c3a752a658978873241fdf8e2bbc/python/sdk-runtime/README.md)，访问日期 2026-08-28。
7. 本机原生 Windows 冒烟：官方 `@deepseek-ai/dsh@0.1.1-rc.2` 的 `--version` 与 `--profile headless --help` 均 exit 0；未提供 key、未跑 live 模型，因此完整原生 Windows headless 标为 `[未核实]`。[官方 npm 包](https://www.npmjs.com/package/@deepseek-ai/dsh/v/0.1.1-rc.2)，访问日期 2026-08-28。

### Pi

1. Pi v0.84.3 官方提供 `-p/--print`、`--mode json`、RPC、`--no-session`、`@file`、`--no-tools` 与各类 `--no-*` 开关，并明确写 **No sub-agents**。因此无原生子代理时应另起 `pi -p --no-session` 进程，不能发明平台私有 API。[官方 CLI README](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/README.md)，访问日期 2026-08-28。
2. 官方源码表明：文本模式最后 assistant 为 `error`／`aborted` 时 stderr 报错并返回 1，异常也返回 1；但这段终态检查只在 text mode 执行，JSON mode 的 exit 0 不能单独当成功，必须解析最后权威事件。[官方 print-mode source](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/src/modes/print-mode.ts)、[JSON event 文档](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/docs/json.md)，访问日期 2026-08-28。
3. 非交互模式不弹 project-trust；`--no-approve`、关闭 context／extensions／skills／templates／themes、fresh `PI_CODING_AGENT_DIR` 能排除旧项目资源。Pi 没有内置 sandbox，project trust 也不是隔离；不可信／无人值守输入仍要容器或 VM。[官方 Security](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/docs/security.md)，访问日期 2026-08-28。
4. Pi 支持 provider API key 环境变量和 `/login` 后保存的 OAuth／API key，且 `auth.json` 优先于环境变量。fresh config + 显式 `--provider`／`--model` 可避免旧凭据与模型悄悄接管。Pi 没有统一配额，费用和 rate limit 属于所选 provider。[官方 Providers](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/docs/providers.md)，访问日期 2026-08-28。
5. 官方原生 Windows 文档说明默认找 Git Bash，也可用 PowerShell tool；本配方 `--no-tools`，所以单轮评审不依赖 Bash。以后若开放攻击命令，则安装 Git for Windows／显式启用 PowerShell，或转 WSL。[官方 Windows setup](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/docs/windows.md)，访问日期 2026-08-28。
6. v0.84.3 要求 Node `>=22.19.0`。本机 Windows 上 `npm exec --package=… -- pi --version/help` exit 0；直接 `npx` 未正确解析 scoped package 的 `pi` bin，因此配方采用 `npm exec --package … -- pi`。[官方 package manifest](https://github.com/earendil-works/pi/blob/v0.84.3/packages/coding-agent/package.json)、[官方 npm 包](https://www.npmjs.com/package/@earendil-works/pi-coding-agent/v/0.84.3)，访问日期 2026-08-28。

## 可执行配方

前置：运行 `node tools/gate/gate.ts loop pack --feature <feature> --implementer <impl> --reviewer <reviewer>`，记录输出的 `pack_hash` 和当前 tree hash。以下只展示关键调用；`pack.json` 先复制到只含该文件的一次性 `$inputDir`，stdout／stderr 写到另一个 `$outputDir`。

### dsh（PowerShell）

```powershell
$env:DSH_HOME = Join-Path $reviewRoot "dsh-home"  # fresh home
$env:DSH_PERMISSION_MODE = "read-only"
$env:DSH_TELEMETRY_DISABLED = "1"
# $env:DEEPSEEK_API_KEY 由调用环境显式提供，绝不写进 pack／日志。
$prompt = '只读 ./pack.json 的 diff、plan、reqs、evidence、worklog_summary。不要读取其他材料、修改文件或运行命令。stdout 只输出 Finding[] 原始 JSON；每项必须有 impact，blocking 项必须有问题存在时退出 0 的 repro。'
Push-Location $inputDir
npx --yes @deepseek-ai/dsh@0.1.1-rc.2 --profile headless $prompt `
  1> (Join-Path $outputDir "findings.json") 2> (Join-Path $outputDir "stderr.log")
$reviewExit = $LASTEXITCODE
Pop-Location
```

### Pi（PowerShell）

```powershell
$env:PI_CODING_AGENT_DIR = Join-Path $reviewRoot "pi-home"  # fresh config
$env:PI_SKIP_VERSION_CHECK = "1"
$env:PI_TELEMETRY = "0"
# 示例固定 DeepSeek provider；$env:DEEPSEEK_API_KEY 由环境显式提供。
$prompt = '只评审所附 pack.json 的五项。stdout 只输出 Finding[] 原始 JSON；每项必须有 impact，blocking 项必须有问题存在时退出 0 的 repro。'
Push-Location $inputDir
npm exec --yes --package=@earendil-works/pi-coding-agent@0.84.3 -- pi `
  -p --no-session --no-tools --no-extensions --no-skills `
  --no-prompt-templates --no-themes --no-context-files --no-approve `
  --provider deepseek --model deepseek-v4-pro -- "@pack.json" $prompt `
  1> (Join-Path $outputDir "findings.json") 2> (Join-Path $outputDir "stderr.log")
$reviewExit = $LASTEXITCODE
Pop-Location
```

WSL／POSIX 只需把环境变量改成 `export`、临时目录用 `mktemp -d`，然后执行同一核心命令。WSL 是独立 Linux 用户空间，不要假定 Windows 侧全局 npm 包、home 或凭据自动可见；最好把临时输入放在 WSL 文件系统。dsh 原生 Windows full live 未验证或 sandbox backend 失败时可显式切到 WSL，但 reviewer 身份仍记录为 `deepseek-harness`，不能改成实现方 harness。

## 结论

- **决定**：dsh 固定 `@deepseek-ai/dsh@0.1.1-rc.2 --profile headless`；Pi 固定 `@earendil-works/pi-coding-agent@0.84.3 -p --no-session`。两者都从一次性目录消费相同五键 pack，stdout 回收 `Finding[]`，stderr 独立存证。
- **理由**：两条都是官方一次性入口。dsh 直接保证 fresh session；Pi 无内置子代理，但独立、无 session 持久化的新进程满足“不继承实现聊天”。固定版本、provider、model 和 fresh home 能把鉴权／配额失败显式暴露。
- **成功判据**：reviewer 与 implementer 不同；exit 0；stdout 非空且通过数组／字段／blocking repro 校验；pack/tree 未变；调用旁车证据完整。缺任一项都不是 passed。
- **备选**：需要长驻或完整事件时使用 dsh SDK／ACP、Pi RPC／JSON；Pi JSON 必须新增终态解析，不能只看 process exit。
- **不得静默同源**：CLI 缺失、启动失败、无凭据、余额／429、超时、输出截断或 schema 错误时，记录该 harness 失败并停止。只能显式安排另一家仍与 implementer 不同的 harness 作为新调用，不能让实现方原会话补写报告。

## 剩余不确定性

- `[未核实]` 本次无 provider 授权预算，没有执行真实模型评审；两条 live 配方仍需逐家人工证据包。
- `[未核实]` dsh alpha 已支持 Windows x64 Python runtime，但 npm `latest` 仍是 rc.2；原生 Windows 完整 headless 工具／沙箱链不能凭 help 冒烟解除 proxy，也不能继续笼统写“Windows 永不支持”。
- dsh 是 developer preview，stderr 与 profile 已在相邻预发布版本变化；升级必须重核 stdout／stderr／退出码，不用无版本 `@latest`。
- Pi `-p` 不单独暴露 `length` 终态；严格自动化以后应采用 JSON/RPC 并显式拒绝 `error`、`aborted`、`length`。
- DeepSeek 价格、并发和模型名只是 2026-08-28 快照；执行日须复查。Pi 换 provider 时也须记录那家的独立鉴权与配额证据。
