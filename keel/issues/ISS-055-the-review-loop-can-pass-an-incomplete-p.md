---
id: ISS-055
schema: iss-v2
status: closed
defense_kind: "回归测试 + 门禁判据"
defense_pointer: "tests/chg011-review-round2.test.ts (ISS-055 ×4); tools/gate/reviewloop.ts defaultBase / pack / completionReviewGaps"
feature: f07-review
fingerprint: "review-pack-not-bound-to-plan-range"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-08-29
---

# ISS-055 The review loop can pass an incomplete plan using an empty, same-harness pack

## 现象

The review loop can pass an incomplete plan using an empty, same-harness pack

## 影响

A committed gate/test change can be omitted from the reviewer input, classified as non-attack, and reviewed by the implementer's own harness. The loop can also pass before every active feature has a summary. This removes the remaining defense against deleting non-traced black-box tests.

复现命令：

```
node -e "const fs=require('fs');const s=fs.readFileSync('tools/gate/reviewloop.ts','utf8');const a=s.indexOf('if (sub === \"pack\")');const b=s.indexOf('if (sub === \"ingest\")');const p=s.slice(a,b);const hole=[p.includes('const base = flag(args, \"base\") || \"\"'),!p.includes('planComplete'),s.includes('PACK_DIFF_ARGS.map((args) => git(ctx, [...args]).stdout')].every(Boolean);process.exit(hole?0:1)"
```

## 待诊断防线

Require a validated plan-start base/range, reject incomplete plans and empty or failed diffs, cover all active feature summaries, and derive the lens from that same complete range.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

方案级回路沿用了功能级的「工作树 diff」模式：不带 `--base` 时 pack 只看未提交改动，干净树得到空 diff；lens 只按最近一次提交分类；G-done 对已 passed 的回路不再关心规划何时完成，早期一次通过可以掩盖之后所有功能的完成；worklog 摘要只保留末尾 3500 字，早期功能被丢掉。

## 修复

`gate loop pack` 必须有范围：显式 `--base`，否则继承同一规划上次的 base，否则取上次 passed 的树，都没有则拒绝；base 必须是仓内 commit/tree；范围内无改动拒绝；lens 与 diff 都按整个范围算；pack 行记录 `plan_complete`。G-done：活动功能全部有 summary 后，passed 回路的树必须等于当前树，否则 FAIL 而不是 WARN。worklog 摘要按功能均分配额。

## 为何未被更早发现

回路自测都在临时仓里 pack 未提交改动，从未在干净树上 pack；「单功能完成不触发」的测试只验证何时该评审，没有试过提前评审再补完功能。

## 闭环选择与理由

回归测试 + 门禁判据：`tests/chg011-review-round2.test.ts` 四条 ISS-055 用例（无 base 拒绝、空范围/伪 base 拒绝、再次 pack 继承 base 且范围不缩、规划完成后旧 pass 变 FAIL）。评审者探针文本键（`const base = flag(args, "base") || ""`、pack 段不含 `planComplete`、工作树 `PACK_DIFF_ARGS`）修复后全部消失。

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。


## 打开态攻击探针

- probe_exit_code: 0
- probe_recorded_at: 2026-08-29T05:28:38.409Z
- probe_tree_hash: 59cccd895c0e1033475e8edc563f46e91e0c96e5
- probe_result: vulnerable


`tools/gate/reviewloop.ts:656-714` builds an unbased pack solely from unstaged and staged diffs, so a clean committed tree produces an empty `diff`. `--base` is optional and arbitrary. `runLoop(... pack ...)` at the hunk around line 741 does not call `planComplete`, reject an empty diff, or validate that the base predates the plan. `collectChangedPaths` falls back only to the latest commit, so earlier attack-lens commits can also disappear from lens classification. The supplied `worklog_summary` confirms another scope loss: `worklogDigest` keeps only the final 3500 characters, dropping early features from a 24-feature plan. The test `REQ-027/AC-1 a single finished feature...` checks only when review becomes due; it never attempts `loop pack` early.
