# 交接 — DEC-168 黑盒/白盒判据已落地（未提交）

- date: 2026-08-26
- 本段：两仓测试审读 → 用户「应该按照黑白盒原理来进行测试吧」→ DEC-168（用户「A」）→ trace 判据、技能、术语、存量测试整改全部落盘，**工作树未提交**

## 状态

| | |
|---|---|
| 需求 | 28 条（gap-hunt-v3 的 6 条严重发现仍**待处置**） |
| 决策 | 168 条（DEC-168 confirmed，含原话「A」） |
| 问题条目 | 44 条（open：ISS-036、**ISS-044**） |
| 测试 | **187 全绿**（179 − 4 占位 + 12 新增；`tests/dec168-test-kinds.test.ts`） |
| 门禁 | `check --quick` → `PASS_WITH_WARN`（唯一 WARN = X-trace 的 REQ-017/AC-3 `[proxy]`，按设计）；full check 见下 |
| 证据 | `gate verify` exit 0，passed=187，tree `5cd0caa2…`，dirty=true |

## 本轮做了什么 / 为什么（DEC-168）

审读结论：标准（C-32/34/35/37/38）为功能而写，执行器只认字符串——本仓 `REQ-017/AC-1..4` 四条占位、zhaoxi F0 六条代理测试都是「白盒测试挂黑盒的名」。落地：

1. **`trace.ts`**：只从**测试名**取标记（JS/TS 复用 `parseTestInventory`，Python 取 `def test_`/`@pytest.mark` 行）；注释与 fixture 字符串不算覆盖；`[proxy:<解除条件>]` 记 WARN 不记 PASS；`ISS-`/`DEC-`/`fp:` 开头的名挂 AC 记 WARN（本版仍计覆盖，升 FAIL 另出 DEC）；`gate trace` 加 proxy 列。
2. **`CheckItem.acknowledged`**（result.ts / check.ts）：理由已在工件里的 WARN 不被 C-103 升为 FAIL（X-trace 在 NO_WAIVE 里，否则 proxy 会挡提交）。
3. **`k-impl` 第 4 条**改为四类命名（黑盒验收 / 白盒回归 / `I-nn` 契约 / `[proxy]` 替身）；CONTEXT.md 加三条术语；DESIGN §5 **不原地改**（C-24），规则由 DEC-168 承载。
4. **存量整改**（C-34: ref=DEC-168，见 f06-evidence worklog）：删 r2 四条占位；REQ-017 的 AC-1/AC-2 各补真黑盒测试（拷到仓库外无 node_modules 跑 `gate status`；假 node 20 让启动器拒绝；FAIL/WARN/PASS 三态 + fix 行 + C-103 放行）；AC-4 三条改名；AC-3 标 `[proxy]`；I-16/I-17/I-18 契约测试补齐。
5. **ISS-044 open**：`feature-plan.md` 模板与 `gate new feature` 不生成 `req:`，`claimedReqs()` 对消费项目永远为空——X-trace（含 DEC-168 判据）对 zhaoxi 从不绑定。修法已写在 ISS 里，未实施。

## full check 当前项

- `G-done` / `G-merge` / `X-evidence`：dirty working tree（本轮未提交；提交后重跑 verify 即清）
- `G-retro`：ISS-036、ISS-044 open
- `X-trace` WARN：REQ-017/AC-3 proxy（CI 从未跑过且 AC 不可本地验收，应回 k-grill 改写 AC）

## 下一步候选（按价值排序）

1. **提交本轮**（用户指示后；触碰 `tools/gate/` → pre-commit 会跑全量测试，约 3 分钟）。
2. **ISS-044 实施**：模板/脚手架加 `req:`；有 summary 无 `req:` → X-trace FAIL；回归测试。不做则 DEC-168 对 zhaoxi 无效。
3. **zhaoxi 迁移**：六条代理测试加 `[proxy:…]` 或改名（REQ-002/AC-2、REQ-005/AC-1、REQ-006/AC-1、REQ-004/AC-1 → proxy；REQ-002/AC-3、REQ-007/AC-1 → 真验收或降白盒名）；F0 plan 补 `req:`；3 份 RES 补 oss 表态；APR-001/002 补 `delegated:`。
4. REQ-017/AC-3 回 k-grill 改写成可本地验收的 AC，或接受常驻 WARN。
5. gap-hunt-v3 的 6 条严重发现处置（需用户逐条拍板）；push 远端让 CI 首跑（gate.sh 分支的启动器测试只在 POSIX 跑）；ISS-036 闭环。

## 未决问题

- 白盒名挂 AC 何时从 WARN 升 FAIL（DEC-168 复审条款：另出 DEC）。
- `[proxy]` 是否也该在 G-done 阻塞（现版：计入覆盖，只在 X-trace 亮 WARN）。

## 该读文件

- `keel/decisions/DEC-168-test-kinds-black-box-acceptance-vs-white.md` —— 本轮决策（含两仓证据表与落地形状）
- `keel/features/f06-evidence/worklog.md` 2026-08-26 段 —— 实现细节、C-34 引用、证据
- `keel/issues/ISS-044-*.md` —— 前置缺陷与修法
- `tests/dec168-test-kinds.test.ts` —— 判据守卫 + REQ-017 黑盒验收
- `keel/changes/CHG-009-field-hardening.md`、`keel/requirements/gap-hunt-v3.md` —— 上轮遗留
