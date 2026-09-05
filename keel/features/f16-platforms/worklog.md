# worklog — F16 f16-platforms

## 2026-09-06（GitHub 推送）

- 用户请求「先推送到git hub」，随后「已授权」「网页已经授权」。已核对账号 Kopitau、目标私有仓库 Kopitau/keel，并完成此前获准的 workflow 权限刷新。
- 首次推送提交 6a670b7 到 codex/astra-instructions 成功，设置 origin 同名上游；未改 master、未强推、未移除工作流。
- pre-push 复用代码树 d4ab1e47cfed7a3f290cd998b9a9c5e1a1d43669 的正式证据：F12 状态导航、F16 技能发现/同步、F23 安装更新与 F6 证据有效性回归已通过，完整测试 312 过 / 0 失败。完整门禁退出 0，无失败、两类既有提醒；推送成功与远程 CI 通过分别报告。

## 2026-09-05（CHG-017 / Astra 指令优化）

- 用户目标：需求准确、功能有用、调研当前且成熟的方案、代码简洁、功能验证、方便迭代、说明通俗。范围授权只记录在 APR-009/CHG-017；需求 v9 与规划 v5 是 working，不虚构人工确认或验收。
- 审阅与修改：RES-909 记录 16 类冲突。根 AGENTS 统一持续授权和澄清边界，16 技能按任务规模执行；去掉反复确认、阶段停工、强制 medium、问题配额与突变义务。旧 DESIGN/需求/计划保留；README/CONTEXT/设计 v2/模板对齐。
- F12：status 的 next 改成结构导航，优先尊重已认领工作，不把旧 summary 缺失当作新任务；草稿提醒复用授权。
- F16/F21/F23：普通技能允许自然发现；探测只检查合法 name/description，不强制重复技能名和英文套话；sync 生成镜像，默认不强制降档，无新依赖。
- 测试义务变更（C-34）：更新 chg008-review、chg010-branch-policy/config/handoff/merge、chg011-plan-review/review-round2、chg014-docs/status/review-fixes、chg015-review-three-questions、chg016-audit-round2、dec168-test-kinds、dec170-openai-yaml、p2-rework、w1-skeleton 中锁定已被替换措辞的断言；保留这些文件的现有机器行为回归。文档检查只证明具体文档不变量，不冒充模型行为；REQ-004 收口测试由误标 AC-12 改正为 AC-13。
- 验证过程：初轮 279 过、29 红，主要是旧措辞/旧版本/旧调用分类；定向回归随后 60 过、2 红（测试把 CLI 的绝对 handoff 路径误当相对路径），已修正该测试。新增发现/元数据配置与 CLI 范围导航回归；完整验证与独立审阅结果在后续条目记录。
- 独立审阅：空白上下文 instruction_review 只读当前 diff、需求/规划、证据与日志摘要，检查六种实际任务情境；指出 REQ-026 状态措辞和评审把所有 AC 当黑盒两类残留，已对齐需求/清单/技能/测试。两次增量复核确认无未解决问题；不是旧方案 loop 已通过，也不是模型 live 行为实验。
- F6 验证发现：ISS-080 固定时间戳回归稳定复现索引副本缓存问题，修前退出 1、修后退出 0；仅保留临时索引时间，用户暂存区不变。原有哈希断言未删除或放宽，独立增量审阅无新增问题。
- 本轮功能证据：完整 gate verify 退出 0，312 过 / 0 失败，代码树 d4ab1e47cfed7a3f290cd998b9a9c5e1a1d43669。F12 的 CLI 导航、F16 的发现/分类/sync、F23 的安装更新、F6 的证据/哈希和既有评审/审批功能回归通过；文档检查仅说明一致性，未声明全部历史功能的验收都完成。
- 补充检查：tsc、git diff --check、16 技能元数据/正文/镜像一致性与 README 本地链接均通过；npm pack --dry-run 成功。官方 quick_validate 缺本机 PyYAML，未为此安装依赖，使用已有 Node 元数据/同步测试复核。准备保存独立本地提交后记录干净树的正式证据。
- 本地交付：独立分支 codex/astra-instructions，实施提交 5ad64aad7dae00da095c02b7a1be631680d7c133。提交后正式 verify 退出 0，312 过 / 0 失败 / 0 跳过，dirty=false，代码树仍为 d4ab1e47cfed7a3f290cd998b9a9c5e1a1d43669。
- 完整门禁：check 退出 0，8 项检查无失败、2 类提醒；一类是远程 GitHub Actions 的替身证据，另一类是 APR-002/003 的既有历史变动。没有把旧方案评审记录当成本轮正式全方案评审。未推送 GitHub，未宣称用户验收或真实 Astra 任务效果；下一步是实际功能任务试用，不追加流程设施。

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
- 修正：AC-7 测试原把 retrieved 日期钉死在 2026-08-28，改为任意日期；Cursor 配方按文档补齐 input / output / success（CLI 未安装，标未核实）。

