---
id: DEC-187
title: 批准时把 verify 证据快照写进 APR，local 档合并后 G-done / G-merge / X-evidence 可回读 APR 证据
status: confirmed
date: 2026-09-01
features: [F6, F18, F8]
research: []
research_exemption: "对 C-33/C-45 证据协议在 local 档的补丁；三个候选形状均为本仓内部机制，证据来自 zhaoxi master 今日 gate check FAIL。"
adr: true
source_id: "REQ-006"
change: CHG-014
---

# DEC-187 验收 APR 携带证据快照

## 问题

`keel/evidence/*.json` 被 gitignore（上游模板如此），设计前提是"CI 复算是权威"。local 档没有 CI：zhaoxi 在功能工作树里 verify、合并后删工作树，master 从未有过 `verify.json`；今天 master 上 `gate check` 对已验收的 F0 报 `FAIL G-done/G-merge/X-evidence: verify.json missing`，APR-005 正文写的 tree/commit/计数在仓库里没有任何机器可核的对应物。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A `gate approve` 时若盘上有与当前树一致、退出码 0 的 `verify.json`，把关键字段写进 APR 前言 `evidence:` 块（tree_hash / git_commit / command / exit_code / counts / recorded_at）；G-done / G-merge / X-evidence 找不到 `verify.json` 时，若存在 approved APR 的 `evidence.tree_hash` 等于当前 `git write-tree` 且 exit_code 0，则视为证据在案并注明来源；树不一致仍 FAIL** | 证据随人类身份提交的 APR 入库、被哈希绑定；不改 gitignore 策略；github 档无影响 | APR 回读的证据不带 junit 对账（只信 APR 记录的计数） |
| B local 档不再忽略 `verify.json`，直接提交 | 最直接 | 每次 verify 产生 diff，噪音提交；`verify.json` 含本机路径与 pid |
| C 不改机制，k-accept 要求合并后在主干重跑 verify | 零代码 | 靠自觉，zhaoxi 这次就没做 |

## 推荐理由

选 A。验收本来就是人类签 APR 的时刻，把当时的证据钉进 APR 是最小改动、最强绑定。

## 用户决定原话

2026-09-01：「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」（第 5 项 = 本决策选 A）。

## 影响

- `approve.ts`：读 `verify.json`，树一致且 exit 0 时写入前言的平铺字段 `evidence_tree_hash / evidence_commit / evidence_command / evidence_exit_code / evidence_passed / evidence_failed / evidence_skipped / evidence_recorded_at`（keel 的前言解析器只认平铺键，故不用嵌套块；缺失或过期时照常批准并打印提示）。
- `evidence.ts` 新增 `readApprovalEvidence` / `evidenceViaApproval` / `evidenceVerdict`；`check.ts` 的 G-done / G-merge / X-evidence 在 `verify.json` 缺失或过期时回读。
- `git.ts` 的树哈希把 `keel/approvals/` 与 evidence、评审产物一并排除：APR 是对树的证明、由自身正文哈希绑定，批准动作本身不能让它冻结的 verify 失效（否则快照永远对不上批准后的树）。
- APR 模板加 `evidence:` 说明；REQ-006 增 AC-9、REQ-018 增 AC-8（需求 v6 / CHG-014）。
- 消费项目：zhaoxi master 需要用新 gate 重新 approve 一份验收 APR 或在 master 跑一次 verify。

## 后果与复审条款

难逆转（APR 前言字段一旦被 X-apr 与 G-done 读取，格式不能再随意变）；无上下文会意外（"为什么 APR 里有测试计数"）；真权衡（入库噪音 vs 证据保全）。复审触发：github 档项目出现"APR 证据与 CI 证据不一致"的争议时，明确 CI 证据优先并在 APR 里注明。
