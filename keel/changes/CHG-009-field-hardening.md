---
id: CHG-009
status: approved
date: 2026-08-26
requirements_from: v3.md
requirements_to: v3.md
---

# CHG-009 首次真实使用后的框架加固

## 动机

keel 第一次被用在真实业务项目上（zhaoxi，2026-08-25），四处「规则在、执法不在」暴露。决策见 [[DEC-161]]，问题条目见 [[ISS-037]] [[ISS-038]] [[ISS-039]] [[ISS-040]] [[ISS-041]]。

需求条目本身不变（C-04/C-05/C-06/C-11 的意图从未改过），变的是**判定机制**——因此 `requirements_from` 与 `requirements_to` 同为 v3.md。

## 新增

- `tools/gate/gaphunt.ts` —— C-06 缺口猎取的判定模块（查实质不查格式）
- `tools/gate/osscheck.ts::inspectResOss()` —— RES 的开源表态检查
- `keel/templates/GAPHUNT.md` —— 缺口猎取记录模板
- `keel/requirements/gap-hunt-v3.md` —— 本仓自己的缺口猎取记录，由未参与访谈的独立上下文实际产出，34 条发现（6 条严重，另行处置）
- `tests/r6-field-guards.test.ts` —— 17 条负向守卫

## 修改

- `tools/gate/check.ts::gReq()` —— 加顺序判据与缺口猎取判据
- `tools/gate/check.ts::xOss()` —— 加 RES 表态判据；**不再因缺 package.json 而整体 SKIP**
- `.agents/skills/k-grill/SKILL.md` —— 提问写法三条硬要求 + 正反例 + 数问号自检；补顺序规则与猎取产出要求
- `keel/templates/RES.md` —— frontmatter 增 `oss_none:`（留空，脚手架默认不合规）；正文加表态说明
- `keel/research/RES-001..008, 901, 902` —— 逐份补开源表态（非一刀切）
- `tests/p2-rework.test.ts` / `tests/w1-skeleton.test.ts` —— 两条测试与本仓配置解耦（[[ISS-041]]）
- `keel/test-baseline.json` —— 156 条

## 删除

无。

## 影响评估

**决策复核**：C-04/C-05/C-06/C-11 的意图不变，判定机制收紧。C-119（pre-commit 只跑 quick）的成本权衡**未改动**，但已被 [[ISS-041]] 证明存在盲区，待用户拍板。

**功能规划新版**：不需要。本次不新增功能，只补执法。

**测试义务**：新增 17 条负向守卫，其中一条是误杀回归（真实良好产出必须 PASS）。全量 156/156。

**旧证据作废**：`tools/gate/` 有改动，树哈希变化 → 此前的完成证据需重跑 `gate verify`。

**对消费项目的迁移成本**（照实说）：
- 每份既有 RES 需补一行表态，否则 `X-oss` FAIL
- 已 `status: confirmed` 的需求书需补一份缺口猎取记录，否则 `G-req` FAIL
- 已在用的 zhaoxi：`v1-gaps.md` 实测通过新判据（51 条枚举、署名可识别），只需补 RES 表态

## 第二轮（2026-08-26 用户逐项拍板后追加）

用户对第一轮汇报中的六个待确认项逐项表态（原话见各 DEC）：3 暂缓（→ DEC-165）、4 可以（→ DEC-162）、5 需要（→ DEC-163）、6 需要扫描并提示（→ DEC-164）；1（C-107 审批身份）用户补充事实「是我让其提交的」，属委托而非绕过，防线方案另行确认中；2（quick 跳过的七项检查）用户询问其作用，已解释，审批路径触发全量 check 的提案待表态。

新增：`tools/gate/rescheck.ts`（RES 实质底线）、`tools/gate/candidates.ts`（经验候选读取端）、KLES-001（F13 管道首次端到端）、守卫测试 13 条（累计 30 条，全量 169）。
修改：`gReq`→`gResearch`（实质接线）、`gRetro`（候选判据）、`status`（lesson_candidates 行）、`.githooks/pre-commit`（DEC-162 触发器）、k-retro / k-log / k-research 技能与 worklog 模板（处置记号约定）、f17/f19 存量标签处置。
附带修复：27 个文件的 CRLF 污染（Python write_text 默认换行转换所致）归一回 LF（DEC-144），教训沉淀为 KLES-001。

## 第三轮（2026-08-26 用户「A 做吧」）

C-107 修订为记录在案的委托（[[DEC-166]]）+ 审批路径提交时守卫（[[DEC-167]]，含实施偏差披露）。

新增：`tools/gate/harness.ts`（环境探测 + 尾注判据）、`gate hook pre-commit-apr`、APR 模板 `delegated:` 字段、守卫测试 9 条（全量 178）。
修改：stamp 尾注 harness 回退（Agent: 不再 unknown）、`gate approve` agent 环境委托前置检查、X-apr 尾注判据、k-accept 双路径协议、AGENTS.md 禁令行、pre-commit 接线。
消费项目迁移：zhaoxi APR-001/002 需补 `delegated:` 记录（新判据下会 FAIL，这是正确的）。

## 批准

2026-08-26 用户批准（原话「批准 你进行提交」），走 DEC-166 记录在案的委托路径落地 → [[APR-002]]（哈希绑定本单与 DEC-161~167）。`gap-hunt-v3.md` 的 6 条严重发现不在本单范围，另轮处置。

**自陈**：本变更单在实施完成后才提出，与 CHG-008 同样的顺序问题（先做后立单）。这本身是 [[ISS-041]] 之外的又一次流程偏差，一并交用户判断是否需要单独立项。
