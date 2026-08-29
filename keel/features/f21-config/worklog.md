# worklog — F21 f21-config

## 2026-08-21

- 进度：W1 开工。切片：config.json + CONTEXT.md + 画像字段
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-28（P5）

- 进度：补语言/术语/node:test+tsc/消费画像/notebook 边界/config 五条逐 AC 黑盒。profile selector 对字符串、缺失目标和当前尚不支持的多 active 值 fail closed，不再静默用默认 `node --test`；`_comment` 继续忽略。定向 P5：52 passed / 0 failed。

## 2026-08-29（CHG-011 Q6 config 去掉死开关）

- 进度：`keel/config.json`、`keel/templates/config.json`、`keel init` 写出的干净 config 去掉 `budget` / `oss_review_days` / `knowledge_cap` / `rules_area_cap`（对应检查已删，parser 从不读取）；`keel_version` 0.9.0。`tests/w1-skeleton` / `chg010-config` 的必需键清单同步去掉 `budget`。
