---
id: ISS-051
status: closed
defense_kind: "回归测试"
defense_pointer: "tests/w1-skeleton.test.ts"
feature: "F4"
fingerprint: "current-index-version-hardcode"
date: 2026-08-28
---

# ISS-051 plan-index-current-version-hardcode

## 现象

复现命令：

```
node tools/gate/gate.ts verify
```

plan INDEX 合法切到 `overview-v3.md` 后，213 项中 1 项失败：测试名只承诺“唯一 current pointer”，断言却写死 `overview-v2.md`。

## 根因

W1 测试把两件事混在一起：真正不变量是“恰好一个 current、文件名合法、目标存在”；当时的具体版本 v2 只是样本值，却被固化进断言。

## 修复

保留同一黑盒测试名，改为检查：current 行恰好一条、值匹配 `overview-vN.md`、被指向文件存在且标题是同版本总览。以后正常 CHG 升版不再要求修改测试常量。

## 为何未被更早发现

ISS-050 曾修过 requirements current 从 v3→v4 的硬编码，但防线只覆盖那一个测试，没有审计同文件内 plan INDEX 的同指纹断言。本次 overview v3 首次切换才触发。

## 闭环选择与理由

选择升级回归测试：原测试已位于最高可用的仓库黑盒缝，只需把偶然常量提升为版本无关不变量。无需改 gate 或新增规则；`gate index`/G-plan 已负责 current 语义，重复一套门禁只会增加漂移面。

同指纹复发说明 ISS-050 的点修防线范围过窄；本次将 plan current 断言泛化，不再逐版本改常量。

可能复发的不许只留档。

## 关闭证据

- 红灯：2026-08-28 `node tools/gate/gate.ts verify` → exit 1，212 passed / 1 failed，唯一失败为 plan current 仍期待 overview-v2。
- 绿灯：`node --test tests/w1-skeleton.test.ts` → exit 0，12 passed / 0 failed；同一测试现在接受合法未来版本并仍拒绝多 current、非法文件名或缺失目标。
