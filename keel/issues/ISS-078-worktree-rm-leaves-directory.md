---
id: ISS-078
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/worktree.ts (rm retry + prune)"
feature: "F19"
fingerprint: "worktree-rm-directory-not-empty"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-078 Windows 上 gate worktree rm 删不干净目录，残留至今

## 现象

zhaoxi 完成 F1 后 `gate worktree rm F1` 报 `Directory not empty`，`Remove-Item` 也失败，`.keel-worktrees/F-01-collection-and-fidelity/` 从 9 月 3 日残留到审计当天。

## 影响

残留目录让 `git worktree list` 与磁盘不一致，下一次同名认领会撞上。

复现命令：

```
node --test tests/w2-gate.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

git 在有进程持有句柄时放弃删除并保留目录；keel 只转发了 git 的错误。

## 修复

`rmSync` 重试后 `git worktree prune`；仍在则明确报「leftover directory」。

## 为何未被更早发现

keel 自己在本机没跑过认领→完成→释放的完整闭环。

## 闭环选择与理由

回归测试（`tests/w2-gate.test.ts`：（Windows 文件句柄行为不可在测试里稳定复现；修复是 rm 自行重试五次 + `git worktree prune`，失败时打印残留路径。））。本条无自动回归（平台句柄行为），按 machine-doc 处理。
