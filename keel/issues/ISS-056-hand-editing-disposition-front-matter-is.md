---
id: ISS-056
schema: iss-v2
status: closed
defense_kind: "回归测试 + 门禁判据"
defense_pointer: "tests/chg011-review-round2.test.ts (ISS-056 ×2); tools/gate/reviewloop.ts dispositionAttested / parseLoopStatus"
feature: f07-review
fingerprint: "review-disposition-frontmatter-self-attestation"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-08-29
---

# ISS-056 Hand-editing disposition front matter is sufficient to manufacture a passed review

## 现象

Hand-editing disposition front matter is sufficient to manufacture a passed review

## 影响

The implementer can set `status: passed`, copy the current pack/tree hashes and chosen harness names into `disposition.md`, and make G-done accept a review that never ran. They can likewise edit both the ignored pack and its writable hash field without detection.

复现命令：

```
node -e "const fs=require('fs');const s=fs.readFileSync('tools/gate/reviewloop.ts','utf8');const t=fs.readFileSync('tests/chg011-plan-review.test.ts','utf8');const hole=[s.includes('status: attrs.status as LoopStatus'),t.includes('packedState(root, { status: \"passed\"'),t.includes('^PASS')].every(Boolean);process.exit(hole?0:1)"
```

## 待诊断防线

G-done should validate an append-only transition/history or independently bound reviewer attestation, not trust mutable front matter alone.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

disposition.md 的前言是普通解析数据，G-done 只核对其中的值（pack/tree 哈希、harness），不要求任何回路运行留下的痕迹；`gitWriteTree` 又把该文件排除在绑定树之外，手改前言不会使证据失效。旧 state.json 有同样性质（ISS-023 只绑哈希）。

## 修复

G-done 的 passed 判定增加出处核对：追加式历史里必须有记录该 pack 哈希的 `pack` 行，其后有同一轮次、以 `→ passed` 结尾的 `ingest` / `verdict` 行；缺任一即 FAIL（ISS-056）。前言 status 只认六个合法值，其他一律视为 `none` → FAIL「invalid status」。`packedState` 类测试夹具改为同时写历史行。本仓仍是「防呆不防恶」（C-111）：连历史行一起伪造仍可能过本地门禁，最终以 CI 复算与人对 disposition.md 的 diff 复核为准。

## 为何未被更早发现

把 state.json 迁成 markdown 时只搬了字段，没有把「谁写的」变成可核对的东西；新测试直接手写 passed 状态来验证 G-done，等于把攻击路径当成了夹具。

## 闭环选择与理由

回归测试 + 门禁判据：`tests/chg011-review-round2.test.ts` 两条 ISS-056 用例（无历史行的 passed → FAIL；非法 status → FAIL）；探针键 `status: attrs.status as LoopStatus` 与 `packedState(root, { status: "passed"` 修复后消失。

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。


## 打开态攻击探针

- probe_exit_code: 0
- probe_recorded_at: 2026-08-29T05:28:40.006Z
- probe_tree_hash: a08b6dd4fe83277c0be27d56825370c033bd64c7
- probe_result: vulnerable


`tools/gate/reviewloop.ts:262-350` treats all security-relevant loop state as ordinary parsed front matter. `completionReviewGaps` checks the values it reads but does not require an ingest/clear history, findings product, reviewer-produced attestation, or other provenance. `tools/gate/git.ts:100-125` deliberately excludes `disposition.md` and `findings.md` from the bound tree, so such edits do not stale evidence. The new test `tests/chg011-plan-review.test.ts` directly writes a synthetic state with `status: "passed"` and asserts that G-done returns PASS, confirming the behavior rather than defending it.
