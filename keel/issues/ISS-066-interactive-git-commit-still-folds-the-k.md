---
id: ISS-066
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/hook.ts (insertTrailers); tests/chg014-review-fixes.test.ts"
feature: "F17"
fingerprint: "hook-trailer-folds-into-subject-interactive"
source: review-loop
recurrence_of: "ISS-058"
prior_defense_failure: "ISS-058 的修复与测试只覆盖了带 -m / -F 的非交互提交（消息非空）；交互式提交给钩子的是空消息 + 注释块，尾注被放到第 1 行，人类随后输入的主题紧贴其上"
defense_escalation: "insertTrailers 对空消息预留主题行与空行，并用真实 git commit --cleanup=strip 的黑盒守住"
date: 2026-09-01
---

# ISS-066 Interactive git commit still folds the keel trailers into the subject: the hook writes them at the top of an empty message with no blank line left for the subject

## 现象

Interactive git commit still folds the keel trailers into the subject: the hook writes them at the top of an empty message with no blank line left for the subject

## 影响

For `git commit` without -m (the path a human takes for an APR commit — 'commit this file with your human git identity'), prepare-commit-msg receives only git's blank line plus the comment block; insertTrailers puts 'Keel-Precommit: … Session: …' on lines 1-5 and the user types the subject on line 1 above them, so after cleanup the commit reads 'subject Keel-Precommit: skipped Feature: … Agent: …' — exactly the shape REQ-019/AC-5 forbids (尾注前有一个空行, %s only the subject): git log --oneline is polluted and %(trailers:key=Feature) is empty. The pre-CHG-014 hook folded on this path too (trailers after the comments), so the ISS-058 fix does not cover the editor path.

复现命令：

```
node --input-type=module -e "import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';const NL=String.fromCharCode(10);const root=mkdtempSync(join(tmpdir(),'keel-r6-'));mkdirSync(join(root,'keel'));writeFileSync(join(root,'keel','config.json'),JSON.stringify({records_dir:'keel'}));writeFileSync(join(root,'a.txt'),'a'+NL);const g=(a)=>spawnSync('git',a,{cwd:root,encoding:'utf8'});g(['init','-q']);g(['config','user.name','h']);g(['config','user.email','h@x']);g(['add','-A']);const msg=join(root,'COMMIT_EDITMSG');writeFileSync(msg,['','# Please enter the commit message for your changes.','# On branch main',''].join(NL));const env={...process.env,KEEL_ANCESTRY:'0',KEEL_AGENT:'codex'};spawnSync(process.execPath,['tools/gate/gate.ts','--root',root,'hook','prepare-commit-msg',msg],{encoding:'utf8',env});writeFileSync(msg,'subject typed by human'+NL+readFileSync(msg,'utf8'));spawnSync('git',['commit','-q','-F',msg,'--cleanup=strip'],{cwd:root,encoding:'utf8',env});const s=g(['log','-1','--format=%s']).stdout.trim();console.log('subject line: '+JSON.stringify(s));process.exit(s==='subject typed by human'?1:0)"
```

## 待诊断防线

When the head is empty (message not written yet) emit a blank line for the subject plus a separating blank line before the trailer block, or add the trailers in a commit-msg hook after the editor; regression test that simulates the editor prepending a subject and asserts git log --format=%s.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`insertTrailers` 在 head 为空时直接把尾注放在文件开头；人类在编辑器里把主题写到第 1 行后，第 2 行就是 `Keel-Precommit:`，git 把它们折成主题段。

## 修复

head 为空时先输出两个空行（第 1 行留给主题，第 2 行作分隔）再写尾注，注释块仍在最后。

## 为何未被更早发现

本仓与试点的 agent 提交全部走 `-m`，从未走交互式路径；ISS-058 的测试也只写了非空消息。

## 闭环选择与理由

回归测试 `ISS-066 …`（tests/chg014-review-fixes.test.ts）。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:53.834Z
- probe_tree_hash: 18f19b61fc1959acb635f51136f7797c54233af7
- probe_result: vulnerable


Probe exit 0: the file handed to the editor starts with 'Keel-Precommit: skipped' (no leading blank line); after prepending 'subject typed by human' and committing with --cleanup=strip, %s = 'subject typed by human Keel-Precommit: skipped Feature: unknown Developer: h Agent: codex Session: unknown'. Code: tools/gate/hook.ts insertTrailers (line 137).
