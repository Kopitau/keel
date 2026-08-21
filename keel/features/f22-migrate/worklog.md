# worklog — F22 f22-migrate

## 2026-08-21

- 进度：W1 开工。切片：Trellis/Superpowers 映射表 + 非结构化挖掘规则 + 本仓挖掘报告
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W4）

- 进度：`k-migrate` 技能指向 `keel/templates/migrate/` 映射表。语义映射仍由模型执行，gate 只做编号/索引。
