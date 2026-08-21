# Trellis → keel 映射表（F22 初稿）

> 状态：W1 初稿，可扩展。v1 支持 Trellis（C-130）。语义映射由 k-migrate 执行（W4）；gate 只做编号/骨架/索引/报告模板（C-135）。
> 源只读、不删不改；完成后原地打 `keel-migrated` 标记；删除须用户另确认（C-132）。
> 产物一律标「迁移初稿（未确认）」，迁移工具无权替用户确认（C-131）。

## 源树（Trellis 0.6.x 实测布局）

`.trellis/workflow.md`、`.trellis/config.yaml`、`.trellis/spec/`、`.trellis/tasks/<task>/{task.json,prd.md,design.md,implement.md,implement.jsonl,check.jsonl,research/}`、`.trellis/workspace/<developer>/` journal、平台投影 skills/hooks。

## 映射

| 源 | keel 目标 | 规则 |
|---|---|---|
| `tasks/*/prd.md`、spec 层 PRD | `keel/requirements/vN.md` 的 REQ 初稿 | 逐条拆 REQ；无验收标准标 `[NEEDS-CLARIFICATION]`；未收敛进「未决问题」节 |
| `tasks/*/design.md`、`research/*.md`、spec 设计笔记 | `keel/research/RES-###` + `keel/decisions/DEC-###` 初稿 | 有「决定/理由/备选」三段的进 DEC；无理由的 DEC 标 `provisional`，标题加「暂定·需补理由」 |
| 已完成 `tasks/*`（status=completed / archived） | `keel/features/<slug>/` + `summary.md` 追溯性总结初稿 | 总结对照 prd 验收；缺测试证据在报告里列缺口，不编造证据 |
| 在途 `tasks/*` | `keel/features/<slug>/` + `plan/v1.md` 规划初稿 | 范围/测试义务/触碰文件从 implement.md + jsonl 抽；抽不到就标未决 |
| `workspace/<dev>/` journal、session 指针 | `keel/journal/<dev>/` 归档 + 生成 `keel/handoff.md` | handoff 只做指针摘要，过程留 journal |
| `.trellis/workflow.md` 自定义规则 | 与 keel `AGENTS.md` / DESIGN §5 逐条比对 | 冲突列入迁移报告，**交给用户裁决**，不自动合并 |
| `.trellis/config.yaml`、`.developer` | `keel/config.json` 候选 | 身份/包/钩子；冲突同上 |
| `implement.jsonl` / `check.jsonl` | 导航建议，不是枷锁 | 可写入该功能 worklog「上下文线索」；不改成强制清单 |
| 平台投影 skills/hooks/CLAUDE.md | 双框架互斥清单 | 确认迁移后停用 Trellis 技能与钩子（C-134）；有价值规则合并进 keel AGENTS.md（守 150 行，超则下沉） |
| `spec/guides/` thinking guides | 项目规则候选或 LES 候选 | 不盲信陈旧 guide；过时进存疑清单 |
| `break-loop` / `update-spec` 产物 | ISS / LES / DEC 初稿 | 按内容分流，无法归类列报告 |

## 不映射（及原因）

| 源 | 原因 |
|---|---|
| `task.py` / `add_session.py` 等运行时脚本 | keel 不复用 Trellis 运行时（AGPL-3.0-only，且门禁模型不同）。机制可借鉴，代码 clean-room |
| `trellis channel` / `trellis mem` | 重型编排，N4 非目标 |
| marketplace `tdd` workflow 正文 | 许可证；TDD 政策由 keel C-31/C-35 自己规定 |
| `.template-hashes.json`、`.runtime/` | 源框架内部状态，无 keel 对应物 |

## 冲突预置（须用户裁决）

- Trellis 研究步骤默认 optional ↔ keel F2 调研强制。
- Trellis 门禁为软门 ↔ keel L3 CI 权威。
- Trellis 工作单元=任务 ↔ keel 工作单元=功能。
- 两边 AGENTS.md/CLAUDE.md 同时存在 → 双框架互斥，不能长期并存。
