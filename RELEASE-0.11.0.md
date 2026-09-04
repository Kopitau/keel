# keel 0.11.0 release notes

发布日期：2026-09-04。变更单 CHG-016（决策 DEC-192、DEC-193；问题单 ISS-071～078）：第二轮试点审计回流——zhaoxi 9 月 1～4 日的 27 段会话与 taotie（Pixiu）从零起步的整段会话。

## 破坏点

- **证据的树哈希只算代码（DEC-192）。** 记录目录（计划、调研、决策、日志、审批、评审产物、认领标记）不再进树哈希、不算脏；只有记录目录里的 `config.json` 例外。既有 verify.json 的树哈希与新算法不同：升级后主干重跑一次 `gate verify`。评审「通过时方案是否已完成」改由处置表里的 `plan_complete` 判断（ISS-055 语义不变）。
- **AGENTS.md 只在有标记时被更新。** 项目根的 AGENTS.md 里 `<!-- keel:begin -->` … `<!-- keel:end -->` 之间是 keel 的段落，`keel update` 只替换这一段；没有标记的旧文件不动，预览里提示一句。旧项目请把 keel 的段落围起来（本次两个试点由 keel 代做）。
- **多一个受管文件 `keel/installed.json`**（本次安装的受管文件哈希）。下一次更新的预览会把与已装副本不同的文件标为 `LOCAL PATCH`——本地修过的门禁代码在覆盖前会被点名。
- **追溯不再因草稿计划报红。** 已完成功能的认领范围 = 有 APR 绑定的最高计划版本；草稿引用的新需求记 WARN。之前会因此拒绝提交的草稿现在可以提交。
- **G-merge 在没有认领、summary、verify.json 时 SKIP**；`gate status` 对 proposed 且未绑定的基线说「finish k-new step 5」；带 `REQ-000` 的计划 G-plan WARN；G-done 在 OVERVIEW 早于最新 summary 时 WARN。
- keel 打开 `exactOptionalPropertyTypes`；`ctx.ts` / `verify.ts` 已修（zhaoxi ISS-047 的上游修法）。

## 变化

- 编号跨工作树与 `keel/*` 分支分配（含未提交文件）；`gate index` 拒绝重复编号（ISS-072）。
- `gate new … --slug <ascii>`；评审回路开单用 finding 指纹做文件名，`feature:` 与「现象」回填（ISS-076 / ISS-077）；截断的 slug 不再以横线结尾。
- 评审包：框架文件（`tools/gate`、`tools/cli`、技能、钩子、模板、清单）只列文件名（`review.self_hosted: true` 的仓库除外）；pnpm 锁文件默认附完整哈希与按 importer / 依赖的版本增量、新增删除的包（zhaoxi DEC-028 收编）；`review.lockfile_summary: "hash"` 可退回只给哈希。
- 状态行：替身清单折叠为计数；`identities.humans` 为空时点名。
- 替身标记须有解除条件（点名功能或记录编号），否则 X-trace 单列 WARN。
- `gate worktree rm` 在 Windows 上自行重试删除并 `prune`，失败时打印残留路径（ISS-078）。
- 决策简报：`keel/templates/BRIEF.md` → `keel/decisions/BRIEF-<date>-<slug>.md`，决策索引末尾列出。
- 技能：k-new 第 5 步在审批提交后结束本轮（开工是用户的下一个决定）；k-impl 收口含 k-retro；k-change 方案级变更在主干（DEC-193）；k-log 的 ISS `source` 词表；k-evidence 说明测试命令之外的脚本不是证据；k-grill 缺口猎取只返回不写文件；k-review / checklist 说明框架文件不在三问范围。
- `keel init` 不再把 keel 内部的平台备注抄进项目 config；未指定人类身份时提示。

## 消费项目要做的事

1. `keel update --yes`；看预览里有没有 `LOCAL PATCH` 行（有则把本地改动另存或给 keel 提 ISS）。
2. 若预览提示 AGENTS.md 无标记：把文件里 keel 的段落用 `<!-- keel:begin -->` / `<!-- keel:end -->` 围起来再更新一次。
3. 主干重跑 `node tools/gate/gate.ts verify`（树哈希算法变了）。
4. 正在飞行中的方案级变更（如 zhaoxi CHG-002）：草稿现在可以提交；按 DEC-193 把新版本搬到主干批准，功能工作树再 rebase。
