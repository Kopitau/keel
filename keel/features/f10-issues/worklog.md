# worklog — F10 f10-issues

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
