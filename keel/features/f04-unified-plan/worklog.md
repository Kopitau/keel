# worklog — F4 f04-unified-plan

## 2026-08-21

- 进度：W1 开工。切片：overview-v1 + 23 份小规划 + INDEX
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-27（RES-904 借鉴：计划模板）

- 进度：`feature-plan.md` 前言加 `blocked_by: []`（DEC-169）；"测试义务"加"缝"表（REQ/AC → 黑盒测试挂在哪 → 真验收 / proxy 至 Fnn，RES-904 §6）；"内部步骤"改为切片（单上下文装得下、可独立演示、纵向贯穿，每步带 `verify:`，RES-904 §5）；"依赖"节说明 `blocked_by`。
- 实现决定：切片与缝只进模板与 k-impl 文字，不加门禁——先在下一个功能上用一遍再决定要不要 X-trace 对账 proxy 注记与缝表。