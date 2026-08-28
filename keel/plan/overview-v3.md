# 统一实施规划总览 v3

- date: 2026-08-28
- status: 工作规划（requirements v4、CHG-010 与 APR-003 已批准）
- replaces: overview-v2.md
- change: CHG-010
- requirements: v4.md
- why: 把 v4 的 verification、0.8.0 稳定化、legacy RES 迁移、自动评审闭环和真实 CI 证据拆成可独立验证的实施切片。

确认即冻结。再改接口、需求边界或测试义务必须走新 CHG 和新计划版本（C-21/C-24）。本版是 CHG-010 已批准范围的机械展开，不重写 v1/v2 历史。

## 功能清单与本轮交付

| F | 目录 | owner REQ | 当前计划 | 0.8.0 本轮交付 |
|---|---|---|---|---|
| F1 | f01-requirements-interview | REQ-001 | v2 | 访谈、gap-hunt 与原话证据的 machine-doc 对账 |
| F2 | f02-research | REQ-002 | v2 | legacy RES 清单消费端；URL 子检查 PASS/WARN/FAIL |
| F3 | f03-decisions | REQ-003 | v2 | 状态机、同轮原话和人工证据条件对账 |
| F4 | f04-unified-plan | REQ-004 | v2 | overview v3、24 份计划新版、`req:`/`blocked_by:` 机器校验 |
| F5 | f05-overhead | REQ-005 | v2 | 零 token 机械环节与人工质量边界证据 |
| F6 | f06-evidence | REQ-006 | v2 | AC↔verification 等长、三种验证方式、proxy 与 review 证据绑定 |
| F7 | f07-review | REQ-007/027/028 | v3 | headless 配方、攻击探针退出码、追加式清零历史、三类视角 |
| F8 | f08-merge | REQ-008 | v2 | 合并前四条件与“验收不等于合并”重验 |
| F9 | f09-retro | REQ-009 | v2 | summary/OVERVIEW/三销项的 v4 对账 |
| F10 | f10-issues | REQ-010 | v2 | ISS 打开/关闭字段分层、ingest/clear 正反向黑盒验收 |
| F11 | f11-change | REQ-011 | v2 | confirmed REQ 的 CHG/APR 关系门禁、证据失效联动 |
| F12 | f12-handoff | REQ-012 | v2 | 三跳、人工可恢复证据、平台无关交接 |
| F13 | f13-lessons | REQ-013 | v2 | 候选读取端与同指纹升级对账 |
| F14 | f14-knowledge | REQ-014 | v2 | 用户库边界、脱敏人工证据与容量提醒 |
| F15 | f15-oss | REQ-015 | v2 | RES→OSS、直接依赖、人工许可证/复查证据 |
| F16 | f16-platforms | REQ-016 | v2 | Codex `openai.yaml` 精确集合、镜像 stale、headless 配方页 |
| F17 | f17-gate | REQ-017/026 | v3 | workflow 契约与真实六格证据拆分；空项目四种语义 |
| F18 | f18-approvals | REQ-018 | v2 | CODEOWNERS 真人与 local 档降级、APR 身份校验 |
| F19 | f19-parallel | REQ-019 | v2 | DEC-155 三档分支策略、前沿与重叠串行 |
| F20 | f20-context-budget | REQ-020 | v2 | 预算硬线、记录不注入和人工质量边界 |
| F21 | f21-config | REQ-021 | v2 | 多画像选择、字段/中文正文约束、0.8.0 配置版本 |
| F22 | f22-migrate | REQ-022 | v2 | 迁移初稿/只读源/冲突报告与 legacy 清单导航 |
| F23 | f23-bootstrap | REQ-023/025 | v2 | 0.8.0 发布、update 预览+y/N+零写入、legacy 清单生成 |
| F24 | f24-cross-platform | REQ-024 | v2 | 规范化哈希、启动器、三平台/六格证据 |

## 接口与耦合（联动测试义务来源，C-38）

