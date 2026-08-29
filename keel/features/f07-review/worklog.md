# worklog — F7 f07-review

## 2026-08-28（P2 / 六 harness headless 配方）

- 红灯：`tests/chg010-headless.test.ts` 3/3 因仓库没有 `keel/review/headless.md`、k-review 没有共同 Finding schema 而失败。
- 调研：RES-905/906/907 分别只用 OpenCode/xAI、Anthropic/OpenAI、DeepSeek/Pi 官方资料与本地 `--help`；没有调用计费模型。命令面与未核实 live 边界分开记录。
- 实现：配方页逐家写 command/input/output/success/source/date，统一五键 pack 与含 `impact` 的 Finding[]；所有失败均 stop，禁止 same-harness fallback；Pi 用独立 `-p --no-session` 顺序新进程。
- 证据：headless machine-doc 3/3；P2 相关回归 110/110；本地全量 237/237。真实模型/live harness 证据未运行，不能替代 REQ-016/AC-8 或 REQ-027/AC-3 的 manual evidence。
- C-34: ref=DEC-178 added headless recipe machine-doc acceptance tests (grow baseline)

## 2026-08-28（DEC-182 / ingest 攻击探针先验）

- 红灯：`tests/chg010-review-loop.test.ts` 新增 ingest 的退出 0、非 0、缺命令三路径后为 3/5；旧实现把任意非空命令直接开 ISS，退出 7 仍错误进入 repairing，正向 ISS 也没有首次实跑证据。
- 实现：`fileFindings` 在唯一 ISS 写入路径先执行攻击探针。只有退出 0 才创建/复用 blocking ISS；非 0 降级 worklog 待核实并保留命令、退出码、tree hash 与输出尾；缺命令保持原拒绝路径。
- 证据：正向 ISS 追加 `probe_exit_code`、`probe_recorded_at`、`probe_tree_hash`、`probe_result`；跨平台夹具用 `node ingest-probe.js` 避免 shell 引号差异。新增五条文件内测试 5/5。
- C-34: ref=DEC-182 added ingest 0/nonzero/missing-probe black-box paths (grow baseline)

## 2026-08-28（DEC-177 / ISS-036 追加式 clear 历史）

- 进度：`gate loop clear` 从覆盖本轮 `repro_runs` 改为追加每轮结果；新记录含 round/time/tree hash，无新命令的重复 clear 不抹除历史。passed 只看每个 ISS 的最新结果，旧漏洞态仍保留审计。
- 问题链接：DEC-177 DEC-182 ISS-036；防线 `tests/chg010-review-loop.test.ts`。
- C-34: ref=DEC-177 added append/stale end-to-end tests (grow baseline)

## 2026-08-25（R5 ISS-030~033）

- 进度：pack 回退先滤 loop 产物；clear 必写 review；advisory 通道；clear 拒绝 exit 1；`X-full` 落成 `--quick` 也会跑的检查。Guard：`tests/r5-rework.test.ts`。
- 问题链接：ISS-030 ISS-031 ISS-032 ISS-033
- C-34: ref=ISS-030 added r5-rework tests (grow baseline)

## 2026-08-25（R4 ISS-023~029）

- 进度：pack-first、tree_hash、真实路径 lens、`gate loop clear` 实跑复现、verify 保留 review、熔断指纹 + rounds.json、doctor 机器件、ATTACK_RE 补漏、plan/v2.md。Guard 在 `tests/r4-rework.test.ts`。
- 问题链接：ISS-023 ISS-024 ISS-025 ISS-026 ISS-027 ISS-028 ISS-029 CHG-008 DEC-159 DEC-160
- C-34: ref=ISS-028 renamed REQ-028/AC-3 (skills paths are attack-lens, not auxiliary)

## 2026-08-24（CHG-008）

- 进度：自动评审回路 `tools/gate/reviewloop.ts` + `gate loop`；三类清单在 `keel/review/`；k-review/k-impl/k-accept 已接 REQ-027/028。G-done 在有 summary 时要求 loop status=passed。异构在攻击面镜头强制，不得静默同源。
- 问题链接：CHG-008 DEC-159 DEC-160

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-29（CHG-011 Q3 评审改方案级）

- 进度：`reviewloop.ts` 改为一份规划一个回路：`loop pack [--base <rev>]` 打包 diff / 当前总览 / 需求 / 证据 / 各功能 worklog 最新一节；状态存 `keel/review/disposition.md` 前言，历史按轮追加成表；发现与去向写 `keel/review/findings.md`；`state.json` / `rounds.json` / `fuse-report.md` 删除（熔断报告追加进处置表）。ingest / clear 的 DEC-182 探针协议不变。
- 进度：G-done 读处置表——passed → PASS（树已变 → WARN 不升级）、repairing → WARN、fused → FAIL；处置表缺失时活动功能全有 summary → FAIL「评审未跑」，否则 PASS（施工中）。单功能完成不再触发评审。`gitWriteTree` 把 disposition / findings 从绑定树里剔除，回路写自己的记录不再「移动」树。
- 记录：ISS-023「回路 passed 后改树」由 FAIL 降为 WARN（证据新鲜度仍由 G-merge / CI 硬判）；ISS-026 的 rounds.json 守卫作废（备注写进 ISS-026）；旧 state.json 的一轮 passed 记录迁入 disposition.md（plan=overview-v3）。k-review 重写（≤ 80 行），k-impl「一切片一会话」改为自主回路。
- 证据：`npx tsc --noEmit` 0 错；`node --test` 227 passed / 0 failed；`gate check --quick` PASS_WITH_WARN（仅 REQ-017/AC-4 proxy）；新黑盒 `tests/chg011-plan-review.test.ts` 7 条（REQ-027/AC-1、AC-6、AC-10 ×4、REQ-007/AC-6）。
