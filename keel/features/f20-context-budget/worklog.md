# worklog — F20 f20-context-budget

## 2026-08-21

- 进度：W1 开工。切片：初值写入 config + AGENTS 守 150 行 + 硬限档案
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-21（W2）

- 进度：`gate check` 含 X-budget：超软预算警告、超 32KiB 硬限失败、CLAUDE.md 必须是 `@AGENTS.md`。
