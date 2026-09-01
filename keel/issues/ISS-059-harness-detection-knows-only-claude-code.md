---
id: ISS-059
schema: iss-v2
status: open
defense_kind: ""
defense_pointer: ""
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

打开态只写"待诊断"，未知根因和修复不得编造。

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。
