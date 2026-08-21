# 统一实施规划总览 v1

- date: 2026-08-21
- status: 工作规划（技术方案 C-01~C-142 已确认；本文件把 DESIGN §8 建议路线图落成可执行顺序）
- replaces: null
- change: null
- adoption: 用户 2026-08-21「项目规划已经落盘，进入实施轮（w1开始）」+ 落点 1A（本目录）2A（git init，本地档）

确认即冻结。改接口/顺序走 CHG 出 v2（C-24）。§8/9 仍非 C 记录；若偏离会先告知。

## 功能清单

| F | 目录 | 主波次 | 测试义务（摘要） |
|---|---|---|---|
| F1 | f01-requirements-interview | W4 | 核心：访谈协议无歧义测试；验收=按轮提问技能走通 |
| F2 | f02-research | W4 | 核心：RES 格式校验；验收=缺 RES 不能标重大 DEC 完成 |
| F3 | f03-decisions | W1 迁入 / W2 new / W4 | 核心：状态机合法；验收=一决策一文件 |
| F4 | f04-unified-plan | **W1** | 核心：INDEX 唯一；验收=总览+23 份小规划 |
| F5 | f05-overhead | **W1** 地图 | 辅助：AGENTS 行数/字节；验收=常驻不灌记录 |
| F6 | f06-evidence | W3 | 核心：证据 JSON+树哈希；每条 AC≥1 测试 |
| F7 | f07-review | W4 | 辅助：评审材料五样齐全；隔离评审走技能 |
| F8 | f08-merge | W3–W4 | 核心：合并前置四条件；本地档=gate+APR |
| F9 | f09-retro | W1 总览种子 / W4 | 辅助：summary 固定节；完成门禁脚本 W2 |
| F10 | f10-issues | W2/W4 | 核心：防线指针存在性；复现命令必填 |
| F11 | f11-change | W4 | 核心：改当前需求版=门禁失败 |
| F12 | f12-handoff | **W1** | 辅助：handoff 五段；开场三跳 |
| F13 | f13-lessons | W4 | 辅助：候选标签汇集；≥3 次升级 |
| F14 | f14-knowledge | W1 空库 / W4 | 豁免文档；提升须脱敏 |
| F15 | f15-oss | W2/W4 | 核心：直接依赖 vs 登记表 |
| F16 | f16-platforms | **W1** 布局 / W4–W5 | 核心：AGENTS+镜像；W5 五家触发实测 |
| F17 | f17-gate | W2 | 核心：gate pytest；六门禁 |
| F18 | f18-approvals | W1 草稿 / W2 | 核心：人类身份提交；agent 身份拒 APR |
| F19 | f19-parallel | W2 | 核心：重叠文件检测；一功能一 worktree |
| F20 | f20-context-budget | **W1** 初值 / W2 机检 | 核心：超硬限不通过 |
| F21 | f21-config | **W1** | 辅助：config.json 合法；画像命令 |
| F22 | f22-migrate | **W1** 表 / W4 技能 | 核心：映射表+报告；初稿不成基线 |
| F23 | f23-bootstrap | **W1** | 核心：编号映射完整；上一版 gate 管下一版在 W2/W3 |

非目标 N2/N3/N4 见 requirements/v1.md，不进本表。

## 接口与耦合（联动测试义务来源，C-38）

| ID | 从 → 到 | 契约 | 文件重叠 |
|---|---|---|---|
| I-01 | F1 → F4/F6/F11 | REQ 编号+验收标准 | `keel/requirements/` 单写者：规划确认后只经 CHG |
| I-02 | F2 → F3 | 重大 DEC 必须有 RES 或书面豁免 | `keel/research/` 与 `keel/decisions/` 不争同一文件 |
| I-03 | F2 → F15 | 选用开源 → 强制 OSS | `keel/oss/` |
| I-04 | F3 → F4 | 已确认 DEC 约束规划 | 规划引用 DEC，不复制正文 |
| I-05 | F4 → F6/F19 | 本表 + 各功能「预计触碰文件」 | 重叠则串行或接口先行 |
| I-06 | F6 → F7/F8 | 证据 JSON（含树哈希） | `tools/gate/` 与证据目录（W3 定路径） |
| I-07 | F7 → F8 | 验收 APR ≠ 合并 | `keel/approvals/` |
| I-08 | F8 → F9 | 合并成功触发复盘 | `keel/OVERVIEW.md` 仅复盘时由完成方写 |
| I-09 | F10 → F13 | 同指纹 ≥3 次 → 经验候选 | worklog 标签 / ISS |
| I-10 | F13 → F14 | LES 提升 KLES，进项目须再确认 | 不入本仓 |
| I-11 | F16 → F17 | 技能/钩子只转调 gate | `.agents/skills/` vs `.githooks/` 不重复逻辑 |
| I-12 | F17 → 全部 | 六门禁唯一裁决入口 | 只此一份 `tools/gate/gate.py` |
| I-13 | F22 → F1–F12 | 迁移产物=未确认初稿 | 只读源目录 |
| I-14 | F23 → F22 | 自举按 F22 方式迁，保留原编号 | `docs/` 与 `DESIGN.md` 只读+标记 |
| I-15 | F21 → F17/F6/F16 | config 画像/身份/预算/可选组件 | `keel/config.json` 单文件 |

## 实施顺序

1. **W1（本波）**：目录树、AGENTS.md、模板、config、F22 映射表、F23 自举迁入、本总览与 23 份小规划、本地 git、status 桩。
2. **W2**：gate 核心（status/check/new/index/trace/sync/worktree/approve）+ pytest + `.githooks` 真身。
3. **W3**：verify 证据与树哈希、GitHub workflow、三档配置指引。
4. **W4**：16 个 k-* 技能 + Claude 镜像。
5. **W5**：样例项目冒烟 + 五主力触发实测 + Pi 冒烟。
6. **W6**：真实功能试点与初值校准。

同波次内：无 I-05 文件重叠的功能可并行；重叠则串行。W1 单会话单写者，无并行。

## 本波（W1）触碰范围

`AGENTS.md` `CLAUDE.md` `CONTEXT.md` `keel/**` `tools/gate/gate.py` `tools/gate/PLATFORM-LIMITS.md` `tools/bootstrap/` `tests/` `.githooks/` `.agents/` `.claude/` `.github/workflows/` `.gitignore`；只读并标记 `DESIGN.md` `docs/**`。不实现六门禁、不写技能正文、不配远端。
