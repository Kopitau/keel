---
id: ISS-004
status: closed
defense_kind: "门禁检查"
defense_pointer: "tests/p0-rework.test.ts (ISS-004); tools/gate/execmode.ts; X-hooks 100755"
feature: f17-gate
fingerprint: "hooks-not-executable-non-windows"
date: 2026-08-24
source: 独立评审 A1/A2/A3（docs/review/），由 Claude 复核实测
---

# ISS-004 .githooks 缺可执行位，macOS/Linux 上 L2 强制层完全失效

## 现象

`.githooks/{pre-commit,pre-push,prepare-commit-msg}`、`tools/gate/gate.sh`、`tools/gate/ci-trunk.sh` 在 git index 中全部是 `100644`（无可执行位）。git 只执行带可执行位的 hook，**非 Windows 平台会静默跳过**；且 `pre-commit` 用 `exec "$root/tools/gate/gate.sh"` 直接执行而非 `sh gate.sh`，644 下必然 permission denied。本机 `core.filemode=false`，Windows 上不暴露。本仓库当前是本地档，而 DEC-104 规定本地档的权威就是 hooks —— 等于 Mac/Linux 上零强制。

复现命令：

```bash
git ls-files -s .githooks/ tools/gate/gate.sh tools/gate/ci-trunk.sh
# 全部显示 100644；在 macOS/Linux 上 clone 后 hooks 不会被执行
```

## 根因

文件创建时未设可执行位；开发全程在 Windows（`core.filemode=false`）进行，且 CI 从未运行过（无远端），三平台矩阵没有机会暴露它。

## 修复

`git update-index --chmod=+x .githooks/pre-commit .githooks/pre-push .githooks/prepare-commit-msg tools/gate/gate.sh tools/gate/ci-trunk.sh` 并提交；同时新增门禁检查：这些文件在 index 中必须是 100755。

## 为何未被更早发现

Windows 单平台开发 + CI 从未真跑（DEC-148 的跨平台一致性至今只有 Windows 单点自测）。

## 闭环选择与理由

**门禁检查**（比回归测试更直接、跨平台都生效）：校验 index 文件模式；配一条测试断言模式错误时 FAIL。属机器可判定，按 C-59 阶梯不应只写进规则文档。

闭环：`git update-index --chmod=+x` 已提交；`X-hooks` 在模式不是 100755 时 FAIL。
