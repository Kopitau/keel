# worklog — F18 f18-approvals

## 2026-08-21

- 进度：W1 开工。切片：APR 模板 + 设计基线草稿（待人类身份提交）
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W2）

- 进度：`gate approve APR-nnn` 用规范化哈希填 APR；git 身份在 agent 清单内则拒绝（C-107）。不代人类 commit。

## 2026-08-28（P4 / 审批所有者）

- 进度：`X-owners` 在 github/gitee tier 只接受覆盖 `<records_dir>/approvals/` 的有效 CODEOWNERS 行；路径与 owner 必须同一行，注释、占位符和 config 中的 agent 身份不能充当审批人。local tier 仍明确 SKIP 为 documentation-only。
- 证据：缺文件、注释伪规则、拆行、占位符、agent 与真人 owner 正反向 fixture 全部通过（`tests/chg010-approvals.test.ts` 3/3）。

## 2026-08-29（ISS-053：approve 不认带引号的 path，哈希留 pending）

- 现象：APR-004 批准后 `content_sha256: pending`，状态却已 approved。zhaoxi 8-25 报过同一缺陷（其 ISS-002），上游一直没修。
- 修复：`approve.ts` 正则允许 `path: "…"`；找不到哈希行时拒绝（fail-closed）。红灯：修复前 quoted 用例 not ok；修复后 2/2；stash 掉修复回红；还原绿。
- APR-004 以 kopit 身份重新 approve，回填 CHG-011 / DEC-183 两条哈希，委托原话在 `delegated:`。
- 遗留（记进 CHG-011 影响评估）：X-apr 是否拒绝 `pending` 哈希的 approved APR，在保留的 8 条门禁里一并处理。

## 2026-08-29（CHG-011：审批哈希只算正文）

- 进度：`approve.ts` 写入 `sha256Body`（前言之外的规范化正文）；`changechain.ts` 同时接受正文哈希与旧全文哈希；正文不符降为 G-req WARN（worklog `gate-warn: G-req ref=APR-nnn` 放行），元数据改动不再作废审批。X-apr 拒绝 `pending` 哈希的 approved APR（ISS-053 遗留项闭环）。
- 证据：`tests/chg011-quick-gate.test.ts` REQ-011/AC-4、REQ-018/AC-1；`tests/r6-field-guards.test.ts` ISS-053 X-apr pending 用例。
