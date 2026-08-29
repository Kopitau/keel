# 统一实施规划总览 v4

- date: 2026-08-29
- status: 工作规划（CHG-011 与 APR-004 已批准；requirements v5 与本文件待 APR-005 整体点头）
- replaces: overview-v3.md
- change: CHG-011
- requirements: v5.md
- why: 把 CHG-011「keel 减重」拆成可独立验证的实施切片：门禁 22 → 8、预提交只跑秒级检查、输出人话、模板与技能减量、记录三合一、评审改方案级、决策与问题复核、消费项目升级。

确认即冻结（语义）。前言元数据、错字、索引原地改不走 CHG（C-24/C-63/C-106 修订）。功能计划（F1–F24 各自最新版）不因本版重写；本版只改总览级的评审时机、测试义务措辞与实施切片；受影响功能计划的「新版 + 测试义务更新」（C-65）由下文「切片 → 测试义务」表承担（REQ-011/AC-3 本版解读）。

## 功能清单

| F | 目录 | owner REQ | 本轮切片 |
|---|---|---|---|
| F1 | f01-requirements-interview | REQ-001 | k-grill 文字减量（缺口猎取写进需求书，不机检） |
| F2 | f02-research | REQ-002 | G-research / legacy 清单删除；`oss:` 字段登记；k-research 文字减量 |
| F3 | f03-decisions | REQ-003 | X-decisions 删除；DEC 只写难逆转决策 |
| F4 | f04-unified-plan | REQ-004 | 自主实施回路写进 k-impl；`blocked_by` / 前沿保留 |
| F5 | f05-overhead | REQ-005 | 门禁 ≤ 8；status / check 人话输出 |
| F6 | f06-evidence | REQ-006 | 测试名基线删除；证据只在完成/合并时判；黑盒按功能 |
| F7 | f07-review | REQ-007/027/028 | 评审改方案级：findings.md + disposition.md；G-done 读处置表 |
| F8 | f08-merge | REQ-008 | G-merge 保留；本地档只打印一行文档级保护提示，不查 CODEOWNERS（X-owners 不复活） |
| F9 | f09-retro | REQ-009 | summary 一次 + worklog 压缩；G-retro 删除 |
| F10 | f10-issues | REQ-010 | G-issues 删除；ISS 字段由技能约束 |
| F11 | f11-change | REQ-011 | 冻结只管语义 |
| F12 | f12-handoff | REQ-012 | handoff ≤ 10 行；k-handoff 文字减量 |
| F13 | f13-lessons | REQ-013 | LES/KLES 文件与候选读取端删除 |
| F14 | f14-knowledge | REQ-014 | X-knowledge 删除 |
| F15 | f15-oss | REQ-015 | X-oss 删除；OSS 模板删除 |
| F16 | f16-platforms | REQ-016 | X-skills 删除；16 技能正文 ≤ 80 行；openai.yaml 仍由 sync 生成 |
| F17 | f17-gate | REQ-017/026 | 8 条检查；钩子只跑 quick + 审批守卫；X-types/X-hooks/X-full/X-budget/X-casefold/X-ids 删除 |
| F18 | f18-approvals | REQ-018 | X-apr 保留并拒绝 pending 哈希；X-owners 删除 |
| F19 | f19-parallel | REQ-019 | 不变 |
| F20 | f20-context-budget | REQ-020 | 预算不机检 |
| F21 | f21-config | REQ-021 | config 去掉已删检查的开关 |
| F22 | f22-migrate | REQ-022 | migrate 模板并入 k-migrate 正文 |
| F23 | f23-bootstrap | REQ-023/025 | update 清单去掉 legacy 条目；zhaoxi 升级 |
| F24 | f24-cross-platform | REQ-024 | X-casefold 删除，其余不变 |

## 接口与耦合（联动测试义务来源，C-38）

