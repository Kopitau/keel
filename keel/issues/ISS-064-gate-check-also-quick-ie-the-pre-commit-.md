---
id: ISS-064
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/changechain.ts (isRegularFile); tools/gate/approve.ts; tests/chg014-review-fixes.test.ts"
feature: "F17"
fingerprint: "approved-artifact-directory-path-crashes-check"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-064 gate check (also --quick, i.e. the pre-commit hook) crashes with EISDIR when an approved APR's artifact path is a directory

## 现象

gate check (also --quick, i.e. the pre-commit hook) crashes with EISDIR when an approved APR's artifact path is a directory

## 影响

inspectApprovedArtifacts and approvalBinding call readFileSync on every path an approved APR names; a path that exists but is a directory (a typo such as keel/features/f01-x/plan without the file name) throws EISDIR out of runCheck. G-plan runs the drift scan in --quick, so the pre-commit hook dies with a Node stack trace instead of a verdict and every commit in that project is blocked without a human-readable reason (requirements checklist: 人话错误, not a bare stack).

复现命令：

```
node --input-type=module -e "import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {spawnSync} from 'node:child_process';const {makeCtx}=await import('./tools/gate/ctx.ts');const {runCheck}=await import('./tools/gate/check.ts');const NL=String.fromCharCode(10);const root=mkdtempSync(join(tmpdir(),'keel-r4-'));const w=(rel,t)=>{mkdirSync(dirname(join(root,rel)),{recursive:true});writeFileSync(join(root,rel),t,'utf8');};w('keel/config.json',JSON.stringify({records_dir:'keel',enforcement_tier:'local'}));w('AGENTS.md','# k'+NL);w('keel/requirements/INDEX.md','- current: v1.md'+NL);w('keel/requirements/v1.md','# r'+NL);w('keel/plan/INDEX.md','- current: overview-v1.md'+NL);w('keel/plan/overview-v1.md','# p'+NL+'| I-01 | A |'+NL);w('keel/features/f01-x/plan/v1.md',['---','feature: F1','blocked_by: []','---','# F1',''].join(NL));w('keel/approvals/APR-001-x.md',['---','id: APR-001','status: approved','artifacts:','  - path: keel/features/f01-x/plan','    content_sha256: 0123','---','# APR-001',''].join(NL));spawnSync('git',['init','-q'],{cwd:root});try{const r=runCheck(makeCtx(root),['--quick']);console.log(r.stdout.split(NL).find(l=>l.includes(' G-plan  ')));process.exit(1)}catch(e){console.log('gate check crashed: '+e.message);process.exit(0)}"
```

## 待诊断防线

In inspectApprovedArtifacts / approvalBinding treat a non-file (statSync(...).isFile() false) or unreadable path as state 'missing' and name it in the FAIL summary; same guard in approve.ts. Regression test at the runCheck --quick seam.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`inspectApprovedArtifacts` / `approvalBinding` 用 `existsSync` 判断后直接 `readFileSync`，目录会抛 EISDIR，把整个 `gate check --quick`（即 pre-commit）炸掉。

## 修复

`isRegularFile`（`statSync().isFile()`）：不是普通文件一律按 missing 处理；`gate approve` 对目录路径明确拒绝「name the file, not its directory」。

## 为何未被更早发现

夹具里的工件路径都是文件；没有按鲁棒性清单构造「存在但不是文件」的输入。

## 闭环选择与理由

回归测试 `ISS-064 …`（tests/chg014-review-fixes.test.ts）：quick 不崩、full 的 X-apr 报 missing、approve 拒绝。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:49.131Z
- probe_tree_hash: b0ecc8c5bec5fea9b8412aad8006b4ee2e34e7f8
- probe_result: vulnerable


Probe exit 0: runCheck(ctx, ['--quick']) throws 'EISDIR: illegal operation on a directory, read'. Code: tools/gate/changechain.ts inspectApprovedArtifacts (lines 49-65) and approvalBinding (lines 95-109).
