<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# R6 — E:\program\kk 框架设计稿审计（对照本项目需求 R-01~R-20）

> 审计日期：2026-08-21。对象：kk 的 `docs/framework-spec.md`（design_version 0.1, 2026-08-20, accepted）+ 37 条 ADR + 24 份 design 契约（定点核查 bootstrap-harness-support / test-skill / requirements-skill / implementation-boundary / feature-change-recording / concurrency-and-handoff）+ CONTEXT.md + README + `pre01` 实现切片（preflight/init，TS/Node，含 vitest 测试与 goldens）。
> 审计基准：`E:\program\en\docs\requirements.md`（R-01~R-19）+ 新增 R-20（token 不对称）。
> 说明：kk 是另一模型（Codex）在用户另行访谈下的独立设计，其访谈答案与本项目访谈答案存在**真实分歧**（见 §3），审计中不视为错误而是标注待用户仲裁。

## 1. kk 是什么（一句话）

"模型原生、证据门禁"框架：阶段 = 可调用 Skill（入口/出口有证据门禁，内部模型自由），长期主轴 = **功能包**（当前快照 + 不可变 change overlay + revision 推进），权威边界 = 统一 Gate CLI（TS/Node 22/24，npm 精确分发 + 用户级 Dispatcher + 内容寻址 cache + framework lock/epoch），审批 = **规范摘要（canonical JSON, RFC 8785 JCS + SHA-256）哈希绑定**，硬约束分 local / ci-observed / full 三档诚实标注（full 仅 GitHub Actions + Rulesets 实测承诺）。v0.1 首发 harness：Codex / Claude Code / Grok Build 三家同级，四条发布硬门槛（conformance、真实宿主 smoke、跨 harness 自托管接力、门禁 fixtures 结论一致）。

## 2. 需求覆盖判定

| 需求 | 判定 | 依据与备注 |
|------|------|-----------|
| R-01 需求访谈先行并记录 | **✔ 强** | /requirements：先查库再问人、一次一问 + 开放问题前沿、稳定 ID、事实/推断/假设/偏好分离、需求挑战分级（self / independent 新上下文 Reviewer）、8 条退出门禁、批准绑定规范摘要 hash |
| R-02 调研先于设计并逐条确认 | **✔ 强** | 三档 research gate（本地/标准/深度），fail-closed（离线也须证据包）；/design 决策图 + frontier，一轮一个高价值决定，**决定当场按 ID 留痕**；低层可逆决定 IMPDEC 记录不打断用户 |
| R-03 功能必有测试证明完整 | **✔ 强** | AC→Slice→test obligation→test impl @git tree→run evidence→completion receipt 硬链；缺陷修复回归测试先行；遗留代码 characterization test；证据 stale 语义；人工测试须批准例外 |
| R-04 问题留痕 | **✔ 强** | 最小事件→PROB-* 提升条件明确；闭环去向枚举；**重复错误必须解释上次防线为何失效**；Experience Observer（非阻断经验候选，借鉴 TeamAI CLI 并修正） |
| R-05 暂定设计记录理由 | **✔ 强** | IMPDEC-*（背景/选择/替代/理由/权衡/重审条件）；触及高层边界自动升级回 /design |
| R-06 六平台可用 | **△ 部分** | v0.1 只承诺 3 家（Codex/CC/Grok），OpenCode/Pi/dsh 列"下一兼容批次"（ADR-0018）。与本项目 R-06（六家）冲突 → 见 §3 分歧 1 |
| R-07 多人 + 多 agent 并行 | **✔ 强** | executor-claim + executor_epoch CAS 乐观并发、每 Slice 单写者、handoff 不带聊天记忆、stale 传播（先合入者使他人 base 过期须重新影响分析）；无 per-developer journal（次要） |
| R-08 上下文/token 预算 | **△ 部分** | L0/L1/L2 三层材料 + 渐进加载 + 无常驻编排（比 Trellis 好）；但**无 CI 强制的字节/行数预算检查**（对照本项目 §10 gate context-budget） |
| R-09 CI 复跑门禁 | **✔ 强（GitHub）/ △（Gitee）** | full 模式七条件（保护主干、PR-only、required check、CI 对待合并 tree 重算、agent 凭据无 bypass、policy 来源受保护、合并后验证）；诚实分档：非 GitHub 只标 ci-observed/local。用户实际是 GitHub+Gitee → Gitee 侧只能 ci-observed |
| R-10 会话交接 + 功能级总结 | **✔ 强** | /handoff（不读原聊天即可继续）+ 功能包 INDEX（高信号摘要）+ **当前快照**（"现在是什么"）+ CR INDEX（"为何/如何变成现在"）+ 项目 INDEX 功能地图——结构上优于一次性 FEA 快照 |
| R-11 需求变更管理 | **✔✔ 最强项** | CR overlay（requirements-delta add/modify/deprecate/remove）→ 验收前集成与主干集成分离 → 合入主干才投影新 revision → 其他在途 CR 自动 stale。比本项目 DESIGN v0.9 的 CHG 设计完整 |
| R-12 需求/功能规范化 | **✔** | 稳定 ID、验收条件可观察、非目标、假设分离、正文可学习性要求 |
| R-13 记录成体系防重复 | **✔** | 错误指纹、repeated failure 定义（同指纹同 Slice ≥3 次）、防线失效追责、lessons + /promote-lesson 手动跨项目提升 |
| R-14 语言分工（agent 英文/记录中文） | **✘ 未规定** | 全部设计文档中文；未对 skills/投影/AGENTS.md 的语言作任何约定 → 落地时需补 |
| R-15 审批点 | **△ 分歧** | 7 个手动点（需求、设计、init/分支、测试例外、验收、集成、发布/升级）覆盖"关键控制点"；但 **Slice 拆分与每 Slice 计划为模型自主**，/implement 仅在启动时确认范围授权 → 与本项目访谈"每任务实施计划须人工确认"不同 → 见 §3 分歧 2 |
| R-16 项目类型（DS/notebook 等） | **△ 部分** | 测试契约语言无关（单元/集成/契约/e2e/属性/性能/安全/静态），但无 notebook/数据管道专项政策（nbmake/pandera 等）；框架自身运行时为 TS/Node（团队 Python 为主，贡献门槛） |
| R-17 只交付设计规范 | n/a | kk 已进入实现（pre01 切片）；属其项目自身节奏 |
| R-18 基于当前模型能力 | **✔✔** | "模型原生"是其第一设计判断；有专门的模型/harness 能力假设调研 |
| R-20 设计重投入/实现省 token | **△ 部分** | 渐进加载 + 无常驻编排间接省；无显式机制（模型路由、实现期上下文清单、effort 档位、费用记账） |

