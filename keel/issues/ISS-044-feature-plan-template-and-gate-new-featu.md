---
id: ISS-044
status: open
defense_kind: "门禁 + 回归测试（待修）"
defense_pointer: ""
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
```

`tools/gate/trace.ts` 的 `claimedReqs()` 只从 `features/*/plan/*.md` 前言的 `req:` 行取
「已宣称完成」的 REQ。模板与脚手架都不写这一行；本仓 24 个功能计划的 `req:` 全是手工补的。
zhaoxi F0 写下 summary.md 之后，X-trace 会打印 `PASS no claimed-done features`——
C-32「零引用=门禁不过」在第一个真实项目里不绑定；DEC-168 的黑盒/代理判据同样要先绑定才生效。
现在 zhaoxi 的九条 REQ「全覆盖」只是 `gate trace` 的自愿矩阵，不是门禁。

## 根因

脚手架与判据各写各的：X-trace（W2/P0，ISS-003）发明了 `req:` 字段，`feature-plan.md` 模板与
`new.ts` 从未跟进——写判据时本仓计划已是手写，没人靠脚手架产出过一份带 `req:` 的计划。

## 修复

（待做，另起实施）

1. `keel/templates/feature-plan.md` 前言加 `req: [REQ-000]`；`claimedReqs()` 同时接受单值与数组。
2. `gate new feature` 写入该行（值留空由人填）。
3. 判据补一条：功能目录有 summary.md 而其 plan 无 `req:` → X-trace FAIL「claimed feature without req:」，
   不再静默 PASS——只改模板管不到已存在的消费项目计划。
4. 回归测试：脚手架产物含 `req:`；无 `req:` 的已宣称功能 FAIL；本仓正样本仍绿。

## 为何未被更早发现

本仓所有计划手写且都有 `req:`，X-trace 的「no claimed-done features」PASS 与「真的没有」
长得一样（ISS-037 同类：空即合规）。2026-08-26 审读 zhaoxi F0 测试时才对照到。

## 闭环选择与理由

门禁（修复第 3 条）+ 回归测试。只改模板不够——存量消费项目的计划不会自动长出 `req:`，
门禁必须把「宣称完成却无 `req:`」当作 FAIL 才能覆盖存量。可能复发（下一个模板字段再漏写），
由回归测试钉住。修复落地后在此补 `defense_pointer` 并关闭。
