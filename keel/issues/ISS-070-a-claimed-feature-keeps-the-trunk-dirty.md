---
id: ISS-070
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/git.ts (gitDirty, gitWriteTree); tests/iss070-claim-not-dirty.test.ts"
feature: "F19"
fingerprint: "claim-marker-counts-as-dirty-working-tree"
source: pilot-cleanup
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-070 只要有功能被认领，主干就永远"脏"：`claim.json` 被当成未提交改动

## 现象

2026-09-01 zhaoxi 主干：所有已跟踪文件干净，F6 在工作树里施工，`keel/features/f06-agent-workspace/claim.json`（`gate worktree F6` 写在主干上的认领标记，未跟踪）单独让 `gate verify` 报 `dirty: true`，于是 G-done / G-merge / X-evidence 全红、验收 APR 的证据快照（DEC-187）写不进去。

## 影响

C-112「一功能一分支一工作树」意味着施工期间主干上总有认领标记；按现在的判定，团队只要有人在干活，主干就做不出一份"干净树"的证据，F0 这类已验收功能也无法在主干补快照。keel 自己没撞到是因为本仓从没同时有认领和主干验收。

## 复现命令

```
node "<scratch>/iss070-probe.mjs"
```

探针在临时仓库提交一份基线，再写一个 `keel/features/f01-x/claim.json`，比较前后 `currentTree()`：`dirty` 变 true 或树哈希改变即缺陷在，退出 0（DEC-182）。

## 待诊断防线

已诊断，见下。

## 根因

`gitDirty` 就是 `git status --porcelain` 非空；`gitWriteTree` 把工作区 `git add -A` 后写树。两者都把认领标记当作普通文件，而标记既不是代码也不入库（`gate worktree rm` 会删掉它）。

## 修复

认领标记与证据、审批一样不动树：`gitDirty` 用 pathspec 排除 `<records>/features/*/claim.json`；`gitWriteTree` 把同一路径从临时索引里去掉。真正的改动（已跟踪文件修改、其它未跟踪文件）照旧算脏。

## 为何未被更早发现

REQ-019 的认领测试只看认领与释放本身；REQ-006 的 verify 测试从没在"有认领标记的主干"上跑过。两个试点都是单人施工，直到 F6 进工作树、同时要在主干补 F0 快照才同时满足条件。

## 闭环选择与理由

回归测试 `tests/iss070-claim-not-dirty.test.ts`（ISS-070 ×2）：有标记时 `dirty=false` 且树哈希不变；标记旁的真实改动和其它未跟踪文件仍为脏。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T10:18:29.552Z
- probe_tree_hash: a1675cdfb825dcc0be10feb0a5ee31bc158c248f
- probe_result: vulnerable

修复前：写入标记后 `dirty=true`、树哈希改变（退出 0）；修复后同一探针退出 1。
