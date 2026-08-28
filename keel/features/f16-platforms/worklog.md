# worklog — F16 f16-platforms

## 2026-08-28（P2 / headless 配方结构）

- 进度：`keel/review/headless.md` 覆盖 config 中五个 primary 与 Pi compatible；逐家绑定官方来源、命令、输入、输出、成功判据和 fail-closed 规则。
- 边界：本轮没有真实模型调用，不把版本/help、auth probe 或文档当 live 触发证据；REQ-016/AC-8 的六家人工证据仍留在 P4/P6。
- 证据：`tests/chg010-headless.test.ts` 3/3，技能镜像相关 P2 组 110/110，本地全量 237/237。
- C-34: ref=DEC-178 shared headless machine-doc tests with F7 (grow baseline)

## 2026-08-21

- 进度：W1 开工。切片：AGENTS.md + CLAUDE.md 桥 + 技能目录占位
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W4）

- 进度：16 个 k-* SKILL.md。仅 name/description。`gate sync` 复制镜像。X-skills 进 check --quick。
- 实现决定：技能正文用英文步骤 + 指向 DESIGN/gate，不复制规范全文（C-69/C-95）。触发词一律 `Use when` 前置。五平台措辞校准留 W5。

## 2026-08-21（W5）

- 进度：`gate triggers` 本机探测到 claude 2.1.238 / codex 0.144.1 / opencode 1.18.18 / grok 1.0.5；dsh 与 pi **[未实测]**。`grok inspect --json` 从 `.agents/skills` 载入 16/16 k-*（发现层，不调模型）。未做付费对话实点（C-09）。账本 `trigger-ledger.md`。
- 实现决定：触发机检=Use when + k-* 名 + Do not；Windows 上 npm 的 `.cmd` 用 shell 拉 `--version`。Grok 当前措辞无需改。Pi 做结构冒烟（AGENTS.md + 标准技能），不装 CLI。

## 2026-08-27（DEC-170）

- 进度：`gate sync` 为 16 个 k-* 生成 `agents/openai.yaml`（User 技能 `allow_implicit_invocation: false`，Model 技能 true），X-skills 校验缺失/stale。来源 RES-904 §7（wayfinder 的同名文件 + OpenAI Codex skills 文档 + mattpocock/skills #516）。
- 未实测：本机无 Codex；W5 触发台账里 Codex 仍是"发现层已验、对话未实点"——下次实点时验证 `$k-accept` 显式可调、隐式不出现。

## 2026-08-28（P4 / 六 harness 本地契约）

- 进度：六家 headless 配方增加人类可读的 harness 全名，config primary/compatible 与配方由 machine-doc 测试逐一对账。
- 边界：本轮没有付费模型调用；`REQ-016/AC-8` 明确保留 `[proxy:real six-harness trigger evidence not recorded]`，本地配方和命令面不能替代 live 触发证据。
- 证据：`tests/chg010-gates.test.ts` 对应代理测试通过；RES-905/906/907 分别保留鉴权、配额、终态与隔离的未核实边界。
