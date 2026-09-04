# worklog — F4 f04-unified-plan

## 2026-08-21

- 进度：W1 开工。切片：overview-v1 + 23 份小规划 + INDEX
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无

## 2026-08-27（RES-904 借鉴：计划模板）

- 进度：`feature-plan.md` 前言加 `blocked_by: []`（DEC-169）；"测试义务"加"缝"表（REQ/AC → 黑盒测试挂在哪 → 真验收 / proxy 至 Fnn，RES-904 §6）；"内部步骤"改为切片（单上下文装得下、可独立演示、纵向贯穿，每步带 `verify:`，RES-904 §5）；"依赖"节说明 `blocked_by`。
- 实现决定：切片与缝只进模板与 k-impl 文字，不加门禁——先在下一个功能上用一遍再决定要不要 X-trace 对账 proxy 注记与缝表。

## 2026-08-28（CHG-010 / requirements v4 规划基线）

- 进度：新建 `overview-v3.md`，完整保留 I-01～I-18 并新增 I-19～I-25；为 F1～F24 全部新建最新计划版本（F7/F17 为 v3，其余为 v2），每份都有 `req:`、`blocked_by:`、verification、测试缝和逐会话切片。
- 实现决定：本轮 `blocked_by` 统一只表达“必须等整个功能已有 summary.md”的硬阻塞；CHG-010 各 owner 是既有系统上的增量，大多数只有接口/文件重叠而非完整功能阻塞，因此不把 overview 耦合机械复制成瀑布依赖，串行点留在 I-nn 与实施顺序中（DEC-169/C-114）。
- 边界：本切片只写规划，不实现 0.8.0 行为；用户在途 `keel/handoff.md` 保持不覆盖。
- #经验候选 defense failed `current:` 升版第二次撞到硬编码测试（ISS-050→ISS-051）；点修未覆盖同文件 sibling，应优先断言版本无关不变量。

## 2026-09-01（CHG-014 S3：REQ-004/AC-11 计划类冻结件进 G-plan）

- 进度：G-plan（quick）对当前 overview 的前言 `status`（含 confirmed / approved / 已确认 / 已批准）要求 approved APR 直接绑定且哈希匹配：无 APR → FAIL（DEC-186）；漂移 → WARN 带 `waivers`（`gate-warn: G-plan ref=APR-nnn`）。所有 approved APR 引用的 `plan/overview-vN.md` 与 `features/*/plan/vN.md` 也在 G-plan 里重算：缺失 FAIL、漂移 WARN→FAIL（DEC-185）。zhaoxi 那种"9 份计划原地改一周无告警"下次 pre-commit 就会红。
- 证据：`tests/chg014-frozen-artifacts.test.ts` `REQ-004/AC-11`（功能计划原地改 → quick FAIL → waiver 后 WARN；overview 声明已确认而 APR 仍 draft → FAIL 并给出 DEC-186 指引）。

## 2026-09-04（CHG-016：决策简报；k-new 在审批后收口）

- `keel/templates/BRIEF.md`；`gate index` 在决策索引末尾列 BRIEF；k-new 第 5 步：审批提交后本轮结束，开工是用户的下一个决定（taotie 曾在审批后被自主回路直接推进实施）。证据：REQ-004/AC-11、AC-12。
