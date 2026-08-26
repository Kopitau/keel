---
id: DEC-166
title: C-107 修订：审批提交允许记录在案的委托
status: confirmed
date: 2026-08-26
features: [F18, F17]
research: [RES-903]
adr: true
source_id: ""
---

# DEC-166 C-107 修订：审批提交允许记录在案的委托

## 问题

C-107 原文要求审批必须由人类 git 身份提交。实测（zhaoxi APR-001/002）：agent 在用户指示下用 `git config` 设了用户身份提交，X-apr 的作者字符串比对完全放行；同一条 commit 里 harness 自动写了 `Claude-Session:` 完整 URL，而 keel 自己的尾注是 `Agent: unknown`。用户澄清：「是我让其提交的」——这是**委托**，不是冒名。规则与真实工作方式冲突：要么让规则匹配现实并让记录诚实，要么强制 agent 拒绝委托。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| A 允许记录在案的委托：判断必须是用户的（原话进 APR `delegated:` 字段），提交动作可委托；尾注从环境自动填真 | 匹配用户实际工作方式；「谁提交的」从不可知变为可查 | 委托记录一行字，伪造成本低（本地档防呆不防恶的既有定位，C-48/C-111） |
| B 维持严格：agent 收到提交指示必须拒绝 | 审批动作物理出自人手 | 每次审批用户自己敲两条命令，与其习惯相反——大家都会绕开的规则比没有规则更坏 |

## 推荐理由

选 A。附带修复根伤：`Agent: unknown` 的根源是 stamp 只认 `KEEL_AGENT` 变量，从不看 harness 环境——实测 Claude Code 导出 `CLAUDECODE=1` 与 `CLAUDE_CODE_SESSION_ID`，探测表只收实测过的标记，不猜名字。

## 用户决定原话

> A 做吧

（前情：用户 2026-08-26 对第一轮汇报答复「1 是我让其提交的」。）

## 影响

四道执法，全部有守卫测试（tests/r6-field-guards.test.ts R6c 段，9 条）：

1. **`tools/gate/harness.ts`**：`detectHarness()` 环境探测；`commitLooksAgentMade()` 尾注判据（`Agent:` ≠ unknown 或存在 `Claude-Session:`——后者覆盖 zhaoxi 那类 keel 尾注失真的历史提交）。
2. **stamp**（hook.ts）：`Agent:`/`Session:` 增加 harness 探测回退，agent 环境下不再写 unknown。
3. **`gate approve`**：agent 环境运行且 APR 无 `delegated:` → 拒绝，并给出补记指引。
4. **X-apr**（事后）+ **`gate hook pre-commit-apr`**（提交时）：agent 证据 + 无委托记录 → FAIL/拒绝；agent git 身份出现在审批提交上无条件拒绝（原禁令保留）。

APR 模板增 `delegated: ""` 字段并重写「提交纪律」节；k-accept 第 4 步改为双路径协议；AGENTS.md 禁令行同步。

**消费项目迁移**：zhaoxi 的 APR-001/002 在新判据下会 FAIL（有 `Claude-Session:` 尾注、无 `delegated:` 记录）——补一行记录用户当时的指示即可，这正是本决策要求的"把已经发生的委托写成字"。

## 后果与复审条款

**难逆转**：回退到严格 C-107 意味着已按委托路径落地的审批全部追溯非法。

**无上下文会意外**：`Claude-Session:` 尾注会把"人类在 agent 终端里亲手提交"也判为 agent 提交——按本决策语义这是**故意的**：经 agent 环境落盘的审批一律要委托记录，因为事后无法区分是谁敲的。

**真权衡**：委托记录本身可由 agent 伪造（写一行假原话）。本地档不试图防恶（C-111）；GitHub 档下 CODEOWNERS + PR 评审是防伪层。**复审触发**：出现一次伪造委托的真实事故，或接入远端后首次多人协作。

相关：[[ISS-034]]（作者字符串不可信的原始记录）、[[DEC-167]]（审批路径提交时守卫）。
