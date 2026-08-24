---
id: ISS-011
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/p1-rework.test.ts; tools/gate/git.ts gitDir"
feature: f19-parallel
fingerprint: "worktree-empty-tree-hash"
date: 2026-08-24
---

# ISS-011 链接 worktree 里 gitWriteTree 恒空（P1-8）

## 闭环选择与理由

用 `git rev-parse --git-dir` 解析真实 git 目录，不再把仓库根 `.git` 当目录。
