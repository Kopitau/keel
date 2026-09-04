---
id: ISS-079
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/hook.ts (verify-if-stale); .githooks/pre-push; tests/chg016-audit-round2.test.ts"
feature: "F17"
fingerprint: "pre-push-reruns-fresh-verify"
ac: ""
source: user
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-079 推送钩子在证据已经新鲜时仍重跑全量验证，HTTPS 推送因此超时断开

## 现象

2026-09-04 首次把 keel 推到 GitHub：`git push -u origin master` 先跑推送钩子——`gate verify`（300 多条测试，三四分钟）再 `gate check`——钩子全部通过后 git 写传输管道报 `fatal: write error: Bad file descriptor` / `the remote end hung up unexpectedly`，推送失败；Bash 与 PowerShell 各试一次相同。此前几分钟刚在同一棵树上跑过 verify，verify.json 新鲜且绿。

## 影响

任何测试套件跑得慢的项目都推不上 GitHub（连接在钩子期间空闲超时）；而重跑的那一遍验证不产生任何新信息。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前「verify-if-stale」子命令不存在、钩子无条件重跑；修复后同树新鲜证据直接放行。）

## 待诊断防线

已诊断，见下。

## 根因

`.githooks/pre-push` 无条件调用 `gate verify`；C-33 要的是"这棵树有新鲜的绿证据"，不是"推送前再跑一遍"。

## 修复

新增 `gate hook verify-if-stale`：`evidenceVerdict` 对当前树成立（新鲜、绿、树哈希一致、不脏）就打印「evidence fresh … not rerun」放行，否则才跑 `gate verify`；推送钩子改调它。`gate check` 照旧。

## 为何未被更早发现

keel 此前从未推送过远端（CI 六格矩阵一次没跑）；两个试点的推送也都没做。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：ISS-079 pre-push reuses fresh evidence；需求条目留到下一版需求，v8 已冻结不改）：证据新鲜 → 不重跑；证据过期 → 跑 verify。
