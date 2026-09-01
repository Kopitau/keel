---
id: ISS-061
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/evidence.ts (evidenceVerdict / approvalCommitted); tests/chg014-review-fixes.test.ts"
feature: "F6"
fingerprint: "apr-evidence-snapshot-overrides-red-verify"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-061 X-evidence / G-done / G-merge report PASS via an APR evidence snapshot while a red verify.json for the same tree is on disk

## 现象

X-evidence / G-done / G-merge report PASS via an APR evidence snapshot while a red verify.json for the same tree is on disk

## 影响

On the local tier a `gate verify` that failed on tree T (exit_code 1, counts.failed 3) is overruled by any approved APR whose evidence_tree_hash names T: X-evidence, G-done and G-merge print PASS 'no fresh verify.json; approved APR-nnn snapshot matches this tree' although verify.json exists for that very tree and says the suite failed, so `gate check` certifies done / mergeable against the latest evidence. DEC-187 scopes the fallback to the case where verify.json cannot be found; evidenceVerdict applies it whenever evidenceGaps is non-empty, which includes a current red run.

复现命令：

```
node --input-type=module -e "import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {spawnSync} from 'node:child_process';const {makeCtx}=await import('./tools/gate/ctx.ts');const {runCheck}=await import('./tools/gate/check.ts');const {gitWriteTree,gitHead}=await import('./tools/gate/git.ts');const NL=String.fromCharCode(10);const root=mkdtempSync(join(tmpdir(),'keel-r1-'));const w=(rel,t)=>{mkdirSync(dirname(join(root,rel)),{recursive:true});writeFileSync(join(root,rel),t,'utf8');};w('keel/config.json',JSON.stringify({records_dir:'keel',enforcement_tier:'local',identities:{humans:[{name:'h',email:'h@x'}],agents:[]}}));w('AGENTS.md','# k'+NL);w('keel/requirements/INDEX.md','- current: v1.md'+NL);w('keel/requirements/v1.md','# r'+NL);w('keel/plan/INDEX.md','- current: overview-v1.md'+NL);w('keel/plan/overview-v1.md','# p'+NL+'| I-01 | A |'+NL);w('keel/features/f01-x/plan/v1.md',['---','feature: F1','blocked_by: []','---','# F1',''].join(NL));w('keel/features/f01-x/summary.md','# s'+NL);const g=(a)=>spawnSync('git',a,{cwd:root,encoding:'utf8'});g(['init','-q']);g(['config','user.name','h']);g(['config','user.email','h@x']);g(['add','-A']);g(['commit','-q','-m','base']);const ctx=makeCtx(root);const tree=gitWriteTree(ctx);w('keel/approvals/APR-001-x.md',['---','id: APR-001','status: approved','approver: h','artifacts:','  - path: AGENTS.md','    content_sha256: 0','evidence_tree_hash: '+tree,'evidence_commit: '+gitHead(ctx),'evidence_command: node --test','evidence_exit_code: 0','evidence_passed: 1','evidence_failed: 0','evidence_skipped: 0','evidence_recorded_at: 2026-09-01T00:00:00Z','---','','# APR-001',''].join(NL));w('keel/evidence/verify.json',JSON.stringify({command:'node --test',exit_code:1,started:'',finished:'',git_commit:gitHead(ctx),tree_hash:tree,dirty:false,report_hash:'',counts:{passed:0,failed:3,skipped:0},req_coverage:{},stdout_tail_2kb:'',actor:{harness:'local',model:'m',session:'s'}}));const line=runCheck(ctx,[]).stdout.split(NL).find(l=>l.includes(' X-evidence  '))||'';console.log(line);process.exit(/^PASS X-evidence/.test(line)?0:1)"
```

## 待诊断防线

evidenceVerdict: consult evidenceViaApproval only when verify.json is absent or its tree_hash differs from the current write-tree; a verify.json for the current tree is the verdict (red stays red, and the PASS text stops claiming 'no fresh verify.json'). Regression test at the runCheck seam: same tree, verify.json exit_code 1 + APR snapshot -> FAIL.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`evidenceVerdict` 只要 `evidenceGaps` 非空就去找 APR 快照，没有区分「verify.json 说的是这棵树但结果是红的」和「verify.json 缺失 / 说的是别的树」。DEC-187 的原意只覆盖后者。

## 修复

同树的 `verify.json`（`tree_hash` 等于当前 `git write-tree`）无论红绿都是最终结论，不再回退到 APR；只有缺失或过期时才看快照。顺手修了评审的 advisory：快照只认已提交且与 HEAD 一致的 APR 文件（`approvalCommitted`），手写进工作区的 `evidence_*` 不算。

## 为何未被更早发现

S4 的黑盒只测了「verify.json 删除后回读」与「树移动后拒绝」两条，没有构造「同树红色 verify.json + 匹配快照」这种矛盾输入。

## 闭环选择与理由

回归测试 `ISS-061 …` 与 `fp:apr-evidence-snapshot-uncommitted-hand-edit …`（tests/chg014-review-fixes.test.ts）；v6 REQ-006/AC-9 措辞同步。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:34.534Z
- probe_tree_hash: 740ee3f86cdc1b9e02058571bf01a837d5164c03
- probe_result: vulnerable


Probe run through sh -c on this tree: exit 0. Fixture: local tier, one summarized feature, approved APR with evidence_* for the current write-tree, verify.json {tree_hash: same, exit_code: 1, counts.failed: 3}. Output: 'PASS X-evidence  no fresh verify.json; approved APR-001 snapshot matches this tree (DEC-187)'. Code: tools/gate/evidence.ts evidenceVerdict (lines 243-250), consumed by check.ts gDone / xEvidence / gMerge.