## 3. 与本项目访谈答案的真实分歧（需用户仲裁）

1. **Harness 范围**：kk = 3 家首发 + 严格 conformance 才叫"支持"（诚实但慢）；本项目 = 六家 day-one 可用（AGENTS.md + .agents/skills 是五家零适配交集，成本低，但"可用"≠"conformance 级保证"）。两者都对，取决于你要"承诺强度"还是"覆盖广度"。
2. **每任务计划审批**：kk = /implement 手动启动 + 执行授权（范围/分支/边界），Slice 拆分自主；本项目 = 每任务 plan.md 人工确认（quick 档合并触点）。
3. **交付物形态**：kk = 产品级框架（npm 分发的 Gate CLI + Dispatcher + lock/epoch + conformance 套件 + 自托管），建成本高、跨项目复用与升级治理强；本项目 keel = 仓库内文件 + stdlib 脚本，建成本低（≈6 周路线图 vs kk 的产品工程量），分发/升级治理弱。
4. **运行时**：kk = TS/Node 22/24；本项目 = Python≥3.11 stdlib（团队 Python 为主）。

## 4. kk 中值得直接吸收进 keel 的机制（无论最终走哪条路线）

1. **规范摘要哈希审批**（ADR-0021/0032）：审批绑定 canonical JSON（JCS+SHA-256）的"规范性内容"而非整篇 markdown——错字/排版/链接修订不作废审批，行为/范围/验收/约束变化才重批。优于 keel v0.9 的"整文件 sha256"。
2. **功能包 + 当前快照 + CR overlay 作为长期主轴**：解决"任务归档后当前状态要从多处推断"的 Trellis 结构病；keel 的 FEA/OVERVIEW 是弱化版，应升级为"OVERVIEW=项目级快照，FEA 保留叙事，需求/设计的当前有效版本按功能聚合"。
3. **stale 传播语义**：需求/设计/证据/评审的失效是**状态**而非删除；先合入者使并行 CR 的 base 过期。
4. **executor-claim + epoch** 乐观并发（比 keel v0.9 的"assignee 字段"严谨）。
5. **诚实执法分档**（local / ci-observed / full）：Gitee 侧用这个词汇表述退化，不谎称硬约束。
6. **需求挑战分级**（self / independent）与"挑战 findings 必须逐条有去向"。
7. **characterization test 规则**（改遗留无测试行为前先固定现状）。
8. **repeated failure 的量化定义**与"解释旧防线为何失效"。

## 5. kk 的主要风险（对你团队）

1. **工程量**：Dispatcher/lock/epoch/conformance 矩阵（3 OS × 2 Node × 3 harness）是产品级投入，回本前提是多项目长期使用；单团队自用可能过重（正是当初弃 BMAD 类的理由，只是重的位置从"流程仪式"移到了"基础设施"）。
2. **六平台承诺缺口**（分歧 1）。
3. **TS/Node 核心 vs Python 团队**的维护/贡献错位。
4. **语言分工未规定**（R-14）。
5. **无上下文预算的机器检查**（R-08 弱项）。

## 6. 结论

kk 在你的五条硬需求中的 R-01~R-05 上是**目前见过的所有框架（含 R3a 审计的 12 家）里最完整的设计**，且与本项目 keel v0.9 在原则层高度收敛（出口审核、证据绑树、审批哈希、CI 权威、教训闭环——两边独立推导出同一套公理，互为佐证）。缺口集中在：六平台范围、语言分工、DS/notebook 测试基座、上下文预算机检、token 不对称机制、Gitee 退化——恰好都是 keel v0.9 已覆盖的部分。**建议路线见主报告：以"合并"取代"二选一"。**
