# 交接 — RES-904（wayfinder 借鉴）七条已落地：DEC-169/170 实现，171/172 deferred

- date: 2026-08-27
- 本段：用户「先不迁移 需要你调研 mattpocock 的 wayfinder」→ RES-904 → 「借鉴清单需要更详细说明」→ 详述入 RES → 「按你说的全做」→ 4/5/6 改技能与模板、1/7 立 DEC 并实现、2/3 立 deferred DEC

## 状态

| | |
|---|---|
| 需求 | 28 条（gap-hunt-v3 的 6 条严重发现仍**待处置**；DEC-169/170 的 status/G-plan/X-skills 行为在 v3 里没有 AC，v4 时补） |
| 决策 | 172 条（169/170 confirmed，171/172 **deferred** 记触发条件） |
| 调研 | RES-904（标准档，22 条引用） |
| 问题条目 | 45 条（open：仅 ISS-036） |
| 测试 | **213 全绿**（dec169 8 条、dec170 5 条为本轮新增） |
| 门禁 | `check --quick` → `PASS_WITH_WARN`（唯一 WARN = X-trace 的 REQ-017/AC-3 `[proxy]`） |
| status 新行 | `frontier: F1 … F24`（本仓只有 f17 有 summary，其余全在前沿——如实）、`blocked:`、`proxy_acs: 1` |

## 本轮做了什么 / 为什么（RES-904 七条）

| # | 内容 | 落点 |
|---|---|---|
| 4 | k-research：并行研究（互不依赖的问题各起空白子代理，只回 RES 编号）；一手源优先 | 技能文字 |
| 5 | k-impl：切片纪律（单上下文装得下、可独立演示、纵向贯穿；**一个会话一个切片**，切完 handoff 停） | 技能文字 + 模板"内部步骤"带 `verify:` |
| 6 | 测试义务加"缝"表（REQ/AC → 黑盒测试挂在哪 → 真验收 / proxy 至 Fnn） | 模板 + k-impl 文字 + CONTEXT 术语 |
| 1 | **DEC-169** 前沿：计划前言 `blocked_by:`；`gate status` 打印 `frontier` / `blocked` / `proxy_acs`；G-plan 校验编号/自指/环；`worktree add` 被阻塞 WARN 不拒 | `tools/gate/frontier.ts` + status/check/worktree |
| 7 | **DEC-170** Codex 元数据：`gate sync` 为每个 k-* 生成 `agents/openai.yaml`（User 技能禁隐式调用）；X-skills 校验缺失/stale | `skills.ts` / `sync.ts` + 32 份 yaml（源 + 镜像） |
| 2 | **DEC-171** deferred：fog 判据 + 按 epic 分批基线。触发 = zhaoxi 下一次 k-new / k-change 出 v2，或任一项目 `未决问题` > 20 条 | 记形状与触发 |
| 3 | **DEC-172** deferred：RES `kind: spike`。触发 = zhaoxi F6 壳 spike，或再出现 `research_exemption: 本机实测即证据` | 记形状与触发 |

## full check 当前项

- `G-done` / `G-merge` / `X-evidence`：dirty working tree（提交后重跑 `verify` 即清）
- `G-retro`：ISS-036 open
- `X-trace` WARN：REQ-017/AC-3 proxy（回 k-grill 改写 AC，或接受常驻 WARN）

## 下一步候选（按价值排序）

1. **zhaoxi 迁移**（用户已说"先不迁移"，待指示）：F0 plan 补 `req: [...]` 与 `blocked_by: []`；F1–F8 plan 按 overview 顺序填 `blocked_by`；六条代理测试加 `[proxy:…]` 或改名；`gate sync` 生成 openai.yaml；3 份 RES 补 oss 表态；APR-001/002 补 `delegated:`。
2. Codex 实测（F16 W5 台账）：`$k-accept` 显式可调、隐式不出现——DEC-170 唯一未核实项。
3. REQ-017/AC-3 回 k-grill 改写成可本地验收的 AC。
4. v4 需求书时为 REQ-019 补前沿 AC、为 REQ-016 补 openai.yaml AC；gap-hunt-v3 的 6 条严重发现处置（需用户逐条拍板）。
5. push 远端让 CI 首跑；ISS-036 闭环；KLES-002 措辞扩为"git 导出给 hook 的全部变量"（用户库文件）。

## 未决问题

- 前沿要不要下沉到功能内部切片（DEC-169 复审条款）。
- `[proxy]` 是否也该在 G-done 阻塞（现版：计入覆盖，只在 X-trace 亮 WARN；`proxy_acs` 已可读）。
- 白盒名挂 AC 何时从 WARN 升 FAIL（DEC-168）。
- `gate.ts` 的 root 取自脚本所在仓库而非 cwd（ISS-044 复现时误建 `f25-demo`，已删）：设计还是缺陷，待定。

## 该读文件

- `keel/research/RES-904-*.md` —— wayfinder 调研 + 七条借鉴详述（本轮所有决策的依据）
- `keel/decisions/DEC-169-*.md`、`DEC-170-*.md`（confirmed）；`DEC-171-*.md`、`DEC-172-*.md`（deferred，含触发条件）
- `keel/features/f17-gate/worklog.md` 2026-08-27 段 —— 红灯、突变、证据
- `keel/templates/feature-plan.md` —— 新的计划模板（blocked_by / 缝表 / 切片 verify）
- `.agents/skills/k-impl/SKILL.md`、`k-research/SKILL.md` —— 新增节
- `tests/dec169-frontier.test.ts`、`tests/dec170-openai-yaml.test.ts`
