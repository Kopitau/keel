---
id: ISS-067
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/reviewloop.ts (PACK_EXCLUDES, LOOP_ARTIFACT_RE); tests/chg014-review-fixes.test.ts"
feature: "F7"
fingerprint: "review-raw-archive-leaks-into-pack-diff"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-067 A committed keel/review/raw archive (rejected reviewer output) is diffed into the next review pack

## 现象

A committed keel/review/raw archive (rejected reviewer output) is diffed into the next review pack

## 影响

keel/review/raw/ is neither gitignored nor in PACK_EXCLUDES; only collectChangedPaths filters it. Once the implementer commits the archive (git add -A after a repair) `gate loop pack` puts the previous reviewer's verbatim output into pack.diff, so the fresh reviewer C-42 requires reads the prior round's findings inside its input and the pack grows by the archive's size — the contamination the findings.md / disposition.md exclusions exist to prevent (REQ-027/AC-2, C-39 / C-42). The F7 worklog claims raw/ 'does not enter the pack'.

复现命令：

```
node --input-type=module -e "import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';import {spawnSync} from 'node:child_process';const {makeCtx}=await import('./tools/gate/ctx.ts');const {runLoop}=await import('./tools/gate/reviewloop.ts');const NL=String.fromCharCode(10);const root=mkdtempSync(join(tmpdir(),'keel-r7-'));const w=(rel,t)=>{mkdirSync(dirname(join(root,rel)),{recursive:true});writeFileSync(join(root,rel),t,'utf8');};w('keel/config.json',JSON.stringify({records_dir:'keel'}));w('AGENTS.md','# k'+NL);w('keel/plan/INDEX.md','- current: overview-v1.md'+NL);w('keel/plan/overview-v1.md','# p'+NL+'| I-01 | A |'+NL);w('keel/requirements/INDEX.md','- current: v1.md'+NL);w('keel/requirements/v1.md','# r'+NL);const g=(a)=>spawnSync('git',a,{cwd:root,encoding:'utf8'});g(['init','-q']);g(['config','user.name','h']);g(['config','user.email','h@x']);g(['add','-A']);g(['commit','-q','-m','base']);const base=g(['rev-parse','HEAD']).stdout.trim();w('src.txt','changed'+NL);w('keel/review/raw/round-1-r.json','[{title:PRIOR-REVIEWER-OUTPUT}]'+NL);g(['add','-A']);g(['commit','-q','-m','raw archived']);const p=runLoop(makeCtx(root),['pack','--base',base,'--implementer','a','--reviewer','r']);const pack=JSON.parse(readFileSync(join(root,'keel','review','pack.json'),'utf8'));const leaked=pack.diff.includes('PRIOR-REVIEWER-OUTPUT');console.log('pack exit',p.code,'raw archive inside pack.diff:',leaked);process.exit(leaked?0:1)"
```

## 待诊断防线

Add :(exclude)keel/review/raw (records-dir aware, like gitWriteTree) to PACK_EXCLUDES, and either gitignore keel/review/raw/ or state in k-review that it is committed. Test: a committed raw file must not appear in pack.diff.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`keel/review/raw/` 只在 `collectChangedPaths` 里被过滤，`baseDiff` 的 pathspec 没排除它；被拒 reviewer 原件一旦被 `git add -A` 提交，下一轮 pack 的 diff 就把上一位 reviewer 的原话给了新 reviewer（违反 C-42 空白上下文）。

## 修复

`PACK_EXCLUDES` 加 `:(exclude)keel/review/raw`；同轮第二次被拒的存档改名 `-2` / `-3` 不覆盖（评审 advisory）。

## 为何未被更早发现

S6 的测试只在未提交状态下检查 raw 目录，没有把它提交后再打 pack。

## 闭环选择与理由

回归测试 `ISS-067 …`（tests/chg014-review-fixes.test.ts）：提交后的 raw 不进 diff、pack.json 不含原话、同轮两次被拒保留两份。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:57.776Z
- probe_tree_hash: ccf0d60bcb84174045468b7dcb7d740067c89a2a
- probe_result: vulnerable


Probe exit 0: after committing keel/review/raw/round-1-r.json containing PRIOR-REVIEWER-OUTPUT, pack.json diff includes it. Code: tools/gate/reviewloop.ts PACK_EXCLUDES (line 809) vs LOOP_ARTIFACT_RE (line 149).
