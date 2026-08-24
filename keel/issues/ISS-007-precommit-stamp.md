---
id: ISS-007
status: closed
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: "tests/p1-rework.test.ts; tools/gate/hook.ts; .githooks/pre-commit"
feature: f17-gate
fingerprint: "no-verify-detector-dead"
date: 2026-08-24
---

# ISS-007 --no-verify 检测器被 C-102 抹平（P1-4）

## 现象

prepare-commit-msg 不受 --no-verify 抑制，Feature 尾注恒在，X-bypass 永不触发。

## 闭环选择与理由

pre-commit 写 stamp；prepare-commit-msg 写 `Keel-Precommit: ok|skipped`。扫描最近 50 个提交。push --no-verify 权威在 CI。
