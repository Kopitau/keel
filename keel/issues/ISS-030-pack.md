---
id: ISS-030
status: closed
defense_kind: "门禁逻辑修订+回归测试"
defense_pointer: "tests/r5-rework.test.ts (ISS-030); tools/gate/reviewloop.ts collectChangedPaths; .gitignore"
feature: f07-review
fingerprint: "c787327cb9fbf055"
date: 2026-08-25
---

# ISS-030 pack 的回退判定被回路自身产物堵死，提交后评审拿到空包且视角降级

## 现象

复现命令：

```
node -e "const s=require('fs').readFileSync('tools/gate/reviewloop.ts','utf8');const i=s.indexOf('names.size === 0');const j=s.indexOf('LOOP_ARTIFACT_RE.test');process.exit(i>0&&j>i?0:1)"
```

## 根因

## 修复

## 为何未被更早发现

## 闭环选择与理由

**回归测试**：提交后工作区只剩 `pack.json`/`state.json` 时，`collectChangedPaths` 必须回退到 HEAD 改动并把视角判为 attack（生产路径 `gate loop pack`）。

落地：过滤提前到 `names.size === 0` 之前；loop 产物写入 `.gitignore`。Guard：`tests/r5-rework.test.ts` ISS-030。


`collectChangedPaths`（reviewloop.ts:120-135）先把工作区/暂存/**未跟踪**文件塞进 names，再判 `if (names.size === 0)` 决定是否回退到 `diff-tree HEAD`，**最后才用 LOOP_ARTIFACT_RE 过滤**。而 `keel/review/pack.json` 与 `state.json` 未跟踪也未 gitignore —— 跑过一次 pack 之后它们必然出现在 `ls-files --others` 里，使 names 非空、回退被跳过，过滤后剩 0 个文件。

后果：**评审者在实现方提交之后到场（独立评审的正常场景）时，pack 的 diff 为空、files=0，视角恒定降到最弱的 requirements、het_required 恒为 false。ISS-024 的「视角由改动推导」在这个场景里被完全抵消。**

实测（真仓库）：`loop pack` → `lens=requirements het_required=false files=1`（唯一那个文件是评审者自己的未跟踪报告）；把该报告移走后 → `files=0`，仍是 requirements。而 R4 实际改了 45 个文件、含多个 `tools/gate/*.ts`，本应判 attack + 强制异构。

修法方向：① 过滤提前到回退判定之前；② 把 loop 产物加进 .gitignore；③ 回退不应只在「全空」时触发，而应在「过滤后为空」时触发。三者可叠加。
