---
id: ISS-057
schema: iss-v2
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/chg011-review-round2.test.ts (REQ-018/AC-6, REQ-009/AC-4, REQ-016/AC-3, REQ-016/AC-9, REQ-004/AC-10, REQ-009/AC-1, REQ-002/AC-4, REQ-003/AC-5)"
feature: f17-gate
fingerprint: "chg011-plan-test-obligations-missing"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-08-29
---

# ISS-057 The plan's named acceptance-test obligations are substantially missing

## 现象

The plan's named acceptance-test obligations are substantially missing

## 影响

The implementation can be accepted without exercising gate startup/output, empty-project failures, review rechecks/history, summary enforcement, or several rewritten skill protocols explicitly assigned to Q1–Q5. The reported 227 passing tests do not satisfy the plan's acceptance contract.

复现命令：

```
node --experimental-strip-types -e "Promise.all([import('node:fs'),import('./tools/gate/trace.ts')]).then(([fs,t])=>{const names=[];for(const f of fs.readdirSync('tests')){if(/\\.(ts|js|mjs|cjs)$/.test(f)){names.push(...t.parseTestInventory(fs.readFileSync('tests/'+f,'utf8')).names)}}const required=['REQ-017/AC-1','REQ-017/AC-2','REQ-018/AC-6','REQ-026/AC-2','REQ-026/AC-3','REQ-026/AC-4','REQ-027/AC-5','REQ-027/AC-9','REQ-009/AC-4','REQ-016/AC-3','REQ-016/AC-9','REQ-004/AC-10','REQ-009/AC-1','REQ-002/AC-4','REQ-003/AC-5'];const missing=required.filter(x=>!names.some(n=>n.includes(x)));process.exit(missing.length?0:1)})"
```

## 待诊断防线

Add the exact named black-box or runnable protocol tests from the Q1–Q5 table, with negative cases that exercise each promised behavior.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

overview-v4「切片 → 测试义务」表点名了 15 个 AC 标记，实现时有 8 个只做了一次性核对（grep / 手工）或用白盒名（ISS-053）覆盖，没有按 DEC-168 写成带 `REQ-nnn/AC-i` 名的黑盒测试；X-trace 只追溯被认领功能（f17-gate）的 AC，其余 REQ 的义务没有机器读者。

## 修复

补 8 条黑盒测试：REQ-018/AC-6（approve 回填带引号路径 / 缺哈希行拒绝）、REQ-009/AC-4（无 summary 不算完成：G-done 施工中、前沿仍列出）、REQ-016/AC-3（16 技能 ≤ 80 行且无已删门禁名）、REQ-016/AC-9（sync 生成并镜像 openai.yaml）、REQ-004/AC-10（AGENTS / k-impl 写明自主回路与三处停点）、REQ-009/AC-1（summary 功能完成时一次并压缩 worklog）、REQ-002/AC-4（开源写 RES `oss:` 字段）、REQ-003/AC-5（status 计数暂定决策）。

## 为何未被更早发现

方案级评审之前没有任何机器读切片义务表；实现方自己核对时把「做过检查」当成了「有测试」。

## 闭环选择与理由

回归测试：探针对 15 个标记逐一查测试名清单，修复后 missing 为空退出 1。

选了哪一级、为什么不用更高级：回归测试 / lint / 门禁或 hook / 项目规则 / 决策修订 / 显式不修。

可能复发的不许只留档。


## 打开态攻击探针

- probe_exit_code: 0
- probe_recorded_at: 2026-08-29T05:28:42.640Z
- probe_tree_hash: 86d166bfe9cd0eb5bf9e62e9fa2128fcfffabafc
- probe_result: vulnerable


The `keel/plan/overview-v4.md` “切片 → 测试义务” table expressly assigns these ACs. The diff adds good coverage for the quick subset, body hashing, and several disposition states, but no test names exist for the listed markers. Concrete behavioral gaps include all three REQ-026 failure cases beyond the vacuum SKIP test, REQ-027/AC-5 rechecking by a new context, REQ-027/AC-9 repeated-history preservation, and REQ-009/AC-4 G-done rejecting a completion claim without a summary. `ISS-053 X-apr...` tests pending hashes but is not the required `REQ-018/AC-6` acceptance test. Several Q4 obligations are covered only by differently named legacy/static checks, contrary to the plan's explicit black-box-name requirement.
