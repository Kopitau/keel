---
id: ISS-054
schema: iss-v2
status: closed
defense_kind: "回归测试 + 门禁判据"
defense_pointer: "tests/iss054-probe-shell.test.ts; tools/gate/reviewloop.ts runReproCommand / probeShell"
feature: f07-review
fingerprint: "probe-shell-quoting"
source: review-loop（CHG-011 Q7 首轮 ingest，2026-08-29）
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-08-29
---

# ISS-054 攻击探针在 Windows 经 cmd.exe 运行时引号被破坏，真实漏洞被记成「未复现」

## 现象

CHG-011 首轮方案级评审（Codex 异构，pack d230b41c）返回 4 条 blocking finding，探针均为 `node -e "…"` 一行脚本（内含 `\"` 嵌套引号）。`gate loop ingest` 在 Windows 上经 `cmd.exe /c` 执行，cmd 不认 `\"`，脚本被截断：

```
^^^^^^ Unterminated string constant SyntaxError: Invalid or unexpected token
```

四条探针全部退出 1 → 按 DEC-182 记为「攻击探针首次退出 1，未开 ISS」→ 回路状态变成 **passed**（round 0，零 blocking）。而这四条发现都是真的（用 sh 跑同一探针全部退出 0；缺失的测试标记也由本地脚本核实为 8 个）。

## 影响

在 Windows 开发机上，任何需要嵌套引号的探针都会「误判为已拒绝」，评审回路可以在未修复任何问题的情况下通过——这正是评审者第一条发现警告的那类空转。三平台门禁结论也不一致（DEC-143）。

复现命令：

```
node -e "const s='hole';process.exit(s.includes(\"hole\")?0:1)"
```

修复前在 Windows（cmd.exe）退出 1 且报 SyntaxError；修复后退出 0。

## 待诊断防线

无——首次出现。

## 根因

`runReproCommand` 按平台分叉：Windows 用 `cmd.exe /c`，其他用 `sh -c`。评审配方与 rubric 要求探针是 POSIX 一行脚本，cmd.exe 的引号规则与之不兼容。keel 本来就要求所有支持平台有 `sh`（钩子 `#!/bin/sh`，DEC-146），分叉没有必要。

## 修复

`probeShell()`：非 Windows 返回 `sh`；Windows 用 `where sh` 找 `sh.exe`（Git for Windows 自带），找不到才退回 `cmd.exe`。`runReproCommand` 统一走 `sh -c`。

同时收紧 ingest 判定：blocking finding 只要有一条「无法核实」（无探针 / 无影响 / 探针首次非 0），回路状态为 `in_review` 而不是 `passed`；`gate loop clear` 在此状态下拒绝，要求新一轮评审把它去掉或给出能跑的探针（C-42）。首轮那种「四条待核实 + passed」不再可能出现。

## 为何未被更早发现

回路的自测都在同一平台跑同一种简单探针（`exit 0` / `node probe.js`），没有一条探针带嵌套引号；DEC-182 的「首次非 0 → 待核实」把运行器故障和真正被拒绝混为一谈，而 passed 的判定只看 ISS 数。

## 闭环选择与理由

**回归测试 + 门禁判据**：`tests/iss054-probe-shell.test.ts` 用带 `\"` 的探针断言退出 0/3 与平台无关；第二条断言「待核实的 blocking 使回路停在 in_review、clear 拒绝」。无补丁时该测试文件因 `probeShell` 不存在而无法加载（红），行为红灯是首轮 ingest 的真实输出（见 `keel/review/findings.md` 第 1 轮）。
