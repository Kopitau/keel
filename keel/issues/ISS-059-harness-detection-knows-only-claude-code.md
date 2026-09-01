---
id: ISS-059
schema: iss-v2
status: closed
defense_kind: "regression-test + hook + approve guard"
defense_pointer: "tools/gate/harness.ts (detectHarness / detectHost / ancestorProcessNames); tools/gate/hook.ts (precommitAprGaps / precommitAprNotes); tests/chg014-hook-harness.test.ts"
feature: "F17"
fingerprint: "harness-detect-claude-only-dec166-guard-skipped"
source: "audit 2026-09-01 (zhaoxi Codex Desktop / fmea-v3 Cursor)"
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-059 harness 探测只认 Claude Code，DEC-166 的提交守卫在其他 agent 环境从不触发

## 现象

`tools/gate/harness.ts` 的 `detectHarness` 只检查 `CLAUDECODE=1` / `CLAUDE_CODE_ENTRYPOINT`（另有 `KEEL_AGENT` / `AI_AGENT` 手动覆盖）。Codex Desktop 与 Cursor 都不设这些变量，于是：

1. 两个试点仓库的全部提交尾注都是 `Agent: unknown Session: unknown`（C-115 的"平台模型/会话"字段为空）；
2. `hook.ts precommitAprGaps` 里 DEC-166 的检查写在 `if (harness && !delegated)` 分支下——认不出 harness 时整段跳过，agent 在 Codex/Cursor 里提交 `status: approved` 且无 `delegated:` 的 APR 不会被拒；
3. `approve.ts` 同样以 `detectHarness()` 为前提拒绝无委托的批准。

## 影响

C-107/DEC-166 的机器防线只在五家主力档里的一家（Claude Code）成立；其他 harness 下"agent 自签审批"只能靠事后 X-apr 看尾注，而尾注恰好也是 unknown。

复现命令：

```
node -e "import('file:///E:/program/en/tools/gate/harness.ts').then(m=>{const r=m.detectHarness({CODEX_SANDBOX_NETWORK_DISABLED:'1',PATH:'x'});process.exit(r?1:0)})"
```

（探针在缺陷存在时退出 0：Codex 的环境标记被判为"无 harness"。）

## 待诊断防线

（已诊断，见下）

## 根因

`detectHarness` 只列了实测观察过的 Claude Code 标记（注释明说"不猜名字"），Codex Desktop 与 Cursor 从未被观察；`precommitAprGaps` 与 `approve.ts` 又把 DEC-166 守卫写在 `if (harness && …)` 之下，探测失败等于守卫关闭。

## 修复

探测顺序改为：`KEEL_AGENT` 覆盖 → `CLAUDECODE` → 任一 `CODEX_*` 变量 → `AI_AGENT` → 父进程名（`codex` / `claude` / `opencode` / `grok` / `dsh`；Windows 一次 CIM 查询约 150 ms、POSIX 一次 `ps`，只在环境标记缺席时调用，`KEEL_ANCESTRY=0` 可关）。Cursor / VS Code 只作为 `Host:` 记录（人也可能在其终端里手动提交），不当 agent、不触发 DEC-166；无法识别但暂存了无委托的 approved APR 时 pre-commit 打印 WARN 提示设置 `KEEL_AGENT`。Codex Desktop 的变量名已由用户 2026-09-01 在应用内 `Get-ChildItem env:` 实测：`CODEX_APP_TOOLS_PIPE_PATH`、`CODEX_CI=1`、`CODEX_INTERNAL_ORIGINATOR_OVERRIDE=Codex Desktop`、`CODEX_MCP_NODE_PATH`、`CODEX_SANDBOX_NETWORK_DISABLED=1`、`CODEX_SESSION_ID`、`CODEX_THREAD_ID`；前缀规则据此钉死，会话号取 `CODEX_THREAD_ID`（再退到 `CODEX_SESSION_ID`），回归测试用这七个变量的真实形状。

## 为何未被更早发现

两个试点仓库的尾注一直是 `Agent: unknown`，但没有任何门禁把"unknown 占比"当作信号；DEC-166 的测试只覆盖了 Claude Code 环境。

## 闭环选择与理由

回归测试 + 钩子/批准守卫：`ISS-059 …` 覆盖环境前缀、父进程、Cursor 只作 host；`REQ-019/AC-6 …` 两条覆盖尾注与 DEC-166 守卫在 codex 环境触发、在 cursor 只告警。选回归测试 + 守卫而非规则，因为它是可机器判定的实现缺陷；剩余风险（完全无标记的环境）用 `KEEL_AGENT` 覆盖 + WARN 交代。

