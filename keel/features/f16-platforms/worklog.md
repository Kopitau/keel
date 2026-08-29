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

## 2026-08-29（CHG-011 Q4 技能减量）

- 进度：16 个技能全部保留，正文最长 60 行（≤ 80）；删掉对已删门禁与记录的引用（G-research / G-retro / X-oss / X-decisions / C-34 基线 / LES / KLES / OSS 文件 / journal / GAPHUNT 模板）。k-review 重写为方案级回路；k-impl 改自主回路（切完就继续，功能完成压缩 worklog）；k-retro 触发改为功能完成；k-handoff ≤ 10 行；k-log / k-research 的开源登记改为 RES `oss:` 字段；k-migrate 把三张映射表与报告结构并入正文；k-grill 缺口猎取写进需求书、REQ 行补 feature / must 字段（上一轮评审 advisory 闭环）；k-decide / k-evidence 去掉门禁措辞。`gate sync` 后 openai.yaml ×16 重新生成。
- 进度：AGENTS.md（61 行）补自主回路与「冻结只管语义」两条规则、quick/全量说明、`loop` 命令、执法档改按 config；CONTEXT.md 加 quick check / body hash / disposition / autonomous loop 词条，OSS / LES 词条改写。
- 证据：`node --test` 全绿（见提交）；`grep` 全库技能/模板/根文件无已删门禁名。

## 2026-08-29（CHG-012：Cursor 客户端登记为兼容档）

- 用户原话：「能不能让cursor也兼容」→ 三案后「A 不是cursor cli是cursor客户端」。调研 RES-908：Cursor 客户端原生读根 AGENTS.md 与 `.agents/skills`（`name` + `description` 即可），技能零改动；方案 B（给 User skills 加 `disable-model-invocation`）被否——Claude 文档明说该字段是「Only you can invoke」，会打断自主回路。
- 进度：`platforms.compatible` 加 `cursor`（本仓 / 模板 / init）；`triggers.ts` 探测（`cursor --version` → 本机 3.17.21）与发现表；`platform-limits.md` 一行；`headless.md` 的 `## cursor`（客户端为准，CLI `agent` 与 Grok 同名、未纳入）；计划 v3（规划补充）；CHG-012 + 需求 v6（proposed）+ APR-006 草稿（待用户委托原话）；0.9.1 + `RELEASE-0.9.1.md`。黑盒 `tests/chg012-cursor.test.ts`（REQ-016/AC-1）；`w5-smoke` / `chg010-gates` 平台计数 6 → 7。
- 待人工：REQ-016/AC-8 的 Cursor 客户端真实触发冒烟（在装有 Cursor 的机器上打开本仓，`/k-status` 能出现即可，记本节）。
