---
id: DEC-186
title: 当前需求 / 规划版本声明"已确认"必须能追到 approved 且哈希匹配的 APR，否则 G-req / G-plan FAIL
status: confirmed
date: 2026-09-01
features: [F1, F4, F17]
research: []
research_exemption: "对 C-19/C-106/C-110 重确认规则的机器化补丁；候选只有'查 / 不查'，证据来自 fmea-v3 审计。"
adr: false
source_id: "REQ-001"
change: CHG-014
---

# DEC-186 声明"已确认"的当前基线必须绑定 approved APR

## 问题

fmea-v3 的 `requirements/v1.md`、`v2.md` 与 `plan/overview-v1.md` 前言写着"已确认（2026-08-29 用户「可以」；APR-001/002）"，而 APR-001/002 至今 `status: draft`、`content_sha256: pending`；agent 两次请用户签批无回应，整个 F01→F13 的自主循环在"计划从未绑定哈希"的前提下跑完。G-req 只核"当前版本的 producing CHG"，对"声明已确认但无 APR"没有反应。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 不查，靠技能提醒 | 无改动 | 试点已证明提醒无效（用户沉默两次，agent 继续） |
| **B 当前需求版本与当前规划总览：前言 `status` 含 confirmed / 已确认 时，必须能追到 approved APR——直接引用该文件且哈希匹配（漂移则按 APR 逐条 waiver），或（需求）引用产生该版本的已批准 CHG（G-req 既有链条口径）；两者皆无 → G-req / G-plan FAIL，提示"跑 `gate approve`（人类身份或记录委托）或把状态改回 proposed"** | 只查当前版本，历史版本不追溯，不会让老项目全红；quick 就能看到；与 G-req 既有的 CHG 链条判定一致 | 消费项目 fmea-v3 的 v1 那种"无 CHG、APR 仍 draft"会立刻红（预期）；只经 CHG 绑定的需求版本本身的漂移不在本决策内（由新版本 + CHG 覆盖） |
| C 查所有历史版本 | 更完整 | 早期版本常无 APR（本仓 v1–v3 的 APR 形态不同），会制造无意义的红 |

## 推荐理由

选 B。C-19/C-110 把"用户点头一次 = 基线，落 APR 哈希"作为五个人工确认点之一；文件自己写"已确认"而没有 APR，就是跳过了确认点，机器必须说出来。只看当前版本足以抓住活的问题。

## 用户决定原话

2026-09-01：「没有了 根据上述内容对框架进行修正和优化」（对第 5 条方案）；同日「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」。

## 影响

- `check.ts`：G-req 读当前需求文件的 `status`（YAML 前言或 `- status:` 列表两种写法），含 confirmed/已确认 时：直接绑定且匹配 → 通过；直接绑定但漂移 → WARN（按 APR waiver）；未直接绑定但产生它的 CHG 已批准并绑 APR → 通过；两者皆无 → FAIL。G-plan 对当前 overview 只看直接绑定（规划没有 CHG 链条）。
- REQ-001 增 AC-7、REQ-004 增 AC-11（需求 v6 / CHG-014）。
- 消费项目：fmea-v3 更新后需补签 APR-001/002（其 v3 已由 APR-003 绑定，因此当前版本不红；v1/v2 为历史，不追溯）。

## 后果与复审条款

（adr: false）复审触发：出现"状态写法"绕过（例如写成 confirmed 的近义词），则改为要求前言 `approved_by: APR-nnn` 字段。
