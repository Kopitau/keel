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

## 2026-08-29（APR-005：需求 v5 + 规划 overview-v4 整体确认）

- 用户原话「1 同意 以我的身份提交 2 升级由你去跑」记入 `delegated:`；v5 / overview-v4 状态行改 confirmed 后 `gate approve APR-005`（正文哈希 c10a61c6… / 83f36a34…），以 kopit 身份提交 55e73c2，pre-commit-apr ok，提交后 git 身份恢复 keel-agent。这是正文哈希审批的首次实际使用。

## 2026-09-01（CHG-014 S3：DEC-185 冻结件漂移进 X-apr）

- 进度：`changechain.ts` 新增 `inspectApprovedArtifacts`（对每份 approved APR 引用的工件重算正文哈希；旧全文哈希在文件未动时仍接受；`pending`/空哈希留给原有检查）、`approvalBinding`、`declaredStatusOf` / `declaresConfirmed`、`isPlanArtifact`。X-apr：工件缺失 → FAIL（不可 waiver）；正文漂移 → WARN 带 `waivers`，按 APR 逐条 `gate-warn: X-apr ref=APR-nnn` 放行，否则升 FAIL（C-103 既有机制）。
- 本仓落地：CHG-011 Q5 追加复核记录的 10 个 DEC（APR-002 ×5、APR-003 ×5）首次被报出；F3 worklog 写两行 waiver，X-apr 现为 WARN（已认可）。
- 证据：`tests/chg014-frozen-artifacts.test.ts` `REQ-018/AC-7`（漂移 FAIL → waiver 后 WARN → 缺失 FAIL）；`node --test` **249/249**；`npx tsc --noEmit` 干净；本仓 `gate check --all`：G-req PASS、G-plan PASS、X-apr WARN（waived）。
