# 交接 — DEC-168 已提交；ISS-044 已修（未提交）

- date: 2026-08-27
- 本段：两仓测试审读 → DEC-168（用户「A」）落地并提交 `e33c0d7`（提交时首跑即中 ISS-045，同批闭环）→ 继续修 ISS-044，**工作树有未提交改动**

## 状态

| | |
|---|---|
| 需求 | 28 条（gap-hunt-v3 的 6 条严重发现仍**待处置**） |
| 决策 | 168 条（DEC-168 confirmed，含原话「A」） |
| 问题条目 | 45 条（open：仅 ISS-036；044/045 本轮闭环） |
| 测试 | **200 全绿**（dec168 12 条、iss045 5 条、iss044 8 条为本轮新增） |
| 门禁 | `check --quick` → `PASS_WITH_WARN`（唯一 WARN = X-trace 的 REQ-017/AC-3 `[proxy]`，按设计） |
| 已提交 | `e33c0d7` DEC-168 + ISS-045（hook 全量 192/192） |
| 未提交 | ISS-044 修复：模板 / `new.ts` / `trace.ts` / `check.ts` / 回归测试 / 基线 200 / ISS-044 / worklog / 本文件 |

## 本轮做了什么 / 为什么

1. **DEC-168**：X-trace 只数**测试名**上的黑盒标记；`[proxy:…]` 记 WARN 不记 PASS；`ISS-`/`DEC-`/`fp:` 开头的名挂 AC 记 WARN；`gate trace` 加 proxy 列；`k-impl` 第 4 条四类命名；CONTEXT 三条术语；存量整改（删 4 条占位、补 REQ-017 真黑盒、I-16/17/18 契约）。DESIGN §5 未原地改（C-24）。
2. **ISS-045**（提交时 hook 全量 185/187 暴露）：git 导出给 hook 的 `GIT_AUTHOR_*`/`GIT_COMMITTER_*` 让 fixture 提交冠上 keel-agent，X-apr 守卫因错误原因变红——KLES-002 同指纹第二次。修法上一级：`tests/fixtures/git-env.ts` 共享清洗模式（不再手写清单）+ hook `unset` 六变量 + 回归 5 条；突变 4 红。
3. **ISS-044**：模板与 `gate new feature` 不生成 `req:`，`claimedReqs()` 对消费项目永远为空。修：模板 `req: [REQ-000]`、`new.ts` 兜底、`claimedReqs` 读单值/数组、新增 `claimedWithoutReq` → 有 summary 无 REQ 的功能在 X-trace/G-done/G-merge 一律 FAIL 并点名；回归 8 条，突变三次红。

## full check 当前项

- `G-done` / `G-merge` / `X-evidence`：dirty working tree（提交后重跑 `verify` 即清）
- `G-retro`：ISS-036 open
- `X-trace` WARN：REQ-017/AC-3 proxy（CI 从未跑过且 AC 不可本地验收，应回 k-grill 改写 AC）

## 下一步候选（按价值排序）

1. **提交 ISS-044 批次**（用户指示后；触碰 `tools/gate/` → hook 跑全量，约 1.5 分钟）。
2. **zhaoxi 迁移**：升级 keel 后 F0 写 summary 会被 X-trace 拦——F0 plan 补 `req: [REQ-001, REQ-002, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009]`；六条代理测试加 `[proxy:…]` 或改名（REQ-002/AC-2、REQ-005/AC-1、REQ-006/AC-1、REQ-004/AC-1 → proxy；REQ-002/AC-3、REQ-007/AC-1 → 真验收或降白盒名）；3 份 RES 补 oss 表态；APR-001/002 补 `delegated:`。
3. REQ-017/AC-3 回 k-grill 改写成可本地验收的 AC，或接受常驻 WARN。
4. KLES-002（`~/.keel/knowledge/`）措辞从「GIT_DIR」扩为「git 导出给 hook 的全部变量」——用户库文件，待用户改。
5. gap-hunt-v3 的 6 条严重发现处置（需用户逐条拍板）；push 远端让 CI 首跑（`gate.sh` 分支的启动器测试只在 POSIX 跑）；ISS-036 闭环。

## 未决问题

- 白盒名挂 AC 何时从 WARN 升 FAIL（DEC-168 复审条款：另出 DEC）。
- `[proxy]` 是否也该在 G-done 阻塞（现版：计入覆盖，只在 X-trace 亮 WARN）。
- `gate.ts` 的 root 取自脚本所在仓库而非 cwd：在别的目录里调本仓 gate 会写进本仓（本轮误建过 `keel/features/f25-demo`，已删）。是设计还是缺陷，待定。

## 该读文件

- `keel/decisions/DEC-168-test-kinds-black-box-acceptance-vs-white.md` —— 决策（含两仓证据表与落地形状）
- `keel/features/f06-evidence/worklog.md` 2026-08-26 段 —— DEC-168 实现细节、C-34 引用、证据
- `keel/features/f17-gate/worklog.md` 2026-08-27 段 —— ISS-045 / ISS-044 复现、红灯、突变记录
- `keel/issues/ISS-044-*.md`、`keel/issues/ISS-045-*.md`
- `tests/dec168-test-kinds.test.ts`、`tests/iss045-hook-git-env.test.ts`、`tests/iss044-claimed-req.test.ts`、`tests/fixtures/git-env.ts`
- `keel/changes/CHG-009-field-hardening.md`、`keel/requirements/gap-hunt-v3.md` —— 上轮遗留
