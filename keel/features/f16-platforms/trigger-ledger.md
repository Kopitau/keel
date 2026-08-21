# 技能触发探测账本（W5）

现场跑 `node tools/gate/gate.ts triggers --write` 更新。未安装的 CLI 标 **[未实测]**。
不把 PATH 探测当成付费对话里的技能实点（C-09）。Grok Build 用 `grok inspect --json` 做发现层校准（不调模型）。

| harness | 档 | CLI | 本机 | 版本 |
|---|---|---|---|---|
| claude-code | primary | `claude` | C:\Users\NF3317\AppData\Roaming\npm\claude | 2.1.238 (Claude Code) |
| codex | primary | `codex` | C:\Users\NF3317\AppData\Roaming\npm\codex | codex-cli 0.144.1 |
| opencode | primary | `opencode` | C:\Users\NF3317\AppData\Roaming\npm\opencode | 1.18.18 |
| grok-build | primary | `grok` | C:\Users\NF3317\.grok\bin\grok.exe | grok 1.0.5 (5115b46bc9) |
| deepseek-harness | primary | `dsh` | **[未实测]** | — |
| pi | compatible | `pi` | **[未实测]** | — |

## 技能 description 机检

16 个技能 description 均含 `Use when`、自身 `k-*` 名、以及否定 `Do not`。

## 发现路径（结构，R2）

| harness | 指令文件 | 技能目录 |
|---|---|---|
| claude-code | CLAUDE.md | `.claude/skills` |
| codex | AGENTS.md | `.agents/skills` |
| opencode | AGENTS.md | `.agents/skills` |
| grok-build | AGENTS.md | `.agents/skills` |
| deepseek-harness | AGENTS.md | `.agents/skills` |
| pi | AGENTS.md | `.agents/skills` |

Claude Code 是唯一需要 `CLAUDE.md` + `.claude/skills` 镜像的主力（C-94）。其余读 `AGENTS.md` + `.agents/skills`。

## Grok Build inspect（发现层，非付费对话）

`grok inspect --json` 载入 k-*：**16/16**（k-init, k-migrate, k-new, k-impl, k-bugfix, k-change, k-review, k-accept, k-retro, k-handoff, k-status, k-grill, k-research, k-decide, k-evidence, k-log）。
措辞校准：当前 `Use when` + `k-*` + `Do not` 被 Grok 原样载入，W5 不改 description。

## Pi 冒烟

CLI **[未实测]**。结构冒烟：Pi 原生读 `AGENTS.md` + `.agents/skills`（R2）；本仓 16 个技能仅为标准 `name`/`description`，无平台私有字段（C-95）。live 待安装 `pi`（`@earendil-works/pi-coding-agent`）。

## 措辞校准（工作约定）

- 平台中性：技能正文不写某家私有 slash（C-95）。
- 用户入口技能名可当 slash：`/k-init` 等，由各家按目录名加载。
- 四家已装 CLI 的版本见上表。dsh 未装；付费对话实点不做假账。
- 实点各家模型触发后，把失败短语补进该技能 description，再跑本命令重写本账本。
