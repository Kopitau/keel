# worklog — F12 f12-handoff

## 2026-08-21

- 进度：W1 开工。切片：keel/handoff.md + journal 目录 + status 桩打印路径
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W5）

- 进度：冒烟里写 handoff 五段，再用 status 打印路径做接力读取。

## 2026-08-28（P5）

- 进度：新增 handoff 固定五段模板；journal 增加跨 harness 恢复演练字段（名称/版本/日期/三跳路径/下一步/转录/tree hash），status 路径与计数有黑盒。未改用户在途 `keel/handoff.md`；真实异构恢复演练未执行，AC-3 保留 proxy。定向 P5：52 passed / 0 failed。

## 2026-08-29（CHG-011 Q4 handoff ≤ 10 行）

- 进度：handoff 模板与 journal 模板删除；`keel/handoff.md` 改为 3 行指针（下一步 / 该读 / 阻塞）；跨 harness 恢复演练的人工证据改记在功能 worklog。黑盒 `tests/chg010-handoff.test.ts` REQ-012/AC-1 改验「≤ 10 行且含仓库路径」，AC-3 保持 proxy。

## 2026-09-01（CHG-014 S2：ISS-060 / REQ-012/AC-5 `gate status` 的 next 行）

- 进度：`status.ts` 的 `next:` 改为按项目状态四选一（无基线 → run k-new；有基线无规划 → finish k-new step 4；有前沿 → start Fnn；全部 summary → k-review 再 k-accept；只剩被阻塞 → 列 blocker）。fmea-v3 在 Cursor 里被"no unblocked feature left — plan-level review"误导的那一幕不会再发生。
- 证据：`tests/chg014-status.test.ts` `ISS-060 …`、`REQ-012/AC-5 …`；`node --test` **260/260**；`npx tsc --noEmit` 干净；本仓 `gate status` 第四行现为 `next: start F1 (frontier); then read …`。

## 2026-09-01（评审第 1 轮：ISS-065，ISS-060 复发）

- next 行识别已认领（claim.json）功能：「claimed and in progress: Fnn — continue in its worktree or release the claim」。见 F7 worklog 同日节。
