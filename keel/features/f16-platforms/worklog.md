# worklog — F16 f16-platforms

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