## 2026-09-01（CHG-014 S7：平台已知坑与技能补句）

- 进度：`tools/gate/platform-limits.md` 新增「2026-08 试点已知坑」三条（Codex Desktop：git `Bad file descriptor`、沙箱升权、安全分类器对 attack 敏感、`KEEL_AGENT=codex`；Cursor：技能不自动挂载、终端吞 git stdout、控制台非 UTF-8、`Host: cursor`；Windows：`npx` 起不来、PowerShell 转义、heredoc、`node -e` argv）。技能各补一句：k-migrate（推平也是迁移，见 F22）、k-accept（保留 verify.json 供 `gate approve` 写快照；验收与合并两个 APR 两次动作）、k-impl（0 ISS / 0 经验候选收口前回看 worklog）、k-handoff（status `next:` / `keel:` 两行的含义）、k-review（lockfile 摘要、预算告警、Finding 形状与 `keel/review/raw/`、`recurrence_of` 归并）、k-log（`recurrence_of` 被 clear 机器读取）、k-evidence（APR 快照回读、DEC-188 命令形状）。CONTEXT.md 加 evidence snapshot / host / drift 三条术语；AGENTS.md 加一条确认规则（DEC-185/186/187）。`gate sync` 镜像 + openai.yaml ×16。
- 实现决定：把 `tools/gate/PLATFORM-LIMITS.md` 改名为小写 `platform-limits.md`（两步 `git mv`）。AGENTS.md 与 chg012 的测试一直引用小写路径，Windows/macOS 大小写不敏感所以从未红，Linux CI 会读不到；DEC-145 要求文件名小写连字符。旧计划文件里的大写引用属历史记录不改。
- 证据：`tests/chg014-docs.test.ts`（REQ-016/AC-11、REQ-022/AC-6、镜像与 80 行上限）；7 个技能均 ≤ 62 行；AGENTS.md 62 行；`node --test` **263/263**；`gate check --quick` PASS_WITH_WARN。

## 2026-09-01（CHG-014 补：Codex Desktop 标记钉死）

- 用户在 Codex Desktop 内取得 7 个 `CODEX_*` 变量（`CODEX_SESSION_ID` / `CODEX_THREAD_ID` / `CODEX_SANDBOX_NETWORK_DISABLED=1` / `CODEX_CI=1` / `CODEX_INTERNAL_ORIGINATOR_OVERRIDE=Codex Desktop` / `CODEX_APP_TOOLS_PIPE_PATH` / `CODEX_MCP_NODE_PATH`）。`harness.ts` 注释写明观测清单，会话号取 `CODEX_THREAD_ID`；`tests/chg014-hook-harness.test.ts` 用真实形状断言 `{agent: codex, session: <thread>}`；`platform-limits.md`、ISS-059、RELEASE-0.9.2 第 5 条同步。
