---
id: CHG-016
status: approved
date: 2026-09-04
requirements_from: v7.md
requirements_to: v8.md
decisions: [DEC-192, DEC-193]
issues: [ISS-071, ISS-072, ISS-073, ISS-074, ISS-075, ISS-076, ISS-077, ISS-078]
---

# CHG-016 第二轮试点审计回流：草稿计划、跨工作树编号、AGENTS.md 随更新、本地补丁可见、新项目门禁口径、证据只算代码

## 动机

用户 2026-09-04：「你先再扫一遍zhaoxi和taotie文件夹，通过查阅agent对话和有关文件看这段时间框架还有没有需要优化的地方。」(2026-09-04)

扫了 zhaoxi 9 月 1～4 日的 27 段 Codex 会话、taotie（Pixiu）从零起步的整段 Claude Code 会话与两个项目的全部 keel 记录。审阅清单后用户批复：「11 不用 12 不用 13不用 14需要15同意 16不用 17可以 18同意 \nC1 A C2A C3 不管 C4 A C5 B」(2026-09-04)——第一、二档（1～10）用户未反对，按「批一下就做」处理。

## 删除

- X-trace 对「当前基线里不存在的 REQ」一律 FAIL 的判定（改为 WARN；REQ-000 例外）。
- `hasImplementationActivity` 作为 G-merge 的唯一门槛；`hasBaseline/hasPlan` 只看文件存在。
- 记录目录进证据树哈希（DEC-192）；ISS-070 的单独例外随之退役。
- `keel/templates/config.json` 与 `keel init` 里的 `deepseek_harness_windows` 备注。

## 修改

- 追溯：认领范围 = 有 APR 绑定的最高计划版本；草稿引用记 WARN（ISS-071）。替身标记缺解除条件记 WARN。
- 编号：跨工作树与 `keel/*` 分支取号；`gate index` 拒绝重复编号（ISS-072）。
- 更新器：AGENTS.md 只替换 `<!-- keel:begin/end -->` 之间；写 `keel/installed.json`，覆盖前标出 LOCAL PATCH（ISS-073 / ISS-074）。
- 门禁口径：G-merge 在无认领 / 无 summary / 无 verify.json 时 SKIP；状态行对 proposed 且未绑定的基线说「finish k-new step 5」；带 REQ-000 的计划 G-plan WARN；G-done 在 OVERVIEW 早于最新 summary 时 WARN（ISS-075，第 17 条）。
- 记录：`gate new --slug`、评审开单用指纹做文件名、`feature:` 与「现象」回填（ISS-076 / ISS-077）；ISS `source` 词表（第 18 条）；决策简报模板与索引（第 14 条）。
- 评审包：框架文件只列文件名（keel 自身仓库 `review.self_hosted` 例外）；锁文件增量摘要默认开启（`review.lockfile_summary: "hash"` 可关）。
- 状态行：替身清单折叠为计数；人类身份为空时点名（第 10 条）。
- 类型：keel 打开 `exactOptionalPropertyTypes`，修 `ctx.ts` / `verify.ts`。
- 技能：k-new 第 5 步在审批后结束本轮（第 15 条）；k-impl 收口加 k-retro（第 17 条）；k-change 方案级变更在主干（DEC-193）；k-log / k-evidence / k-grill / k-review 各一句。
- 版本 0.11.0（证据树语义变了）。

## 不做（用户否决）

- 11 环境事实必答题、12 调研并发与逐节落盘规则、13 需求文件模板——用户「不用」。
- 16 禁止替用户预写批准句——用户「不用」。
- C3 产品运行目标字段——用户「不管」。
- C5 把缺口猎取写成必经步骤——用户「B」（保持现状）。

## 影响评估

- 破坏点：既有 verify.json 的树哈希失效（重跑 verify）；AGENTS.md 需要标记才会被更新；多出 `keel/installed.json`。
- 试点：zhaoxi 主干与 F2 工作树、taotie、fmea-v3 升到 0.11.0；zhaoxi F2 工作树的 43 个草稿文件在新规则下可提交；zhaoxi 按 C4 出澄清并删突变脚本。

## 批准

2026-09-04 用户「11 不用 12 不用 13不用 14需要15同意 16不用 17可以 18同意 \nC1 A C2A C3 不管 C4 A C5 B」(2026-09-04) → 本单 approved；需求 v8 待 APR-008 与本单同批绑定（DEC-190）。
