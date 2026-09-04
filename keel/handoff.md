# handoff

- 下一步（agent）：无待办。可选：对 DEC-190 与「按功能证据」这两处评审之后的改动补跑一轮方案级评审（用户 2026-09-01 说「不用评审」，G-done 的黄可保留）。
- 下一步（人）：对需求 v8（`keel/requirements/v8.md`，只加验收条目）说一句批准原话 → agent 填进 APR-008 的 `delegated:`、`gate approve APR-008`、v8 改 confirmed、current → v8.md。其余无待点头事项。
- 刚发生（0.11.0，2026-09-04）：第二轮试点审计（zhaoxi 27 段会话 + taotie 全程）→ CHG-016：草稿计划只警告（zhaoxi F2 工作树 43 个文件因此卡住）、跨工作树编号、AGENTS.md 随更新、本地补丁可见、新项目门禁口径、证据只算代码（DEC-192）、方案级变更在主干（DEC-193）、决策简报、评审范围不含框架文件；用户否决了环境必答题、调研落盘规则、需求模板、禁止代写批准句、运行目标字段、缺口猎取必经。
- 刚发生（0.10.0，2026-09-02）：用户「A 可以 B 废掉 C 现在升级」→ CHG-015 / DEC-191 评审只答三问（规范可维护 / 功能实现 / 功能测试写了且通过），阻塞凭据改为会失败的测试或缺黑盒测试的验收标准，`checklist.md` 取代三份旧清单，证据 JSON 带 `feature_coverage`；两个试点与 zhaoxi F6 工作树升到 0.10.0；zhaoxi 废止 DEC-013 突变验证。
- 刚发生（0.9.3）：清理两个试点仓库时撞到两处卡点并修掉——verify 把 junit 第一个 suite 的数当整场（ISS-068）、`keel update` 没有非交互的 `--yes`（ISS-069）、认领标记让主干永远"脏"（ISS-070）；两仓已升到 0.9.3。
- 刚发生：2026-09-01 用户「批准V6和三份变更单。并以我的身份提交。」→ APR-006 approved（绑定 CHG-012 / CHG-013 / CHG-014 与 `requirements/v6.md` 正文哈希），requirements current = v6.md；同轮 DEC-190 去掉"审批只能由人类 git 身份提交"（原话即审批，谁提交都行），REQ-006/AC-10 让 `gate verify` / `gate trace` 按功能说明证据。
- 试点仓库状态（2026-09-04 晚）：三棵树 + zhaoxi F2 工作树都在 0.11.0（AGENTS.md 已加 keel 标记）。zhaoxi 主干——verify 320 过 / 2 跳、树干净，全门禁 0 红 3 黄；DEC-065 澄清计划 v2 突变条款失效、`tools/mutation-proof.mjs` 删除；F1 残留工作树目录清理；F2 工作树卡了两天的 45 个重基线草稿已提交（5d239b0），待 APR-009 并按 DEC-193 搬到主干（由 zhaoxi 会话做）。taotie——全门禁 0 红 0 黄（新项目口径生效）。fmea-v3——升级已提交，Cursor 会话仍有未提交改动。两个试点各有若干替身标记没有解除条件，新规则下记 WARN，由各自会话补。
- 该读：`RELEASE-0.9.3.md`、`keel/issues/ISS-068…070`、`keel/features/f06-evidence/worklog.md`、`f19-parallel/worklog.md`、`f23-bootstrap/worklog.md` 的 2026-09-01 节。
- 阻塞问题：无。
