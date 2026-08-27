---
id: ISS-044
status: closed
defense_kind: "门禁（X-trace 对无 req: 的已宣称功能 FAIL）+ 模板/脚手架 + 回归测试"
defense_pointer: "tests/iss044-claimed-req.test.ts"
feature: "F17"
fingerprint: "feature-plan-req-field-missing"
date: 2026-08-26
---

# ISS-044 feature-plan 模板与 `gate new feature` 不生成 `req:`，X-trace 对消费项目从不绑定

## 现象

复现命令：

```
grep -c '^req:' keel/templates/feature-plan.md        # 0
grep -n 'req' tools/gate/new.ts                         # 无输出
# 第一个真实消费项目：
grep -c '^req:' E:/program/zhaoxi/keel/features/f00-platform-base/plan/v1.md   # 0
# 用真脚手架复现（2026-08-27）：gate new feature demo → plan/v1.md 里 ^req: 计数 0；
# 写下 summary.md 后 check --quick → PASS X-trace  no claimed-done features
```

`tools/gate/trace.ts` 的 `claimedReqs()` 只从 `features/*/plan/*.md` 前言的 `req:` 行取
「已宣称完成」的 REQ。模板与脚手架都不写这一行；本仓 24 个功能计划的 `req:` 全是手工补的。
zhaoxi F0 写下 summary.md 之后，X-trace 会打印 `PASS no claimed-done features`——
C-32「零引用=门禁不过」在第一个真实项目里不绑定；DEC-168 的黑盒/代理判据同样要先绑定才生效。

## 根因

脚手架与判据各写各的：X-trace（W2/P0，ISS-003）发明了 `req:` 字段，`feature-plan.md` 模板与
`new.ts` 从未跟进——写判据时本仓计划已是手写，没人靠脚手架产出过一份带 `req:` 的计划。
而且「宣称完成却无 `req:`」与「什么都没宣称」在判据里长得一样（ISS-037 同类：空即合规）。

## 修复

1. `keel/templates/feature-plan.md` 前言加 `req: [REQ-000]`（占位符；留着不改在宣称完成时是
   未覆盖的 REQ-000，照样 FAIL）。`new.ts` 无模板时的兜底也写这一行。
2. `trace.ts`：`claimedReqs()` 接受单值与数组（`req: REQ-001` / `req: [REQ-001, REQ-002]`），
   取该行全部 REQ 编号；新增 `claimedWithoutReq()`——有 summary.md 而计划无任何 REQ 的功能。
3. `uncoveredClaimed()` 把这些功能作为 `<feature>: summary.md but plan has no req:` 列在最前，
   于是 X-trace / G-done / G-merge 一起 FAIL；`xTrace` 先算缺口再判「无宣称」，不再静默 PASS。
4. 回归测试 `tests/iss044-claimed-req.test.ts` 8 条：脚手架含 `req:`（有模板/无模板）；
   无 `req:` 的已宣称功能 FAIL 且点名；无 plan 目录同样 FAIL；未宣称的不管；列表/单值/多版本解析；
   占位 REQ-000 不算过；本仓正样本无违规。

红灯证据：修复前 `node --test tests/iss044-claimed-req.test.ts` 文件级失败（`claimedWithoutReq` 不存在）；
真脚手架产物 `^req:` 计数 0。修复后 8/8。突变验证（DEC-013/DEC-168）：
① stash 掉 trace.ts + check.ts → 文件级红；② stash 掉模板 + new.ts → 两条脚手架测试红；
③ 保留导出但让 `claimedWithoutReq` 恒返回空 → 无 `req:` / 无 plan 两条红。三次还原后 8/8。

## 为何未被更早发现

本仓所有计划手写且都有 `req:`，X-trace 的「no claimed-done features」PASS 与「真的没有」
长得一样。2026-08-26 审读 zhaoxi F0 测试时才对照到。

## 闭环选择与理由

门禁 + 模板/脚手架 + 回归测试。只改模板不够——存量消费项目的计划不会自动长出 `req:`，
门禁必须把「宣称完成却无 `req:`」当作 FAIL 才能覆盖存量（zhaoxi F0 升级 keel 后写 summary 即会被拦，
补一行 `req: [REQ-001, …]` 即合规）。可能复发（下一个模板字段再漏写），由回归测试钉住。

## 关闭

2026-08-27，防线指针 `tests/iss044-claimed-req.test.ts` 在盘。
