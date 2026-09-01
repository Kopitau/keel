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

## 2026-09-01（CHG-014 S5：DEC-188 测试命令白名单改形状）

- 进度：`testcmd.ts` 重写为 `parseTestCommand`（启动器前缀表 → 程序 pytest / `vitest run` / jest / `node --test` → 参数逐个核：marker/report 类放行，`-k` `-t` `--test-name-pattern` `--testPathPattern` `--lf` 等 narrowing 一律拒，任何位置参数与带 `/` `\` `::` `.py` `.ts` 的值都当路径拒）；`profileFamilies` 让 python-cli / ds-ml 只跑 python 程序、ts-js 只跑 node 程序、`other` 不限；`keel-gate` 保持 ISS-018 字面：只能是 `node --test`。`allowedTestCommandReason` 给出可读拒绝理由，`verify` 把它打到 stderr。
- 进度：`expandTestArgv` 统一给 node:test / pytest / vitest 补 junit 输出（项目已声明输出位置则不动）；`verify.ts` 用它替换原来只认 node 的展开。模板 `config.json` 加 DEC-188 说明与 `ts-js` 画像示例。
- 证据：`tests/chg014-testcmd.test.ts` `REQ-021/AC-6` ×3（13 条放行、19 条拒绝、junit 展开幂等）；旧的 p0 / r2 / w1 白名单测试不改仍绿；`node --test` **254/254**；`npx tsc --noEmit` 干净；模板 JSON 可解析。

## 2026-09-01（评审第 1 轮：ISS-063）

- 白名单删 `-o`（ini 覆盖可改 addopts / testpaths）；`-p` 只许 `no:<plugin>`、`-m` 只许标记表达式、`-W` 只许过滤器、reporter 只许内置名。见 F7 worklog 同日节。
