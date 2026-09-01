---
id: ISS-069
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/cli/update.js (--yes); tests/chg010-update.test.ts (ISS-069)"
feature: "F23"
fingerprint: "keel-update-needs-a-tty-to-say-yes"
source: pilot-cleanup
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-069 `keel update` 只在交互终端里接受确认，agent 会话无法替人更新

## 现象

2026-09-01 在 zhaoxi 与 fmea-v3 里跑 `echo y | keel update`：预览正常打印，随后 "Proceed? [y/N] keel update cancelled; no files changed"，退出 0。`confirmUpdate()` 要求 `stdin.isTTY === true`；管道、Claude Code / Codex / Cursor 的工具进程都不是 TTY。

## 影响

`RELEASE-0.9.2.md`「消费项目要做的事」第一条"`keel update`，看预览后输入 y"在 agent 会话里做不到；本次清理只能绕过 CLI，直接调用 `tools/cli/update.js` 的 `runUpdate` 并注入 `confirmUpdate: () => "y"`。每个消费项目、每次升级都会撞到同一堵墙。

## 复现命令

```
node "<scratch>/iss069-probe.mjs"
```

探针对一个有待更新操作的项目调用 `runUpdate`，注入"非终端"的 `confirmUpdate: () => null`、不带任何开关；输出含 cancelled 即缺陷在，退出 0（DEC-182）。

## 待诊断防线

已诊断，见下。

## 根因

REQ-025/AC-7 只定义了 y / N / EOF 三种交互答复，没有非交互的肯定开关；`confirmUpdate` 对非 TTY 一律返回 null（等于 N）。这是为了不把管道里的杂音当成 y，但也把明确、可审计的肯定关在了门外。

## 修复

`keel update --yes`：跳过确认，预览照常打印，结果行标明 `(--yes)`；没有 `--yes` 又不在终端里时，取消提示语点名这个开关。管道里的 `y` 仍然不算（保留 AC-7 的防误触）。

## 为何未被更早发现

REQ-025 的更新测试都用注入的 `confirmUpdate` 或真实 EOF 跑，没有"agent 环境要说 y"这个用例；0.9.0～0.9.2 的每次更新都是人在终端里敲的。

## 闭环选择与理由

回归测试 `tests/chg010-update.test.ts`（ISS-069 ×2）：`--yes` 在 `confirmUpdate` 返回 null 时仍应用全部操作并把 `keel_version` 写成安装器版本；无 `--yes` 的非 TTY 取消提示含 `--yes`。真实证据：0.9.3 发布后两个试点仓库都用 `keel update --yes` 完成升级（各自 worklog）。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T10:11:05.733Z
- probe_tree_hash: 8878174e8b47d358b42b23bb786bb49a9e1ba96f
- probe_result: vulnerable

修复前的树上探针输出 cancelled、退出 0；修复后同一探针加 `--yes` 应用操作、退出 1。
