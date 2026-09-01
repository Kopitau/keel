---
id: ISS-065
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/status.ts (nextLine, StatusShape.claimed); tests/chg014-review-fixes.test.ts"
feature: "F12"
fingerprint: "status-next-line-claimed-feature-misleads"
source: review-loop
recurrence_of: "ISS-060"
prior_defense_failure: "ISS-060 的修复只枚举了 frontier / blocked / planDone 三个来源，漏掉 frontier 里同样被排除的「已认领（claim.json）」功能"
defense_escalation: "nextLine 改为读取 Frontier 的全部四个集合（frontier / claimed / blocked / done），并在 CLI 层加了带 claim.json 的黑盒"
date: 2026-09-01
---

# ISS-065 gate status next: says 'no feature planned yet — add feature plans' when the remaining features are claimed (claim.json) and not done

## 现象

gate status next: says 'no feature planned yet — add feature plans' when the remaining features are claimed (claim.json) and not done

## 影响

nextLine only sees frontier / blocked / planDone. A feature with a plan and a claim.json is neither frontier nor blocked nor done, so a project whose remaining work is claimed (the F-branch / worktree flow, or a single agent on the last feature) is told to 'add feature plans (k-new step 4)' — the same wrong-navigation class ISS-060 fixed for the empty project, on the stage where a new session must resume the claimed feature (REQ-012/AC-5, C-72).

复现命令：

```
node --input-type=module -e "import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {spawnSync} from 'node:child_process';const NL=String.fromCharCode(10);const root=mkdtempSync(join(tmpdir(),'keel-r5-'));const w=(rel,t)=>{mkdirSync(dirname(join(root,rel)),{recursive:true});writeFileSync(join(root,rel),t,'utf8');};w('keel/config.json',JSON.stringify({records_dir:'keel'}));w('AGENTS.md','# k'+NL);w('keel/requirements/INDEX.md','- current: v1.md'+NL);w('keel/requirements/v1.md','# r'+NL);w('keel/plan/INDEX.md','- current: overview-v1.md'+NL);w('keel/plan/overview-v1.md','# p'+NL+'| I-01 | A |'+NL);w('keel/features/f01-x/plan/v1.md',['---','feature: F1','blocked_by: []','---','# F1',''].join(NL));w('keel/features/f01-x/claim.json','{}'+NL);spawnSync('git',['init','-q'],{cwd:root});const r=spawnSync(process.execPath,['tools/gate/gate.ts','--root',root,'status'],{encoding:'utf8',env:{...process.env,KEEL_INSTALLER_ROOT:'none'}});const next=r.stdout.split(NL).find(l=>l.startsWith('next: '))||'';console.log(next);process.exit(/no feature planned yet/.test(next)?0:1)"
```

## 待诊断防线

Add claimed to StatusShape (computeFrontier already returns it); when frontier is empty and claimed is non-empty print 'resume Fnn (claimed; see claim.json)' before the blocked / no-plan branches. Test at the gate status seam with a claim.json fixture.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`computeFrontier` 把有 `claim.json` 的功能既不放进 frontier 也不放进 blocked；`nextLine` 没有读 `claimed`，落到兜底句「no feature planned yet」。

## 修复

`StatusShape` 加 `claimed`，next 行写「claimed and in progress: Fnn — continue in its worktree or release the claim」。

## 为何未被更早发现

ISS-060 的回归只覆盖了空项目 / 有基线 / 有前沿 / 全部完成四种，没有认领态。

## 闭环选择与理由

回归测试 `ISS-065 …`（tests/chg014-review-fixes.test.ts，含 CLI 层）。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:51.324Z
- probe_tree_hash: e0d0cbc3f6418239bd70913ee6f76b14c38afb56
- probe_result: vulnerable


Probe exit 0: fixture with baseline, plan, f01-x/plan/v1.md and f01-x/claim.json, no summary -> 'next: no feature planned yet — add feature plans (k-new step 4); read …'. Code: tools/gate/status.ts nextLine (line 30); tools/gate/frontier.ts computeFrontier keeps claimed features in a list the shape never reads.
