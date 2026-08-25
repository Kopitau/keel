---
id: ISS-023
status: open
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: ""
feature: f07-review
fingerprint: "review-loop-passed-too-cheap"
date: 2026-08-25
source: 第四轮独立复审（C-42）；复现命令由复审者实跑
severity: 阻断级
requirements: [REQ-027]
---

# ISS-023 评审回路可被一条空数组命令置为 passed，且该状态不绑代码树

## 现象

`gate loop ingest` 收到空 findings 数组即把回路标记为 **passed**——没派子代理、没生成 pack、没做视角分类、没跑任何复现命令、没有异构证明。视角落在最弱的 `requirements` 档，`het_required=false`。

而 `G-done` 认这个布尔值。**「评审通过」因此变成一个任何人都能自己写的字段。**

第二个缺陷叠加其上：passed 状态**不绑定代码树哈希**。标记一次之后可以继续改任意代码，`G-done` 仍认为评审已过；且 `gDone` 用的是全仓一个布尔，一次 passed 覆盖所有 feature。

复现命令：

```bash
printf '[]' > findings.json
node tools/gate/gate.ts loop ingest findings.json
#   filed iss=- deferred=0
node tools/gate/gate.ts loop status
#   review loop: passed round=0 lens=requirements het_required=false blocking=-
# 此后 G-done 不再报 "review loop not passed"

# 叠加验证：标记后随意改代码、重跑 verify，G-done 仍不因回路而失败
```

## 根因

`reviewloop.ts:316` 在 findings 为空时直接置 passed，且默认 `lens=requirements`、`harness="unknown"`、`het_required=false`。状态写在 `state.json`，不含 tree/commit 绑定，也不按 feature 区分。

## 修复

1. **passed 必须有实质前提**，至少：本轮实际处理的 findings 来源可追溯（评审者身份/harness/模型）、视角分类由**改动文件**推导（见 ISS-024）、若要求异构则有异构执行的证据；
2. **passed 绑定代码树**：记录标记时的 `tree_hash`，与当前树不符即失效（复用 C-33 已有的 stale 判定，不要另造）；
3. **按 feature 记录**，不用全仓布尔；
4. 空 findings 数组**不足以**判 passed——至少要能证明「评审确实执行过」，否则应报错要求先 `pack`/执行。

## 为何未被更早发现

CHG-008 实施后**全程只跑 `--quick`**（5 次，恰好跳过 G-done），`gate verify` 一次未跑，因此「回路从未执行、G-done 因此变红」这件事在实施方那里从未显形。测试也只覆盖 happy path。

## 闭环选择与理由

**回归测试（负面用例）**：① 空数组 ingest 后 `loop status` **不得**为 passed；② passed 之后修改任意源文件 → `G-done` 必须重新失败；③ 一个 feature 的 passed 不得使另一个 feature 通过。
