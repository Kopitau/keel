---
id: ISS-010
status: closed
defense_kind: "门禁检查"
defense_pointer: "tests/p1-rework.test.ts; tools/gate/approve.ts; check.ts xApr"
feature: f18-approvals
fingerprint: "apr-author-not-checked"
date: 2026-08-24
---

# ISS-010 C-107 只查本地 git config，不查提交作者（P1-7）

## 闭环选择与理由

approve 要求 humans 非空且身份在列。X-apr 读 `git log -1` 作者，agent 身份 FAIL。
