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

## 2026-09-01（CHG-014 补：REQ-012/AC-6 每轮回复以「下一步」收尾）

- 用户："每次一轮对话结束，但是没有推荐下一步的动作。应该修改。" AGENTS.md 加「Turn end」节（每轮回复最后一段 `下一步：` 一条推荐动作 + 只有用户能定的事；不得以状态堆 / 表格 / 开放选项收尾），k-handoff 补一句，v6 REQ-012 增 AC-6（machine-doc），`tests/chg014-docs.test.ts` 守住 AGENTS.md 与技能文本。根指令在 Codex / Cursor 也原生装载，所以规则跨 harness 生效；`gate status` 的 `next:` 行是它的机器来源。
- 追加：用户同轮补充"对于工作和下一步经常很简短，应该要让人可以更清晰的知道情况，不能只有代码缩写介绍"。AGENTS.md「Turn end」改为四段式收尾（做了什么及为何重要 / 现在状态 / 还剩什么 / 下一步），编号与门禁名只能作括号补充；v6 AC-6、k-handoff、RELEASE-0.9.2、docs 测试同步。

## 2026-09-04（CHG-016：状态行）

- `status.ts`：proposed 且未绑定的基线 → `next:` 说 finish k-new step 5；`missing:` 把替身清单折叠成计数、人类身份为空时点名。证据：REQ-012/AC-7、REQ-026/AC-5。
