---
id: ISS-019
status: closed
defense_kind: "回归测试（端到端自洽）"
defense_pointer: "tests/r2-rework.test.ts hermetic verify+check; tools/gate/verify.ts spec reporter"
feature: f17-gate
fingerprint: "verify-output-rejected-by-check"
date: 2026-08-24
source: 第二轮独立复审（C-42），复现命令由复审者实跑
severity: 阻断级
---

# ISS-019 verify 产出的证据必然被 check 拒绝，CI 每次都会红

## 现象

`gate verify` 成功（exit 0）写出证据，但该证据的 `stdout_tail_2kb` 必然为空；而 `gate check` 要求该字段非空，于是 `G-done` / `X-evidence` 必然 FAIL。两条规矩自相矛盾：**本仓库在任何时刻都无法通过自己的完整门禁**。CI 工作流的步骤顺序是 verify → check，因此 **CI 每次运行都会红**（当前尚无远端，故未暴露）。

复现命令：

```bash
node tools/gate/gate.ts verify; echo "verify exit=$?"   # exit=0
node tools/gate/gate.ts check | grep -E "^FAIL"          # FAIL G-done / X-evidence: empty stdout_tail_2kb
node tools/gate/gate.ts check >/dev/null 2>&1; echo "check exit=$?"   # 1
```

## 根因

`verify.ts` 以 `--test-reporter=junit --test-reporter-destination=<文件>` 调用测试运行器，报告被重定向进文件，**子进程 stdout 结构性为空**，`tail2kb(combined)` 因此恒为空串；而 P1 返工给 check 增加了「`stdout_tail_2kb` 非空」这一判据，双方未对齐。

## 修复

二选一：
1. **让 verify 产出可读输出**：额外挂一个输出到 stdout 的 reporter（如 `--test-reporter=spec`，与 junit reporter 并存），或从 `junit.xml` 生成文本摘要写入 `stdout_tail_2kb`；
2. **改 check 的判据**：不要求「stdout 非空」，改为要求「证据能重建出计数摘要」（即 `counts` 与 `junit.xml` 对得上），这更贴近 C-33 的「对账」原意。
推荐 2 + 1 并行：判据改为对账，同时保留可读尾部便于人看。

## 为何未被更早发现

两个盲区叠加：① 自检测试对本仓库跑的是 `check --quick`（`w2-gate.test.ts:90`），而 quick 模式恰好跳过 X-evidence / G-done；② CI 从未真正运行过（无远端），三平台矩阵只是文件。**与上一轮 `stdout_tail` 为空未被发现是同一个盲区**。

## 闭环选择与理由

**回归测试（端到端自洽性）**：hermetic 仓 `verify` 后完整 `check` 必须 exit 0。verify 同时挂 spec→stdout 与 junit 文件；check 不再因 stdout 空而失败（junit 对账仍要）。不在默认套件里对本仓再套一层 `verify`（会递归）。
