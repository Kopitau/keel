# worklog — F9 f09-retro

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W1-seed/W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W6）

- 进度：试点功能 F17 写了 `summary.md` 五节；OVERVIEW 原地更新。其他功能仍无 summary，不假装全部复盘完。

## 2026-08-28（P5）

- 进度：G-retro 对已总结功能的未销项候选由警告改为直接失败，暂定 DEC 必须逐 ID 出现在 OVERVIEW；候选只承认 `→ LES-nnn` / `→ KLES` / `→ 弃 <reason>`，不再被普通箭头误销项。定向 P5：52 passed / 0 failed。

## 2026-08-29（CHG-011 Q4 summary 时点）

- 进度：summary 模板首行改为「功能完成时写一次，worklog 压缩进来；合并后只更新 OVERVIEW」；k-retro 触发改为功能完成（测试通过 + 证据落盘）；`#经验候选` 处置改为同行 `→ 经验：…` / `→ 弃`，不机检，无 LES 文件。

## 2026-09-04（CHG-016：漏掉 k-retro 会被看见）

- `check.ts` `overviewStale`：OVERVIEW.md 早于最新 summary 时 G-done 记 WARN（zhaoxi 完成 F1/F6 后总览停在 8 月 25 日）；k-impl 收口段加 k-retro。证据：REQ-009/AC-5。
