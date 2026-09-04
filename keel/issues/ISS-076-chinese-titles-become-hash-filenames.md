---
id: ISS-076
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/ids.ts (asciiSlug); new.ts (--slug); reviewloop.ts (fingerprint slug); tests/chg016-audit-round2.test.ts"
feature: "F10"
fingerprint: "ascii-slug-drops-cjk"
ac: ""
source: audit
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-04
---

# ISS-076 中文标题的记录文件名退化成哈希，截断还会留下尾横线

## 现象

zhaoxi 评审开的问题单叫 `ISS-036-z-67f8cb9b.md`、`ISS-032-z-a8d35d7e.md`，agent 只能 `rg --files | rg ISS-03[2-6]` 找；`DEC-023-f6-activity-stream-and-typed-withdrawal-.md` 以横线结尾。

## 影响

记录按规则用中文标题（C-124），所以这是常态：目录里一排哈希名，导航靠搜索。

复现命令：

```
node --test tests/chg016-audit-round2.test.ts
```

（DEC-191：修复前该测试失败，修复后通过。）

## 待诊断防线

已诊断，见下。

## 根因

`asciiSlug` 删掉所有非 ASCII 后回退 `z-<sha8>`；先去尾横线再截断。

## 修复

`gate new … --slug <ascii>`；评审回路开单用 finding 的 fingerprint 做文件名；先截断再去尾横线。

## 为何未被更早发现

keel 自己的记录标题多带英文关键词，很少整句中文。

## 闭环选择与理由

回归测试（`tests/chg016-audit-round2.test.ts`：REQ-010/AC-7 a Chinese title gets a readable file name via --slug, and a cut slug never ends in a hyphen）。