| ID | 从 → 到 | 契约 | 文件重叠 / 串行点 |
|---|---|---|---|
| I-01 | F1 → F4/F6/F11 | REQ 编号、GWT、verification 数组（只作说明） | `keel/requirements/` 只经 CHG 写语义 |
| I-02 | F2 → F3 | 重大 DEC 必须有 RES 或书面豁免（技能规则） | research 与 decisions 分文件 |
| I-03 | F2 → F15 | 调研选用开源在 RES `oss:` 字段登记 | 不再有 `keel/oss/` 新文件 |
| I-04 | F3 → F4 | confirmed DEC 约束规划 | 规划引用 DEC，不复制正文 |
| I-05 | F4 → F6/F19 | 耦合表、预计触碰范围、`req:`/`blocked_by:` | plan 文件由 F4 规划切片单写 |
| I-06 | F6 → F7/F8 | verify.json、tree hash | `evidence.ts` 与 `verify.ts` 串行 |
| I-07 | F7 → F8/F18 | 方案级评审 passed + 用户 APR；验收不等于合并 | approvals 由 F18 守身份 |
| I-08 | F9 → F8/F12 | 功能完成（测试通过 + 证据落盘）触发复盘：summary 一次、worklog 压缩；合并后只更新 OVERVIEW 在途状态 | `OVERVIEW.md` 由完成方写 |
| I-09 | F10 → F13 | 同指纹 ≥3 次记 worklog 候选 | ISS/worklog 追加式 |
| I-10 | F13 → F14 | 经验可提升到用户库，进入项目须再确认 | 用户库不入本仓 |
| I-11 | F16 → F17 | 平台桥和 hooks 只转调同一 gate | 技能/桥与 gate 逻辑分离 |
| I-12 | F17 → 全部 | Node+TS gate 是唯一裁决入口，8 条检查 | `tools/gate/` 单一实现 |
| I-13 | F22 → F1–F12 | 迁移产物只是未确认初稿 | 旧框架源只读 |
| I-14 | F23 → F22 | 自举按迁移规则保留编号 | release/installer 与迁移报告串行 |
| I-15 | F21 → F17/F6/F16 | config 画像、身份、平台清单 | `keel/config.json` 单写 |
| I-16 | F24 → F17/F6/F18 | `sha256Normalized` 与 Node≥22.18.0 | hash/launcher 修改先跑契约测试 |
| I-17 | F17 → F21 | `profiles.keel-gate` 是 gate 自身测试命令 | config 与 allowlist 同步 |
| I-18 | F24 → F16 | 技能镜像三平台统一复制 | `.agents` 为源，`.claude` 为生成物 |
| I-19 | F11 → F4/F6 | CHG 批准后出计划新版、更新测试义务、旧 evidence 作废 | requirements/plan/evidence 串行 |
| I-21 | F23 → F16/F21 | update 安装 `agents/openai.yaml` 并更新项目版本 | installer/config/sync 串行 |
| I-22 | F7/F10 → F6 | ingest 先验攻击探针；clear 追加拒绝证据到处置表 | `reviewloop.ts` 由一个切片修改 |
| I-23 | F11/F18 → F17 | confirmed REQ 来源 CHG 必须 approved 且可追到 approved APR | G-req + APR hash 联动测试 |
| I-24 | F17 → F24 | AC-3 本地 workflow 契约；AC-4 真实六格 run 证据 | 本地测试不得冒充真实运行 |
| I-25 | F4/F19 → F12 | `gate status` 输出人话三行 + frontier/blocked/proxy | plan metadata 是唯一依赖源 |
| I-26 | F4/F9 → F12 | 功能完成时 worklog 压缩进 summary；下一功能只读压缩记录 | summary 由完成方写一次 |

（I-20 legacy 清单契约随 G-research 删除而作废。）

## 评审时机与测试义务（本版改动）

- 评审：统一规划内全部功能都有 summary 后一轮空白上下文评审（门禁/证据/审批类改动强制异构 headless）；发现清单 `keel/review/findings.md`，处置表 `keel/review/disposition.md`（plan 版本、轮次、状态）；三轮未清熔断。功能级只有自测 + 证据。
- 测试：每个实现了的功能有验证该功能行为的黑盒测试（名带 `REQ-nnn/AC-i`；对话中定下的小功能用功能名，不入 X-trace，由方案级评审核对）；接口契约测试名带 `I-nn`；修复类回归测试先红后绿并突变验证；不再有为门禁而写的测试。
- 自主回路：实现 → 测试 → 记录 → 压缩 worklog 进 summary → 前沿下一个功能，不停；只在 C-21、断点、评审熔断、验收时等用户。

## CHG-011 实施切片与顺序

每一项都是一个可独立验证的切片；一个切片做完自动进下一个（DEC-183），只在触碰确认边界时问用户。

