# 门禁清单年检 2026（C-105）

- date: 2026-08-21
- trigger: W6 第一次年检（设计附录 B）；不是模型大升级，但清单要走一遍
- node: 22.19 本机；CI 矩阵 Node 22 + 24
- harness / model: Grok Build / grok-4.6
- 结论：**无过时约束可删**。Python/pytest 门禁已在 CHG-001 / DEC-149 去掉，不必本轮再删一遍。

## 本轮在查什么

C-105：拦 `--no-verify` / 强推 / 改 hooksPath / 改 CI / 改测试目录（提醒级）；gate 自带测试；模型大升级后复审清单。

提醒级 = 警告，不阻断；警告放行须 worklog 写 `gate-warn: <id>`（C-103）。强推在 `pre-push` 钩子里打印提醒，然后仍跑 `verify` + `check`。

## 检查项

| ID | 结论 | 说明 |
|---|---|---|
| G-req | KEEP | 当前需求书禁止活的 NEEDS-CLARIFICATION |
| G-research | KEEP | adr 决策须 RES 或书面豁免 |
| G-plan | KEEP | INDEX 唯一 current + 耦合表 |
| G-done | KEEP | 有 summary 且证据新鲜才算完成；无 verify.json 则 skip，避免开发中误杀 |
| G-merge | KEEP | 有已批准 APR 才启用；本仓 APR-001 仍 draft |
| G-retro | KEEP | 有 summary 则 OVERVIEW 必须在 |
| X-budget | KEEP | 150 行软 / 32KiB 硬 / 常驻装载 10KB 软（W6 实测 6427 字节，维持） |
| X-skills | KEEP | 16 个 k-*、标准字段、描述 Use when |
| X-casefold | KEEP | 跨平台文件名（DEC-145） |
| X-ids | KEEP | 编号不复用 |
| X-types | KEEP | `tsc --noEmit`（DEC-154） |
| X-hooks | KEEP | `core.hooksPath=.githooks`（C-102） |
| X-evidence | KEEP | 树哈希对账（C-33）；无证据 skip |
| X-bypass | KEEP | **W6 新增**，C-105 提醒级 |
| X-oss | KEEP | **W6 新增**，直接依赖对账 + 到期提醒（C-89/C-90） |
| X-knowledge | KEEP | **W6 新增**，~100 条封顶提醒（C-86）；目录不存在 skip |
| X-trace | KEEP | **P0 返工新增**（ISS-003 / C-32）：有 summary 的功能其 REQ 必须在 tests/ 被点名 |

## 已删除 / 不恢复

- gate = Python / pytest（DEC-101）：已被 DEC-149/152 取代，清单里没有对应检查项。
- 软链技能镜像：DEC-147 起三平台一律复制。

## 下次复审

模型大升级（换默认模型或门禁实现语言）或 **2027-08-21**，以较早者为准。`gate review` 打印本表 ID 的现场库存。