| ID | 从 → 到 | 契约 | 文件重叠 / 串行点 |
|---|---|---|---|
| I-01 | F1 → F4/F6/F11 | REQ 编号、GWT、verification 数组 | `keel/requirements/` 只经 CHG 写 |
| I-02 | F2 → F3 | 重大 DEC 必须有 RES 或书面豁免 | research 与 decisions 分文件 |
| I-03 | F2 → F15 | 调研选用开源必须建 OSS | `keel/oss/` 由 F15 单写 |
| I-04 | F3 → F4 | confirmed DEC 约束规划 | 规划引用 DEC，不复制正文 |
| I-05 | F4 → F6/F19 | 耦合表、预计触碰范围、`req:`/`blocked_by:` | plan 文件由 F4 规划切片单写 |
| I-06 | F6 → F7/F8 | verify.json、tree hash、review 段 | `tools/gate/evidence.ts` 与 `verify.ts` 串行 |
| I-07 | F7 → F8/F18 | 评审 passed + 用户 APR；验收不等于合并 | approvals 由 F18 守身份 |
| I-08 | F8 → F9 | 合并成功才触发复盘 | `OVERVIEW.md` 仅复盘时写 |
| I-09 | F10 → F13 | 同指纹 ≥3 次形成经验候选 | ISS/worklog 追加式 |
| I-10 | F13 → F14 | LES 可提升 KLES，进入项目须再确认 | 用户库不入本仓 |
| I-11 | F16 → F17 | 平台桥和 hooks 只转调同一 gate | 技能/桥与 gate 逻辑分离 |
| I-12 | F17 → 全部 | Node+TS gate 是唯一裁决入口 | `tools/gate/` 单一实现 |
| I-13 | F22 → F1–F12 | 迁移产物只是未确认初稿 | 旧框架源只读 |
| I-14 | F23 → F22 | 自举按迁移规则保留编号 | release/installer 与迁移报告串行 |
| I-15 | F21 → F17/F6/F16 | config 画像、身份、预算、平台清单 | `keel/config.json` 单写 |
| I-16 | F24 → F17/F6/F18 | `sha256Normalized` 与 Node≥22.18.0 | hash/launcher 修改先跑契约测试 |
| I-17 | F17 → F21 | `profiles.keel-gate` 是 gate 自身测试命令 | config 与 allowlist 同步 |
| I-18 | F24 → F16 | 技能镜像三平台统一复制 | `.agents` 为源，`.claude` 为生成物 |
| I-19 | F11 → F4/F6 | CHG 批准后出计划新版、更新测试义务、旧 evidence 作废 | requirements/plan/evidence 串行 |
| I-20 | F23 → F2 | update 生成 `<records_dir>/migrations/res-citation-legacy.json`；G-research 只消费并校验 | manifest schema 与 hash 契约测试 |
| I-21 | F23 → F16/F21 | 0.8.0 update 安装 `agents/openai.yaml` 并更新项目版本 | installer/config/sync 串行 |
| I-22 | F7/F10 → F6 | ingest 先验攻击探针；clear 追加同命令拒绝证据；verify 保留 `repro_runs` | `reviewloop.ts` 由一个切片修改 |
| I-23 | F11/F18 → F17 | confirmed REQ 来源 CHG 必须 approved 且可追到 approved APR | G-req + APR hash 联动测试 |
| I-24 | F17 → F24 | AC-3 本地 workflow 契约；AC-4 真实六格 run 证据 | 本地测试不得冒充真实运行 |
| I-25 | F4/F19 → F12 | `gate status` 输出 frontier/blocked/proxy，交接直接引用 | plan metadata 是唯一依赖源 |

## 0.8.0 实施切片与顺序

每一项都是一个可独立验证的切片；一个会话只做一项。没有完整 feature 级硬阻塞的计划保留 `blocked_by: []`，但下列文件重叠仍必须串行（C-114）。

1. **P0 规划基线（F4/F11）**：本 overview v3 + 24 份 plan 新版 + INDEX；只写规划，不写行为。verify: `node tools/gate/gate.ts check --quick`。
2. **P1 需求/计划/证据判据（F11→F4→F6）**：CHG→REQ→APR 关系、AC/verification 等长和类型、trace 展示与 proxy 语义。verify: 相关黑盒测试 + `gate trace`。
3. **P2 自动评审闭环（F7→F10，复用 F6）**：headless 配方、攻击探针先验、clear 追加历史、ISS-036 闭环。verify: `gate loop` 正反向黑盒 + 重复 clear。
4. **P3 updater 与 legacy RES（F23→F2）**：版本升 0.8.0；预览完整清单；`y/N` 前零写入；确认后生成外置 manifest；研究门禁按 cutoff 判 PASS/WARN/FAIL。verify: npm pack 后真实 CLI 黑盒 + RES fixtures。
5. **P4 平台与治理（F16/F17/F18/F19/F22/F24）**：openai.yaml、CODEOWNERS、三档分支、迁移报告、workflow 契约与跨平台 fixture。相交 `tools/gate/` 的改动按功能串行。
6. **P5 其余 owner 对账（F1/F3/F5/F8/F9/F12–F15/F20/F21）**：补 machine-doc/manual 证据条件和缺失黑盒，不用空测试凑 trace。
7. **P6 全量与消费项目**：Windows 全量、npm pack 安装、至少一个消费项目 update；然后提交并触发 GitHub Windows/macOS/Linux × Node 22/24。真实 run URL/ID、SHA、六个 job、日期和工件 hash 才解除 REQ-017/AC-4 proxy。

## 完成边界

- 本地：`node --test`、`npx tsc --noEmit`、`gate verify`、`gate trace`、`gate check`；tree hash 必须一致。
- 评审：声称完成后自动 review loop 必须 passed，blocking 为 0；门禁/测试机制改动强制异构复审。
- 外部：消费项目实测与真实 GitHub 六格证据未取得前，只能报告剩余限制，不能把 proxy 改成 PASS。
- 合并：本规划与实现完成不自动授权 merge/push；仍走 F7/F8/F18。

## 本轮预计触碰总范围

`keel/plan/`、`keel/features/*/plan/`、`keel/config.json`、`keel/migrations/`、`tools/gate/`、`tools/cli/`、`bin/`、`.agents/skills/`、`.claude/skills/`、`.github/`、`.githooks/`、`tests/`、`package.json`、release 说明与消费项目迁移记录。`keel/handoff.md` 有用户在途改动时不得由实现切片覆盖。
