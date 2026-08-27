---
id: DEC-172
title: spike 作为调研记录的一种（RES kind: spike）（deferred）
status: deferred
date: 2026-08-27
features: [F2, F17]
research: [RES-904]
adr: true
source_id: "REQ-002"
---

# DEC-172 spike 作为调研记录的一种（RES `kind: spike`）（deferred）

## 问题

keel 没有"一次性原型回答一个具体问题"的记录种类。zhaoxi 的 DEC-012 把八项 spike 实测写进 DEC 正文；DEC-009 用 `research_exemption: 本机实测即证据`（= 没有记录的 spike）；DEC-010 把壳选型推给"F6 的壳 spike"，届时的产物没有落点。wayfinder 的 prototype 票有明确纪律：回答一个具体问题、一条命令能跑、一次性分支并写票号、结论搬进产品代码、**变体由人选**（RES-904 §3）。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A. RES 加 `kind: spike`，必填 `question:`（回答哪个 DEC/REQ）、`run:`（一条命令）、`branch:`（`spike/<RES 编号>`，一次性）、`outcome:`（→ DEC-nnn）；G-research 对 spike 按本地档判（命令即证据）；规则：结论只进 DEC 不进产品代码（C-127）；多变体列出由用户选（C-03）** | 不加新目录与新编号；复用 RES 的索引与实质门 | rescheck 多一个分支；模板多四个字段 |
| B. 新记录种类 `SPK-nnn` | 语义更清楚 | 多一套编号/索引/模板（C-13 一决策一文件的精神不要求这个） |
| C. 继续写进 DEC 正文 | 零成本 | 复跑命令与分支随会话丢失 |

## 推荐理由

A，**推迟落地**：等第一个真实 spike（zhaoxi F6 壳选型，DEC-010 provisional 的复审触发）到来时用真样本定字段。

## 用户决定原话

> 按你说的全做

（2026-08-27。建议顺序把本条列为"等 F6 壳 spike 到来时再立"，用户按此答复；本文件记形状与触发条件，状态 deferred。）

## 影响

（deferred，未落地。落地时：）

- `keel/templates/RES.md` 加 `kind:` 与四个 spike 字段；`rescheck.ts` 对 `kind: spike` 改判据（`run:` 非空、`question:` 指向存在的 DEC/REQ、`outcome:` 指向 DEC）。
- k-research 文字：spike 纪律四条 + 变体由人选。
- `.gitignore` / `.gitattributes` 不动：spike 代码在一次性分支，不进主干。

## 后果与复审条款

- 触发：zhaoxi F6 壳 spike；或任一 DEC 再次出现 `research_exemption: 本机实测即证据`。
- 难逆转：低。
- 真权衡：多一种记录形态 ⇄ spike 的可复跑与可追溯。
