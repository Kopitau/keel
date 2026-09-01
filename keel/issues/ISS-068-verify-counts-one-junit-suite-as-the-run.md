---
id: ISS-068
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/evidence.ts (parseJunit); tests/iss068-junit-suites.test.ts"
feature: "F6"
fingerprint: "junit-first-suite-attr-taken-as-run-total"
source: pilot-cleanup
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-068 verify 把 junit 里第一个 `<testsuite>` 的 `tests=` 当成整场计数（zhaoxi 193 条只数到 5）

## 现象

2026-09-01 在 zhaoxi 主干跑 `gate verify`（keel 0.9.2）：node:test 自己汇总 193 条（189 过、2 败、2 跳），verify 却写 `counts: passed=5 failed=0 skipped=0`，verify.json 与验收快照（DEC-187）里的数字都会是 5。

## 影响

用 `describe()` 分组的 node:test 项目，证据里的通过数是第一组的大小而不是整场；文件级加载失败（bare `<testcase>` 带 `<failure>`）也不计入 failed。退出码仍来自测试进程，所以红的跑不会被放行，但"通过了多少"这条证据是假的，验收快照的 `evidence_passed` 跟着假；REQ-006/AC-10 按功能汇报证据时也引用这个数。keel 自己的测试不用 describe，所以本仓从未触发；pytest（单 suite）与 vitest（根元素带总数）不受影响。

## 复现命令

```
node "<scratch>/iss068-probe.mjs"
```

探针用 zhaoxi 那份 junit 的形状（根 `<testsuites>` 无总数属性 + 一个文件级失败的裸 `<testcase>` + 两个 `<testsuite tests=…>`，其中一个内嵌 suite 与一条 skipped）调用 `parseJunit`；算出 `passed=5` 即缺陷在，退出 0（DEC-182）。

## 待诊断防线

已诊断，见下。

## 根因

`parseJunit` 用 `xml.match(/\btests="(\d+)"/)` 取全文第一个 `tests=` 属性当整场总数。node:test 的 junit reporter 每个 `describe()` 写一个 `<testsuite tests="n">`，根 `<testsuites>` 不带总数，于是取到的是第一组的 n；文件级失败以裸 `<testcase>` 出现在任何 suite 之外，属性路径也数不到它。

## 修复

只认根元素 `<testsuites …>` 自己的属性（vitest 写在那里）；根上没有总数就逐个数元素：`<testcase>` 总数减去带 `<failure>` / `<error>` / `<skipped>` 子元素的。对 node:test（嵌套 suite、文件级失败）、pytest（单 suite）、vitest（根总数）三种形状各有一条断言。

## 为何未被更早发现

REQ-006 的 parseJunit 测试只给了"根元素带总数"和"裸 testcase + pass 注释"两种形状，没有"多 suite、根无总数"的形状；keel 自身 279 条测试不用 describe，verify 的数一直对。试点仓库的第一次 0.9.2 verify 才暴露。

## 闭环选择与理由

回归测试 `tests/iss068-junit-suites.test.ts`（ISS-068 ×2）：zhaoxi 形状必须得 `{passed:7, failed:1, skipped:1}`；pytest 与 vitest 形状保持原值。定向突变：把修复改回"全文第一个 tests="，第一条即红。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T10:11:02.821Z
- probe_tree_hash: 61cdb1e8b7eba10b4b92afb5f04ae524fe0578cf
- probe_result: vulnerable

探针在修复前的树上跑出 `passed=5 failed=0 skipped=0`（退出 0）；同一探针在修复后的树上退出 1（`passed=7 failed=1 skipped=1`），见 F6 worklog 2026-09-01 节。
