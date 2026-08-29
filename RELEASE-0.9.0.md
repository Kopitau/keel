# keel 0.9.0 release notes

发布日期：2026-08-29。变更单 CHG-011（DEC-183，APR-004）：keel 减重——原则不变（留痕 / 验证 / 审批 / 复用），机制砍半。升级前先提交自己的改动；`keel update` 只有明确输入 `y` 才执行，且只动框架管理目录（`tools/gate/`、`.githooks/`、`keel/templates/`、`k-*` 技能与 Claude 镜像）。

## 破坏点

### 门禁（23 → 8）

- 保留：G-req、G-plan、G-done、G-merge、X-trace、X-evidence、X-bypass、X-apr。
- 删除：G-research、G-retro、G-issues、X-budget、X-skills、X-casefold、X-ids、X-types、X-hooks、X-oss、X-knowledge、X-tests、X-full、X-owners、X-decisions。对应模块（rescheck / gaphunt / candidates / osscheck / knowledge / testbase / decisions / lessons / autoload / issues / gen-test-baseline）一并删除；`gate review` 清单只剩 8 条。
- `gate check --quick` = G-req / G-plan / X-trace / X-bypass（秒级）；全量 `gate check` 另跑 G-done / G-merge / X-evidence / X-apr。默认只打印非 PASS 项与一行总结，`--all` 全打。
- X-evidence 只在全量 check 判；X-apr 拒绝 `content_sha256: pending` 的 approved APR。
- 审批哈希改为**正文哈希**（前言之外的规范化正文）：`gate approve` / `gate hash` 写正文哈希；G-req 对旧全文哈希在文件未动时仍接受；正文不符降为 WARN，worklog 一行 `gate-warn: G-req ref=APR-nnn` 放行；语义变才新版重批。

### 钩子

- `.githooks/pre-commit` 只跑 `check --quick` 与（暂存了 `keel/approvals/` 时的）审批身份守卫；不再跑全量测试与类型检查。全量在 `gate verify` 与 CI。

### 评审回路（功能级 → 方案级）

- 一份规划一个回路，整个方案实现完再评审；单功能完成不触发评审。
- 每轮产物只有 `keel/review/findings.md` 与 `keel/review/disposition.md`（均入库，追加式）；`state.json` / `rounds.json` / `fuse-report.md` 删除，熔断报告追加进处置表。`pack.json` 仍是 gitignored 的输入。
- `gate loop pack` 不再接受 `--feature`，改为可选 `--base <rev>`；pack 的 `plan` 是当前总览，`worklog_summary` 是各功能 worklog 最新一节的摘要。
- G-done 读处置表：passed → PASS（树已变 → WARN）、repairing → WARN、fused → FAIL；无处置表时活动功能全有 summary → FAIL「评审未跑」，否则 PASS（施工中）。
- `gitWriteTree` 把 disposition / findings 从绑定树里剔除，回路写自己的记录不再使证据或回路失效。

### 记录与模板

- 模板 21 → 8 + config.json：删除 GAPHUNT / KLES / LES / OSS / journal / requirements-entry / handoff / evidence.json / migrate/*；`gate new` 只剩 dec / res / iss / chg / apr / feature。
- 不再新建 `keel/journal/`、`keel/lessons/`、`keel/oss/`、`keel/migrations/`、`keel/test-baseline.json`；开源登记写 RES 前言 `oss:` 字段；经验写在 `#经验候选` 标签行的 `→ 经验：…`；缺口猎取写进需求书「未决问题」之后。
- handoff ≤ 10 行（下一步 + 该读文件）；summary 在功能完成时写一次并压缩 worklog；DEC 只写难逆转的决策。
- config：`budget`、`oss_review_days`、`knowledge_cap`、`rules_area_cap` 不再被读取（`keel update` 不改 config 内容，只更新 `keel_version`；留着无害）。

### 技能

- 16 个 k-* 全部保留，正文 ≤ 80 行。k-review 改方案级回路；k-impl 改自主回路（切完就继续，功能完成压缩 worklog，只在 C-21 / 熔断 / 验收停）；k-retro 触发改为功能完成；k-migrate 并入映射表；k-log / k-research 的开源登记改字段。

## 消费项目要做的事

1. 提交自己的改动，跑 `keel update`，看预览再输入 `y`。
2. 曾有 `keel/review/state.json` 的项目：把 passed 记录手工写进 `keel/review/disposition.md`（见本仓示例），或删掉后重新 `gate loop pack`。
3. 删除仓内 `keel/test-baseline.json`、`keel/migrations/`（updater 不删非管理路径）；`.gitignore` 里的 `keel/review/state.json|rounds.json|fuse-report.md` 三行可删。
4. `git config core.hooksPath .githooks` 不变；跑 `node tools/gate/gate.ts check --quick` 确认绿。
5. 需求书的 verification 数组与 `[proxy:…]` 规则不变；此前为 G-research / X-oss 补的 RES 字段无需回退。
