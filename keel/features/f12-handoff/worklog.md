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
