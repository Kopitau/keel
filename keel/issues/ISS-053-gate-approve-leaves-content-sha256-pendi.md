---
id: ISS-053
schema: iss-v2
status: closed
defense_kind: "回归测试 + 门禁 fail-closed（找不到哈希行即拒绝）"
defense_pointer: "tests/iss053-approve-quoted-path.test.ts"
feature: "F18"
fingerprint: "approve-quoted-path-hash-pending"
source: "本仓 APR-004 审批时实测；消费项目 zhaoxi 于 2026-08-25 先报为其 ISS-002（上游未修）"
recurrence_of: "zhaoxi ISS-002（同一缺陷，跨仓库）"
prior_defense_failure: "zhaoxi 把它记为『上游 keel 的问题，本仓不改』并用会话暂存目录里的脚本手工回填；上游没有收到 ISS，也没有回归测试"
defense_escalation: "从『消费项目手工绕过』升为上游回归测试 + approve 找不到哈希行时拒绝（不再静默把无哈希的 APR 标成 approved）"
date: 2026-08-29
---

# ISS-053 `gate approve` 在工件 `path:` 带引号时把哈希留成 pending

## 现象

`gate approve APR-004` 输出 `approved APR-004 as kopit`、`status: approved`，但两条工件的 `content_sha256` 仍是 `pending`。审批文件被标成已批准，却没有绑任何哈希——C-106 的哈希绑定形同虚设。

## 影响

复现命令：

```
node --test tests/iss053-approve-quoted-path.test.ts     # 修复前：quoted 那条 not ok，unquoted 对照 ok
```

影响面：所有按模板写 `path: "…"`（模板示例就是带引号的）的 APR。本仓 APR-002/003 是另一会话手工回填的；zhaoxi APR-001/002 同样靠手工脚本回填。

## 根因

`approve.ts` 里 `artifactPaths()` 解析路径时会去引号，但回填哈希的正则写死为 `path:\s+<path>`，遇到 `path: "<path>"` 不匹配；`if (block.test(next))` 不匹配时静默跳过，于是状态照样翻成 approved。

## 修复

- 正则允许可选引号：`path:\s+"?<path>"?`。
- 找不到该工件的 `content_sha256` 行时返回失败（fail-closed），不再静默。
- 红灯：修复前 quoted 用例 not ok（对照 unquoted ok）；修复后 2/2；`git stash` 掉修复再跑 → 回红；还原 → 绿。
- APR-004 以 kopit 身份重新 `approve` 回填两条哈希并提交（委托原话在 APR `delegated:`）。

## 为何未被更早发现

本仓此前的 APR 都由另一会话手工回填哈希，掩盖了缺陷；zhaoxi 报了 ISS-002 但按"消费项目不改上游"记成 wontfix，上游没有对应 ISS。审批门禁（X-apr）只查作者与委托，不查哈希是否为 pending。

## 闭环选择与理由

回归测试 + fail-closed。不选"只修正则"：那样下一个未覆盖的写法又会静默放过。X-apr 是否应额外拒绝 `content_sha256: pending` 的 approved APR，留到 CHG-011 实现时在保留的 8 条门禁里一并处理（记在 CHG-011 影响评估）。
