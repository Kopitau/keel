# worklog — F19 f19-parallel

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W2，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-24（P2）

- 进度：未改用 worktree。DEC-155 proposed：本地档单人允许 trunk；尾注 Feature: trunk。
- #经验候选 类型=知识缺口 单人本地档套用 C-112 全套并行纪律成本高于收益 → 弃 已被 DEC-155 吸收（本地单人可直接主线，branch_policy 已更新）


## 2026-08-21（W2）

- 进度：`gate worktree add|rm Fn`；分支 `keel/F-n-slug`；工作树 `.keel-worktrees/`（gitignore）。认领写 `claim.json`。触碰文件与已认领功能重叠则拒绝（C-114）。

## 2026-08-28（P4 / 分支与认领闭环）

- 进度：保留 DEC-155 三档策略；计划解析改为读取一行全部反引号路径、按数字选择 v10 而非 v9，并把目录/通配范围与其中文件视为重叠。
- 进度：第二身份认领同一功能会 fail 且不覆盖首个 claim；`worktree rm` 同时释放 claim；git add 失败时不再留下半完成 claim。重新分配通过现有 rm→add 路径完成，没有新增未确认 CLI 接口。
- 证据：`tests/chg010-branch-policy.test.ts` 5/5。

## 2026-09-01（CHG-014 S1：REQ-019/AC-5、AC-6 落地）

- 进度：C-115 尾注改为独立 trailer 段（`git log --format=%s` 只含主题，`%(trailers:key=Feature)` 可解析）；`Agent:` 在 Codex / Claude Code 环境由环境标记或父进程名识别，Cursor / VS Code 记 `Host:`。实现与证据见 F17 worklog 2026-09-01 节；黑盒 `REQ-019/AC-5`、`REQ-019/AC-6` 在 `tests/chg014-hook-harness.test.ts`。

## 2026-09-01（ISS-070：认领标记不算脏；0.9.3）

- zhaoxi 主干 F6 在工作树施工，主干上的 `claim.json` 单独让 verify 报脏，G-done / X-evidence 红、F0 的验收快照写不进。修复：`gitDirty` 排除 `<records>/features/*/claim.json`，`gitWriteTree` 从临时索引去掉同一路径（与证据、审批同一待遇）；真实改动与其它未跟踪文件照旧算脏。
- 探针（DEC-182）：修复前树 a1675cdfb825… 上写入标记后 dirty=true 且树哈希改变（退出 0）；修复后退出 1。
- 证据：`tests/iss070-claim-not-dirty.test.ts` ×2。

## 2026-09-04（CHG-016：跨工作树编号；worktree rm）

- `ids.ts` `listNumbersEverywhere`：并入其它工作树磁盘目录与 `keel/*` 分支树的最大号；`duplicateRecordIds` 让 `gate index` 拒绝重复编号（zhaoxi 合并撞 DEC-021 / APR-006 / ISS-032）。`worktree.ts` rm 自行重试 + prune（ISS-078）。证据：REQ-019/AC-7。
