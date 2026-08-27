---
id: DEC-171
title: 需求书的 fog 判据与升级规则 + 按 epic 分批基线（deferred）
status: deferred
date: 2026-08-27
features: [F1, F17]
research: [RES-904]
adr: true
source_id: "REQ-001"
---

# DEC-171 需求书的 fog 判据与升级规则 + 按 epic 分批基线（deferred）

## 问题

`未决问题` 节（C-05）没有规则说什么该成 REQ、什么留在未决、什么出范围；基线粒度是整份需求书（C-06），大项目被迫一次写完。zhaoxi v1 一次写下 80+ 条 REQ、F4 整块 deferred、`未决问题` 实际是 32 问的问答日志；批准次日出 CHG-001，DEC-010 从 confirmed 翻回 provisional——wayfinder 作者描述的"27 张票到第 13 张作废"的瀑布陷阱（RES-904 §2）。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A. 需求书固定三节：`未决问题`（每条一句问句 + 阻塞谁）/ `尚未成形`（fog，只写方向）/ `范围外`（不回流，回流须 CHG）；升级规则：能写成问句才进未决，未决只能变成 REQ/DEC/RES；G-req 检查未决条目以 `?` 结尾或带 `→ RES-/DEC-`；k-new 允许按 epic 建 `vN.md`（前言 `scope: [F0, F1, F2]`），后续 epic 走既有新版本 + APR，C-06"一份文件一次点头"不动** | 与 k-grill 的"数问号"同一判据；分批基线复用现有版本机制 | 触碰 C-05 的解释；需要真样本实测判据（ISS-038 教训） |
| B. 只改 k-grill/k-new 文字，不加 G-req 检查 | 零代码 | 与 DEC-168 的教训相反：命名/格式规则没有机器读取端就会漂 |
| C. 维持现状 | 无 | 下一个大项目重演 zhaoxi v1 |

## 推荐理由

A，但**推迟落地**：判据必须拿现实中最好的样本实测（zhaoxi v1 的 `未决问题` 节、下一次 k-new 的访谈产物），否则会重演 ISS-038 的误杀。

## 用户决定原话

> 按你说的全做

（2026-08-27。建议顺序把本条列为"等 zhaoxi 下一次 k-new / k-change 到来时再立"，用户按此答复；故本文件记形状与触发条件，状态 deferred，届时按样本实测后转 confirmed 或修订。）

## 影响

（deferred，未落地。落地时：）

- `keel/templates/requirements-entry.md` 与 k-grill / k-new 文字：三节与升级规则。
- G-req 新分支：`未决问题` 条目形态检查；正样本 = zhaoxi v1 与本仓 v3。
- k-new：`scope:` 前言与按 epic 分批的说明；G-req 对 `scope` 外的功能目录不要求本版 REQ。

## 后果与复审条款

- 触发：zhaoxi 下一次 k-new（新 epic）或 k-change 出 v2 需求书；或任一消费项目的 `未决问题` 超过 20 条。
- 难逆转：需求书节结构是所有项目共用的；改一次要带迁移说明。
- 真权衡：更细的规则 ⇄ 访谈时的自由度。
