---
id: ISS-074
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/ctx.ts; tools/gate/verify.ts; tsconfig.json (exactOptionalPropertyTypes); tools/cli/update.js (manifest); tests/chg016-audit-round2.test.ts"
feature: "F23"
fingerprint: "local-patch-overwritten-silently"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-074 受管的门禁代码被试点本地修改（两个真 bug），下次更新会静默覆盖

## 现象

zhaoxi 合入 keel 0.10 后 `pnpm typecheck` 报 `tools/gate/ctx.ts(20,3): error TS2375`（项目开着 `exactOptionalPropertyTypes`），agent 直接改了 `ctx.ts`（ISS-047）；又把自己的锁文件摘要补丁（DEC-028，约 190 行）重新打回 `reviewloop.ts`。这两处在下一次 `keel update` 时都会被覆盖，ISS-047 的防线指针指向会消失的文件。

## 影响

消费项目的 tsc 因 keel 自己的类型写法失败；本地修的 keel bug 没有回流通道，更新即回退。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

keel 的 tsconfig 没开 `exactOptionalPropertyTypes`（消费项目会用自己的 tsconfig 编译 tools/gate）；更新器不知道上一次装的是什么，分不清「上游改了」和「本地改了」。

## 修复

keel 打开 `exactOptionalPropertyTypes` 并修掉 `ctx.ts` / `verify.ts` 两处；更新器每次写 `keel/installed.json`（受管文件哈希），下一次预览把与已装副本不同的文件标为 `LOCAL PATCH`；锁文件摘要收编为 `review.lockfile_summary: deltas`。

## 为何未被更早发现

keel 自己编译通过；消费项目更严格的编译选项只在合并进它们的仓库时才生效。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-025/AC-11 … names a local patch before overwriting it）。
