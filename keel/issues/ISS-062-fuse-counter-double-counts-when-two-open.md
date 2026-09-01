---
id: ISS-062
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/reviewloop.ts (bumpRounds); tests/chg014-review-fixes.test.ts"
feature: "F7"
fingerprint: "review-fuse-double-count-per-round"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-062 Fuse counter double-counts when two open ISS share one recurrence root: the loop fuses after two rounds instead of three

## 现象

Fuse counter double-counts when two open ISS share one recurrence root: the loop fuses after two rounds instead of three

## 影响

bumpRounds increments rounds_on[root] once per still-open ISS. Two findings that recur from the same root (two symptoms filed with recurrence_of: ISS-001, or a reused open ISS plus its recurrence) add 2 per clear; with FUSE_THRESHOLD 3 the loop is 'fused' at the end of round 2, stops the autonomous loop and escalates to the user one round early, contradicting REQ-027/AC-6 and AC-13 ('第三轮仍开即熔断'). The collision existed for identical fingerprints before, but DEC-189's chain merging makes it the normal case.

复现命令：

```
node --input-type=module -e "const {bumpRounds,emptyLoop}=await import('./tools/gate/reviewloop.ts');let st={...emptyLoop('a','b'),blocking_iss:['ISS-001','ISS-002'],iss_fp:{'ISS-001':'x','ISS-002':'y'}};const rootOf=()=>'root';st=bumpRounds(st,['ISS-001','ISS-002'],rootOf);st=bumpRounds(st,['ISS-001','ISS-002'],rootOf);console.log('after 2 rounds:',JSON.stringify(st.rounds_on),st.status);process.exit(st.status==='fused'?0:1)"
```

## 待诊断防线

Count each root fingerprint at most once per bumpRounds call (dedupe stillOpen by rootOf before incrementing). Test: two chain members still open after one clear -> rounds_on[root] === 1, status repairing.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`bumpRounds` 对每个仍开的 ISS 各加一次 `rounds_on[root]`；两个 ISS 归并到同一根指纹时一轮 clear 记 2，两轮就到阈值 3。

## 修复

一轮 clear 对同一指纹只计一次（`counted` 集合）。

## 为何未被更早发现

AC-13 的测试只构造了链上每轮一个 ISS 的情形。

## 闭环选择与理由

回归测试 `ISS-062 …`（tests/chg014-review-fixes.test.ts）。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:45.615Z
- probe_tree_hash: b622982a24d3b766240177accf6e292aae0d7a11
- probe_result: vulnerable


Probe exit 0 (module level, the same function gate loop clear calls via recordClear): two bumpRounds calls with ['ISS-001','ISS-002'] both resolving to 'root' give rounds_on = {root: 4}, status fused. Code: tools/gate/reviewloop.ts bumpRounds (lines 639-653), FUSE_THRESHOLD = 3 (line 29).
