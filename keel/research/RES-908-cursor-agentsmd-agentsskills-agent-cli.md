---
id: RES-908
title: Cursor 兼容：AGENTS.md 与 .agents/skills 发现规则与 agent CLI
depth: standard
date: 2026-08-29
features: [F16]
oss: []
---

# RES-908 Cursor 兼容：AGENTS.md 与 .agents/skills 发现规则与 agent CLI

档位：标准（官方文档一手来源 + 本机实测 + 备选对比；未做真实 Cursor 触发冒烟）。

## 调研问题

用户 2026-08-29 问「能不能让 cursor 也兼容」。keel 的平台契约（REQ-016）是：一份根 `AGENTS.md` + 标准技能目录 `.agents/skills/k-*/SKILL.md`，平台零适配；Claude Code 靠 `CLAUDE.md` 一行桥 + `.claude/skills` 镜像；Codex 靠 `agents/openai.yaml`（DEC-170）。问题：Cursor 读不读根 `AGENTS.md`？读不读 `.agents/skills`？技能元数据格式是否冲突？有没有可做异构复审的 headless CLI？

## 检索范围

Cursor 官方文档三页（rules / skills / CLI 参数），Claude Code skills 文档（对比 `disable-model-invocation` 语义），Codex skills 文档（DEC-170 已引），本机 PATH 探测。访问日期均为 2026-08-29。

## 候选对比

| 方案 | 做法 | 优点 | 缺点 |
|---|---|---|---|
| **A 登记为兼容档（推荐）** | 技能与 AGENTS.md 一字不改；`platforms.compatible` 加 `cursor`；`triggers.ts` 加发现行与 CLI 探测；`headless.md` 加 `agent -p` 配方；REQ-016 措辞与冒烟清单加 Cursor（走 CHG） | 零适配成本，与 Pi 同档；机器可核对的支持声明 | 需要一次 CHG + 点头（REQ-016 是已确认边界）；真实冒烟证据仍待用户机器上的 Cursor 实跑 |
| B 同时给 11 个 User skills 加 `disable-model-invocation: true` | 让 Cursor / Claude Code 与 Codex 的 `allow_implicit_invocation: false` 对齐 | 三家行为一致 | Claude 文档：该字段意为「Only you can invoke the skill」，模型不能自行装载——与 DEC-183 自主回路（agent 自己按 k-impl → k-retro → k-handoff 走）直接冲突；否 |
| C 什么都不做 | Cursor 事实上已能读 AGENTS.md 与 `.agents/skills` | 零成本 | 没有支持声明、没有探测与配方、测试与需求仍写六家；「声称支持」无证据（REQ-016/AC-8） |

## 逐项证据

- Cursor 读根 `AGENTS.md`，并支持子目录嵌套："Place it in your project root as an alternative to `.cursor/rules` for straightforward use cases." / "Cursor supports AGENTS.md in the project root and subdirectories"。未见字节上限说明。引用：https://cursor.com/docs/context/rules（访问 2026-08-29）。
- Cursor 支持 Agent Skills，项目级扫描目录含 `.agents/skills/`（另有 `.cursor/skills/`，以及 `.claude/skills/`、`.codex/skills/` 作 legacy 兼容），用户级 `~/.agents/skills/` 等；"Cursor walks the skills root recursively and picks up any SKILL.md it finds"。前言必填 `name`（小写字母数字连字符）与 `description`；可选 `paths`、`disable-model-invocation`、`icon`、`color`、`metadata`。调用：自动（按 description）或在 Agent 聊天里键入 `/` 搜索。引用：https://cursor.com/docs/context/skills（访问 2026-08-29）。keel 的 16 个 k-* 前言恰为 `name` + `description`，目录名与 name 一致，满足要求；`agents/openai.yaml` 是 Codex 专用附加文件，Cursor 忽略。
- Cursor CLI 二进制名为 `agent`；headless："-p, --print — Print responses to console (for scripts or non-interactive use)"、"--output-format <format> — text, json, or stream-json"、"--mode <mode> — plan or ask"、"--sandbox <mode> — enabled or disabled"、"--trust — Trust the workspace without prompting (headless mode only)"、"--api-key <key> … CURSOR_API_KEY"、"--model <model>"、"--workspace <path>"。未见 stdin 读 prompt 与退出码说明。引用：https://cursor.com/docs/cli/overview 与 https://cursor.com/docs/cli/reference/parameters（访问 2026-08-29）。
- 本机：PATH 上的 `agent` 是 Grok Build 的二进制（`grok 1.0.5`），Cursor CLI 未安装（`~/.cursor` 只有 IDE 数据）。两家 CLI 同名 `agent`，探测与配方必须用绝对路径或 `--version` 输出鉴别，不能只看 PATH。[未核实] Cursor CLI 在 Windows 的安装落点。
- Claude Code 对 `disable-model-invocation` 的定义："Only you can invoke the skill … If you set `disable-model-invocation: true`, Claude can't run the skill automatically"；`user-invocable: false` 则反向（只模型能用）。引用：https://code.claude.com/docs/en/skills（访问 2026-08-29）。这决定了方案 B 与自主回路冲突。
- 异构性：Cursor 是 harness 不是模型提供方；攻击视角复审要求「不同提供方家族」（DEC-159/160），用 Cursor 复审时家族由 `--model` 决定并须记入旁车证据。

## 结论

- 决定（建议）：方案 A。Cursor 已经零适配可用（AGENTS.md + `.agents/skills` 都是原生发现路径）；要把它列为 keel 支持的平台，只需登记与证据：兼容档（与 Pi 同，冒烟即可），配方标明 `agent` 同名冲突与 `--model` 家族。
- 理由：REQ-016 契约本来就是"只依赖根 AGENTS.md 与 .agents/skills"，Cursor 恰好符合；不改技能文件就不会影响其他六家。
- 备选：B 被否（破坏自主回路）；C 可暂用但不能称"支持"。

## 剩余不确定性

- Cursor 桌面端对 `AGENTS.md` 有无静默截断上限（Codex 是 32 KiB）——文档未说明，本仓 AGENTS.md 61 行 / 约 3.5 KB，暂无风险。
- `agent -p --output-format json` 的 JSON 形状与退出码未在文档中给出，配方须首次实跑校准（同 headless.md 其余各家的「命令面已核、真实调用未核」状态）。
- 真实触发冒烟（REQ-016/AC-8）需要在装了 Cursor 的机器上做一次并留证据。
