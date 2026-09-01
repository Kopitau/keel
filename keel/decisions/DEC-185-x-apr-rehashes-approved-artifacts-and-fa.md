---
id: DEC-185
title: X-apr 重算每个已批准工件的正文哈希，漂移即 FAIL（waiver 须按 APR 逐条引用）
status: confirmed
date: 2026-09-01
features: [F18, F17, F4]
research: []
research_exemption: "对现有确认机制（C-24/C-63/C-106/CHG-011）的判定强度取舍；候选只有 WARN 与 FAIL 两档，证据来自两个试点仓库的审计，无外部选型。"
adr: false
source_id: "REQ-018"
change: CHG-014
---

# DEC-185 X-apr 重算每个已批准工件的正文哈希，漂移即 FAIL

## 问题

APR 批准时记录工件正文哈希，但之后只有 G-req 复核"当前需求版本的 producing CHG"，X-apr 只查 pending 哈希与提交身份。zhaoxi 被 APR-002 绑定的 9 份功能计划全部被原地改过（加 `req:/blocked_by:`、加 DEC-013 测试义务、改步骤），哈希全部失配，一周无告警。"确认即冻结"的框架对冻结件被改没有机器反应。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 只在 `gate status` 的 `missing:` 里醒目显示，判 WARN | 不打断日常提交 | zhaoxi 的 G-req WARN 就是这样被"1 warn 可提交"带了一周；quick 不含 X-apr，status 也看不到 |
| **B X-apr 对每份 approved APR 引用的每个工件重算正文哈希；不一致 → FAIL，除非 worklog 有 `gate-warn: X-apr ref=APR-nnn`（错字级修订）；语义变化 = 新版本 + 新 APR。计划类工件（`plan/`、`features/*/plan/`）同时进 G-plan（quick）** | 冻结件被改当天就红；waiver 机制复用 CHG-011 已有的"引 APR 放行"口径；G-plan 在 quick 里跑，pre-commit 就能拦计划改动 | 本仓 CHG-011 Q5 追加复核记录的 10 个 DEC 会立刻失配，需要一次 waiver（本决策落地时一并写） |

## 推荐理由

选 B。C-24/C-63 的承诺是"确认件不可变、迭代出新版本"，没有机器复核就只是一句话。WARN 在 quick 里会被当作可提交（试点实证）。waiver 走 worklog 逐 APR 引用，保留错字修订通道又留下审计线索。

## 用户决定原话

2026-09-01：「没有了 根据上述内容对框架进行修正和优化」（对第 4 条方案："X-apr 对每份 approved APR……不一致 → FAIL……我不推荐 WARN"）；同日「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」（第 2 项 = 同意写本 DEC）。

## 影响

- `changechain.ts` 新增 `inspectApprovedArtifacts`：对所有 approved APR 的工件重算 `sha256Body` / `sha256Normalized`（旧全文哈希在文件未动时仍接受）。
- `check.ts`：X-apr 对失配工件 FAIL（带 `waivers`，按 APR 逐条 `gate-warn: X-apr ref=APR-nnn` 放行）；G-plan 对计划类工件做同样判定（quick 可见）。
- REQ-018 增 AC-7（需求 v6 / CHG-014）。
- 本仓：DEC-161/162/163/164/165（APR-002）与 DEC-174/176/178/181/182（APR-003）在 CHG-011 Q5 复核时正文被追加记录，决策语义未变；在 F3 worklog 写两行 waiver 引用 APR-002 / APR-003。
- 消费项目：zhaoxi 更新后 9 份计划会红，需要补 v2 或写 waiver；fmea-v3 不受影响（其 APR-001/002 仍是 draft，由 DEC-186 处理）。

## 后果与复审条款

（adr: false）复审触发：若 waiver 行在实践中被滥用为"每次都引一下"，把 waiver 改成必须写明改了什么并由新 APR 覆盖。
