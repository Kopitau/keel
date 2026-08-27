---
id: DEC-169
title: 前沿读取端：功能计划声明 blocked_by，gate status 打印"现在能开工什么"
status: confirmed
date: 2026-08-27
features: [F4, F12, F17, F19]
research: [RES-904]
adr: true
source_id: "REQ-019"
---

# DEC-169 前沿读取端：功能计划声明 `blocked_by`，`gate status` 打印"现在能开工什么"

## 问题

keel 假设多人多 agent 并行（C-112/C-114：一功能一分支一 worktree，重叠串行），但没有一个读取端能回答"现在哪些功能可以开工"：`overview-vN.md` 的"实施顺序与依赖"是散文，耦合表 I-nn 只记接口从谁到谁，`claim.json` 只记谁领了，`gate status` 不打印顺序。zhaoxi 的交接文件只能手写"F0 与 F1、F6 原语同波"，第二个 harness 接手时靠读散文猜。wayfinder 的"前沿"（开着、未阻塞、未领取）正是这个读取端（RES-904 §1）。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A. 计划前言 `blocked_by: [F1, F3]`；`gate status` 打印 `frontier:` / `blocked:`；G-plan 校验编号存在、无自指、无环；`worktree add` 对被阻塞功能 WARN 不拒** | 依赖机器可查；旧计划不写该行即"无阻塞"，零迁移；与 DEC-155（worktree 是建议）一致 | 计划模板多一个字段；status 多三行 |
| B. 只在 overview 的顺序段落里用固定表格，脚本解析表格 | 不动功能计划 | 顺序离开功能计划本身，改计划时容易忘改表；表格格式再发明一套解析 |
| C. 维持散文 | 无 | 并行永远靠散文与口头；每次交接重推一遍 |

## 推荐理由

A。依赖应当写在被依赖方旁边——功能计划就是那个地方；`gate status` 是每次开场的第一跳（C-27），把前沿放在这里意味着任何 harness 开场就知道能做什么。顺带把 DEC-168 的 proxy 计数印进 status（`proxy_acs:`），让">1/3 复审"这条阈值有读取端。

## 用户决定原话

> 按你说的全做

（2026-08-27，对 RES-904「借鉴清单详述」七条与建议顺序的答复；本决定的形状即该详述第 1 条，答复前已完整呈现。）

## 影响

- `keel/templates/feature-plan.md` 前言加 `blocked_by: []`；"依赖"节说明含义。
- `tools/gate/frontier.ts`：`computeFrontier()`——功能编号取计划前言 `feature:`（否则取目录名）；done = 有 summary.md；claimed = 有 claim.json；frontier = 未 done、未 claimed、阻塞者全部 done；problems = 非法编号 / 自指 / 不存在 / 环。
- `gate status` 加 `frontier:`、`blocked: F3 (by F2)`、`proxy_acs:` 三行。
- G-plan：problems 非空 → FAIL；PASS 行附 `frontier n, blocked m`。
- `gate worktree add Fnn`：被阻塞则输出 `WARN … claiming anyway`，不拒绝。
- 测试 `tests/dec169-frontier.test.ts`（8 条，`DEC-169` 前缀，无 AC 标记——需求书尚无对应 AC，见下）。
- **需求落点**：本决定新增的 status 行与 G-plan 判据在 v3 需求书里没有 AC；下一次 CHG 出 v4 时应为 REQ-019 补一条"Given 多功能计划 When status Then 打印前沿与阻塞"（gap-hunt-v3 已指出 confirmed 决策无 REQ 落点的问题，此处不再扩大）。
- 消费项目：升级后旧计划无 `blocked_by` 行 → 视为无阻塞，不产生 FAIL。

## 后果与复审条款

- 难逆转：计划前言字段一旦被多个项目使用，删字段要迁移。
- 无上下文会意外：为什么 worktree 对被阻塞功能只 WARN 不拒——因为 DEC-155 把 worktree 定为建议，且阻塞关系可能只是顺序偏好；硬拒要另出 DEC。
- 真权衡：多一层声明义务 ⇄ 并行时的机器可查。
- 复审触发：出现"功能内切片"也需要前沿（DEC-171/172 落地后看是否要把 `blocked_by` 下沉到内部步骤）；或某项目 `blocked:` 常年非空说明依赖写成了瀑布，应回 k-new 重切。
