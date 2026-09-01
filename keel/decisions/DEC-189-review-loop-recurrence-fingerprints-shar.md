---
id: DEC-189
title: 评审回路：recurrence_of 链共享同一熔断计数；pack 体积预算告警、lockfile 只留摘要、Finding 严格校验并存档原件
status: confirmed
date: 2026-09-01
features: [F7, F10]
research: []
research_exemption: "对 REQ-027 回路契约的四处收紧，全部来自 zhaoxi 11 轮 / 14 次 pack 的审计事实；无外部选型。"
adr: false
source_id: "REQ-027"
change: CHG-014
---

# DEC-189 评审回路四处收紧

## 问题

zhaoxi 的方案级回路跑了 11 轮 / 14 次 pack，熔断从未触发：复发每次换新 fingerprint（ISS-007→016→024→028→031、022→023），`rounds_on` 最大是 1。reviewer 收到 30k–95k tokens 的 pack 只能切片读；返回格式各异（对象 / `severity` / 漏 `blocking`），由实现者手工改写成 `.review-*.json` 再 ingest；F6 的 pack 因 `pnpm-lock.yaml` 160 KB 撞 400 KB 上限，多出一个 DEC 与 190 行本地代码。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A ① clear 计数时，ISS 前言 `recurrence_of` 指向的旧 ISS 与之共享一个根指纹，链上第三轮仍开即熔断；② pack 对 lockfile（pnpm-lock.yaml / package-lock.json / yarn.lock / uv.lock / poetry.lock / Cargo.lock / go.sum）只写"文件名 + sha256 + 行数"摘要；③ pack 超过 reviewer 预算（默认 120000 字符，config `review.pack_budget`）打印 WARN 并指出最大来源文件；④ ingest 严格校验 Finding 数组的形状（JSON 数组、每项是对象、有 `title`、`blocking` 是布尔、repro / impact / fingerprint / recurrence_of 若存在必须是字符串；blocking 缺 repro / impact 仍按 DEC-182 降为待核实），不合格整体拒绝并逐条列缺项，被拒文件原样存档 `keel/review/raw/round-N-<reviewer>.json`；Finding 可带 `recurrence_of` 供 ①归并** | 熔断真的能触发；lockfile 不再撑爆 pack；格式问题让 reviewer 重出，而不是实现者代笔 | 复发归并依赖 ISS 作者如实填 `recurrence_of`（k-log 已要求） |
| B 只做 ④ | 改动最小 | 熔断与体积问题原样保留 |

## 推荐理由

选 A。四条都是现有契约的机器化，不改 DEC-182 的探针协议。

## 用户决定原话

2026-09-01：「没有了 根据上述内容对框架进行修正和优化」（对第 8 条 a–d）；同日「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」。

## 影响

- `reviewloop.ts`：`rootFingerprint`（沿 `recurrence_of` 归并）、`bumpRounds` 按根指纹计数；`baseDiff` 排除 lockfile 并附摘要；`validatePack` 预算告警；`validateFindings` + `keel/review/raw/` 存档。
- REQ-027 增 AC-11/12/13（需求 v6 / CHG-014）；k-review 技能相应两句。
- 消费项目：更新后自动生效；zhaoxi 的 DEC-028 本地实现可撤。

## 后果与复审条款

（adr: false）复审触发：若 lockfile 摘要让 reviewer 漏掉依赖投毒类问题，则把 lockfile 的依赖版本增量作为第六个 pack 字段单独给出。
