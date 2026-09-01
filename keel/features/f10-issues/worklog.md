# worklog — F10 f10-issues

## 2026-08-28（ISS-052 / review pack 暂存差异重复）

- 现场复现：最终实现差异的 `git diff --cached` 为 340149 字符、117 个路径；`gate loop pack --feature f17-gate --implementer openai-codex --reviewer deepseek-via-opencode` 却以 `diff exceeds 400000 bytes` 退出 1。
- 初始假设：`buildPack` 同时使用 `git diff HEAD` 与 `git diff --cached`；前者已经包含暂存变化，后者又追加一次，导致 staged-only 差异被双计。先以 ISS-052 回归测试固定“低于上限的 staged diff 只能出现一次”，再做最小修复。
- 红灯：原集成回归以 `pack field 'diff' exceeds 400000 bytes (ISS-028)` 失败；根因假设成立。
- 修复与绿灯：`PACK_DIFF_ARGS = [["diff"], ["diff", "--cached"]]`；ISS-052 快速防线 1/1，`chg008-review` 14/14，`chg010-review-loop` 6/6。
- 防线：`tests/chg008-review.test.ts`；ISS-052 已补齐根因、修复、为何漏测与关闭理由。
- C-34: ref=ISS-052 added one regression name (grow baseline)

## 2026-08-28（P2 / iss-v2 生命周期门禁）

- 红灯：`tests/chg010-issues.test.ts` 初跑 1/5；旧 gate 没有 `G-issues`，关闭字段、防线指针、同指纹升级都无人读取。
- 实现：新模板标记 `schema: iss-v2`；`G-issues` 对新记录检查打开态最小字段、关闭态五项、现存 defense_pointer、同指纹解释/升级与第三次 F13 候选。51 份旧 ISS 保持只读，不倒填事故当时不存在的诊断。
- 证据：状态机文件 5/5；P2 相关回归 110/110；本地全量 237/237；真实仓 quick 的 `G-issues` PASS（0 个 v2、51 个 legacy readable）。
- C-34: ref=DEC-178 added iss-v2 lifecycle acceptance tests (grow baseline)

## 2026-08-28（P2 / blocking ISS 打开态攻击探针）

- 进度：复用 F7 的 `gate loop ingest` 唯一写入端，落实 REQ-010/AC-2 的 0/非0/缺命令正反向：仅首次退出 0 开 blocking ISS；非0或缺命令只写待核实 worklog。
- 打开态证据：新 ISS 保存同一复现命令，并记录首次探针 exit/time/tree hash；clear 后续仍执行 ISS 中同一命令。
- 测试：`tests/chg010-review-loop.test.ts` 三条同时标记 REQ-010/AC-2 与 REQ-027/AC-4；红 3/5 后绿 5/5。
- C-34: ref=DEC-182 shared F7/F10 acceptance names added (grow baseline)

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W2/W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W2）

- 进度：`gate new iss <title>` 分配 ISS-nnn 并复制模板。status 统计 open issues。

## 2026-08-21（W5）

- 进度：冒烟先让 greet 断言红灯，开 ISS，再修回绿灯。

## 2026-08-29（CHG-011 Q5）

- 进度：ISS-021 防线由测试名基线改为 X-trace（宣称完成时缺测即红）+ 方案级评审 spec 轴，备注已追加；ISS-036 2026-08-28 已关闭，方案级 findings / disposition 沿用追加语义；ISS-026 备注 rounds.json 作废。G-issues 删除后 ISS 字段由 k-log 技能约束。

## 2026-08-29（ISS-054，CHG-011 Q7 首轮）

- 现象：Codex 异构评审的 4 条 blocking 探针在 Windows 经 cmd.exe 全部 SyntaxError 退出 1，被记「待核实」，回路误判 passed。
- 修复：`runReproCommand` 统一 `sh -c`（`probeShell()` 在 Windows 用 `where sh`）；ingest 有待核实 blocking → `in_review`，clear 拒绝直到新一轮。红灯：无补丁时 `tests/iss054-probe-shell.test.ts` 不能加载（probeShell 不存在），行为红灯见 findings.md 第 1 轮输出；修复后 2/2 绿。ISS-054 关闭。

## 2026-09-01（CHG-014 S6：复发链共享熔断计数）

- 进度：ISS 前言 `recurrence_of` 现在被 `gate loop clear` 读取：链上所有 ISS 共用链根的 fingerprint 作 `rounds_on` 键（DEC-189）。k-log 已要求复发必填 `recurrence_of`，这条字段从"审计线索"变成"机器输入"。评审 Finding 也可直接带 `recurrence_of`，ingest 写入新 ISS。见 F7 worklog 同日节。