1. **Q1 门禁裁剪（F17，触碰 `tools/gate/check.ts`、`review.ts`、14 个模块、约 200 条自测）**：保留 8 条，删除 14 条与其模块、测试、`test-baseline.json`、`migrations/`；X-evidence 只在完成/合并时判；X-apr 拒绝 pending 哈希。verify: `node --test` + `gate check --quick` 全 PASS 时仅总结一行。
2. **Q2 钩子、输出与审批哈希（F17/F5/F12/F18）**：pre-commit = quick + 审批守卫；`gate status` 人话三行；`gate check` 只打印非 PASS + 总结；审批哈希只算正文、正文不符 WARN 可放行（REQ-011/AC-4、REQ-018/AC-1）。verify: 黑盒测试 + 一次真实提交耗时。
3. **Q3 评审改方案级（F7/F10/F6，触碰 `reviewloop.ts`、`evidence.ts`）**：findings.md + disposition.md；G-done 读处置表；ISS ingest/clear 协议保留；ISS-036 闭环。verify: 正反向黑盒。
4. **Q4 记录、模板与技能减量（F1/F2/F9/F12/F13/F15/F16/F22）**：模板 18 → 8；journal/LES/KLES/OSS 目录不再新建；16 个技能正文 ≤ 80 行并删除已删门禁的引用；k-impl 写自主回路（切完就继续）；CONTEXT.md / AGENTS.md 同步。verify: `gate sync` + 一次性核对命令数技能与 AGENTS 行数（不进 `tests/`，N5）。
5. **Q5 决策与问题复核（F3/F10）**：DEC-162/164/176/181 superseded；DEC-174/178/182/161/165 复核记录；ISS-021 防线改由 X-trace 承担并关闭；CHG-011 影响评估对账。verify: `gate index` + 记录一致。
6. **Q6 全量验证与消费项目（F23/F24）**：`node --test`、`npx tsc --noEmit`、`gate verify`、`gate check`；`RELEASE-0.9.0.md` 列出 CHG-011 破坏点（删除的门禁/文件/模板、消费项目要做的事，C-140；版本 0.8.0 → 0.9.0）；zhaoxi `keel update` 并跑 quick；本仓 handoff ≤ 10 行。
7. **Q7 方案级评审（F7）**：Q1–Q6 各在所属功能 worklog 记进度、`gate check --all` 全绿、`gate verify` 证据落盘后派一轮空白上下文评审（门禁改动 → 异构 headless）；这是 REQ-027/AC-1 对本版的具体化——本版工作单元是切片，不以每个 F 的 summary 为触发。处置后进入验收。

## 切片 → 测试义务

| 切片 | 功能 | 测试义务（黑盒名） |
|---|---|---|
| Q1 | F17/F6/F18 | REQ-017/AC-1..3, AC-5；REQ-005/AC-6；REQ-006/AC-4；REQ-018/AC-6；REQ-026/AC-1..4 |
| Q2 | F17/F5/F12/F18/F11 | REQ-017/AC-6；REQ-005/AC-7；REQ-012/AC-2；REQ-011/AC-4；REQ-018/AC-1 |
| Q3 | F7/F10/F6 | REQ-027/AC-1, AC-4, AC-5, AC-9, AC-10；REQ-010/AC-2；REQ-009/AC-4；REQ-007/AC-6 |
| Q4 | F1/F2/F4/F9/F12/F13/F15/F16/F22 | REQ-016/AC-3, AC-9；REQ-012/AC-1；REQ-004/AC-10；REQ-009/AC-1；REQ-002/AC-4；REQ-022/AC-1（machine-doc 均以协议检查命名） |
| Q5 | F3/F10 | 记录复核，无新测试（REQ-003/AC-5 现有测试仍绿） |
| Q6 | F23/F24 | REQ-025/AC-7（现有）；REQ-023/AC-6（RELEASE 说明协议检查） |
| Q7 | F7 | 评审产物两份（REQ-027/AC-10） |

## 完成边界

- 本地：`node --test`、`npx tsc --noEmit`、`gate verify`、`gate check`（8 条）；tree hash 一致。
- 评审：Q7 一轮方案级评审 passed，blocking 为 0。
- 外部：真实 GitHub 六格证据未取得前 REQ-017/AC-4 保持 proxy。
- 合并：实现完成不自动授权 merge/push；仍走 F7/F8/F18。

## 本轮预计触碰总范围

`keel/plan/`、`keel/requirements/v5.md`、`keel/templates/`、`keel/review/`、`keel/decisions/`（状态更新）、`keel/issues/`、`tools/gate/`、`tools/cli/`、`.agents/skills/`、`.claude/skills/`、`.githooks/`、`tests/`、`CONTEXT.md`、`AGENTS.md`、`keel/handoff.md`；消费项目 zhaoxi 的 `tools/gate/` 与技能。
