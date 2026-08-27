---
id: RES-904
title: mattpocock/skills 的 wayfinder：keel 可借鉴什么
depth: 标准
date: 2026-08-27
features: [F1, F2, F4, F12, F16]
oss_none: 只借鉴做法，不引入依赖。wayfinder 是 mattpocock/skills 仓库里的一个 SKILL.md（MIT 许可下的提示词文本），不是可安装的运行时组件；keel 的对应物是自己的 k-* 技能与 gate。若将来决定直接装 mattpocock/skills 到消费项目（而非借鉴），再登记 OSS。
---

# RES-904 mattpocock/skills 的 wayfinder：keel 可借鉴什么

档位：**标准**（官方源 = 仓库内 SKILL.md / docs / setup 模板 + 作者 FAQ 页；本地对照 = keel 现行技能与 DESIGN；≥1 备选见候选对比）。

## 调研问题

用户问："mattpocock 的 wayfinder，对本项目有没有什么可以借鉴和参考的？"

拆成三问：① wayfinder 到底是什么、怎么运转、作者承认哪些失效；② 与 keel 现有机制逐项对照，哪些 keel 已有、哪些 keel 没有；③ 值得搬进 keel 的是哪几条、各自要动什么、要不要 DEC。

## 检索范围

- 一手：`mattpocock/skills` 仓库 `skills/engineering/wayfinder/SKILL.md`（11.9 KB）、`docs/engineering/wayfinder.md`（作者 FAQ）、`setup-matt-pocock-skills/` 下三份 tracker 模板（github / gitlab / local）、同仓 `research` / `to-spec` / `to-tickets` / `prototype` / `domain-modeling` / `grill-with-docs` 技能与文档、`wayfinder/agents/openai.yaml`、Releases 页、issue #703 / #718；作者站 aihero.dev 的 wayfinder 页。
- 二手（只用于日期与外部评价）：latent.space 评述（2026-08-20）。
- 本地对照：本仓 `.agents/skills/k-grill|k-new|k-research|k-handoff`、DESIGN §5 F1/F2/F4/F12、CONTEXT.md；本机 `~/.claude/skills/grill-me`、`grill-with-docs`（用户已装的同作者旧版技能）。
- 未做：没有实跑 wayfinder（需要 GitHub issues 或 `.scratch/` 落盘；本仓禁止未登记的工作产物入库）。
- 访问日期：全部 2026-08-27。

## 候选对比

| 候选 | 形状 | 优点 | 缺点 |
|---|---|---|---|
| A. 整套采用：大项目入口改用 wayfinder（map + 决策票 + 会话），keel 只管实现之后 | 作者已验证的多会话规划纪律；GitHub 原生依赖图即"前沿"可视 | 记录落在 issue tracker 或 `.scratch/`，脱离 keel 的哈希/APR/门禁链；与 C-19（工作单元=功能，禁"task ticket"）、C-06（基线一次点头）正面冲突；作者自述最常见失效"边规划边写产品代码"在 keel 里正是靠门禁而非提示词挡住的 |
| **B. 逐条借鉴**：把 wayfinder 里 keel 缺的机制搬进 keel 自己的记录与 gate | 保住执法链；每条都小；可分批 DEC | 要自己实现"前沿"等读取端；借鉴的是做法不是代码 |
| C. 不借鉴 | 零成本 | 下文列出的 7 条缺口继续空着；zhaoxi v1 已经踩到"27 张票到第 13 张就作废"的同类风险 |

## 逐项证据

### 0. 引用清单（全部访问日期 2026-08-27）

一手：

- SKILL.md：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/SKILL.md (accessed 2026-08-27)
- 作者 FAQ 文档：https://raw.githubusercontent.com/mattpocock/skills/main/docs/engineering/wayfinder.md (accessed 2026-08-27)
- 作者站说明：https://www.aihero.dev/skills-wayfinder (accessed 2026-08-27)
- 本地 markdown tracker 模板：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md (accessed 2026-08-27)
- GitHub tracker 模板：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md (accessed 2026-08-27)
- setup 技能说明：https://www.aihero.dev/skills-setup-matt-pocock-skills (accessed 2026-08-27)
- research 技能：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/research/SKILL.md (accessed 2026-08-27)
- to-spec 技能：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-spec/SKILL.md (accessed 2026-08-27)
- to-tickets 技能：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/to-tickets/SKILL.md (accessed 2026-08-27)
- prototype 技能：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/prototype/SKILL.md (accessed 2026-08-27)
- domain-modeling 技能：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/domain-modeling/SKILL.md (accessed 2026-08-27)
- grill-with-docs 文档：https://raw.githubusercontent.com/mattpocock/skills/main/docs/engineering/grill-with-docs.md (accessed 2026-08-27)
- Codex 元数据文件：https://raw.githubusercontent.com/mattpocock/skills/main/skills/engineering/wayfinder/agents/openai.yaml (accessed 2026-08-27)
- OpenAI Codex skills 文档：https://developers.openai.com/codex/skills (accessed 2026-08-27)
- issue #703（evidence-building 边界）：https://github.com/mattpocock/skills/issues/703 (accessed 2026-08-27)
- issue #718（标签未创建）：https://github.com/mattpocock/skills/issues/718 (accessed 2026-08-27)
- issue #516（Codex 需要 openai.yaml）：https://github.com/mattpocock/skills/issues/516 (accessed 2026-08-27)
- Releases：https://github.com/mattpocock/skills/releases (accessed 2026-08-27)
- npm registry 查询（404）：https://registry.npmjs.org/@ai-hero%2Fwayfinder (accessed 2026-08-27)

二手（只用于日期与外部评价）：

- latent.space 评述（2026-08-20）：https://www.latent.space/p/wayfinder-skill (accessed 2026-08-27)
- 作者关于 CLI 的帖子：https://x.com/mattpocockuk/status/2076297916336013516 (accessed 2026-08-27，仅见搜索摘要 `[未核实]`)

### 1. wayfinder 是什么

- 定位：用户显式调用的技能（`disable-model-invocation: true`），处理"一个会话装不下、目的地清楚但路不清楚"的工作；口号 "It plans, it does not do"。引用：SKILL.md 前言；docs/engineering/wayfinder.md "When to reach for"。访问 2026-08-27。
- 工件：**一张 map** = tracker 上一条带 `wayfinder:map` 标签的 issue，正文四节：Destination / Notes / Decisions so far（每条已关票一行 gist + 链接）/ Not yet specified（fog）/ Out of scope。**票** = map 的子 issue，正文只有 `## Question`，标签 `wayfinder:<type>`，开工前先 assign 给自己算领取；阻塞用 tracker 原生依赖；**前沿** = 开着、未被阻塞、未领取的票；答案写成关票评论，map 只记一行 gist——"map is an index, not a store"。引用：SKILL.md "The Map" / "Tickets" 节。
- 四种票：grilling（HITL，默认）/ prototype（HITL）/ research（AFK，子代理并行，写在 `research/<name>` 分支）/ task（HITL 或 AFK，只为解锁决策的手工活）。规则：**一个会话只解一张票**（research 例外）；agent 不得替人回答 HITL 票。引用：SKILL.md "Ticket Types"、docs "Four Decision-Ticket Types"。
- 两种调用：charting（先用 grilling + domain-modeling 定目的地；广度优先 grill 找前沿；建 map 与票；并行放 research 子代理；**停**）；working（低分辨率读 map；领第一张前沿票；解；记一行；把 fog 里已能精确提问的升成新票；**停**）。引用：SKILL.md "Invocation" 两节。
- fog 与票的判据："能否**现在**把问题说精确，而不是能否回答"；出了目的地的东西不是 fog，进 Out of scope 且永不升级。引用：SKILL.md "Fog of War" / "Out of Scope"。
- map 清空后不写代码：`/to-spec` 把决策链压成 spec（模板：问题/方案/用户故事/实现决策/**测试决策含"测试缝"**/范围外），`/to-tickets` 切成"曳光弹式纵向切片"（每片贯穿所有层、单个新上下文能装下、可独立演示、显式 `Blocked by`），再 implement。引用：docs "After clearing the map"；to-spec / to-tickets SKILL.md。
- tracker 抽象：`setup-matt-pocock-skills` 写 `docs/agents/issue-tracker.md`，含"Wayfinding operations"节；GitHub 用 sub-issues + `gh api .../dependencies/blocked_by`（用数据库 id 不用 `#n`）；本地 markdown = `.scratch/<effort>/map.md` + `issues/NN-<slug>.md`（`Type / Status: claimed|resolved / Blocked by: 01, 03 / ## Comments / ## Answer`），前沿查询 = 扫目录取第一张未阻塞未领取。作者对仓内落盘的态度："first-class for solo repos" 但 "tends to lead to accidental persistence"。引用：issue-tracker-local.md、issue-tracker-github.md、docs "Must I use GitHub Issues?"。
- Codex 元数据：`wayfinder/agents/openai.yaml` 全文 5 行：`interface.display_name / short_description`、`policy.allow_implicit_invocation: false`。OpenAI 官方 Codex skills 文档确认该文件用于 UI 元数据与"是否允许隐式调用"（默认 true；false 时只能 `$skill-name` 显式调用）。引用：仓内 openai.yaml；developers.openai.com/codex/skills；mattpocock/skills issue #516（Codex 不认 `disable-model-invocation`，必须靠 openai.yaml）。
- 版本：v1.0.0 引入 grilling / to-spec / to-tickets；v1.1.0 wayfinder 从 in-progress 毕业、to-tickets 加阻塞边；v1.2.0 由 `decision-mapping` 改名 wayfinder；最新 v1.2.3。Releases 页抓取到的年份与 issue 日期（2026-07/08）矛盾 `[未核实：具体发布日期]`。
- CLI：作者在 X 上提过 `npx @ai-hero/wayfinder github|gitlab|local <map>`；npm registry 查 `@ai-hero/wayfinder` 返回 404——截至访问日**未发布** `[未核实：是否改名发布]`。

### 2. 作者承认的失效（docs FAQ + issues）

| 失效 | 作者原话/要点 | keel 现状 |
|---|---|---|
| agent 在规划会话里写产品代码（最常报） | "the constraint and its exemption live in the same file the constrained party owns"——Notes 里可以写 "this map carries execution"，agent 自己写、自己读回当授权 | keel 用机器执法：NO_WAIVE 门禁 agent 不能豁免、APR 须人类身份、C-21 停下问。**但同一形态在 keel 里也存在**：DEC-168 的 `[proxy:…]` 是 agent 在自己写的测试名里给自己开的豁免，只是可见（WARN）且有复审阈值（>1/3） |
| 27 张票到第 13 张作废（瀑布陷阱） | 对策：目的地收窄到"一个 epic"；大量 prototype，"uncertainty is flushed out by cheap concrete artifacts before implementation depends on it" | zhaoxi v1 一次写下 80+ 条 REQ，F4 整块 deferred；keel 靠 CHG + 新版本文件收口，没有"先做便宜原型再定"的规则 |
| grilling 每题三段、决策疲劳 | 无官方解，模型相关 | k-grill 的 C-02 规则（问句、术语定义、成本）比它细；keel 默认批量提问，wayfinder 一题一答 |
| 并行会话重复提问；prototype 票 agent 自己选了方案 | "the sessions share no context"；选择属于人 | keel C-114 重叠串行；C-03 不替用户决定 |
| 已关的决策事后发现错了 | 无官方指引，agent 倾向绕着错决策设计 | keel 有 C-14 supersede、C-63/C-65 CHG 联动——比它明确 |
| 标签从不被创建（#718）；"evidence-building 代码"边界不清（#703：7 个实现 PR 在评估门关闭前合并） | 未回复 | keel init 一次写全（REQ-025）；#703 的规则建议 "must name the exact decision it enables" 与 keel C-62 防线指针同构 |

### 3. 与 keel 逐项对照

| wayfinder 机制 | keel 对应 | 判定 |
|---|---|---|
| Destination 先定，塑造每张票 | 需求基线（C-06）+ 功能计划"范围/非范围" | 已有 |
| fog（Not yet specified）+ "能否现在精确提问"判据 | `未决问题` 节 + `[NEEDS-CLARIFICATION]`（C-05）| 已有节，**缺判据与升级规则**（何时从未决升成 REQ/DEC） |
| Out of scope 永不升级 | REQ 的 non_goals；无全局节 | 部分 |
| 一票一决策、答案只在票里、map 只 gist+链接 | 一决策一 DEC（C-13）、INDEX 生成（gate index） | 已有，且 keel 多了用户原话与哈希 |
| HITL / AFK 显式标在每张票 | C-03 事实 vs 决策 | 已有精神，无标记 |
| research 票 = AFK 子代理并行、`research/<name>` 分支、只许一手源、引文 ≤125 字 | k-research：档位 + 实质门（G-research）+ oss 表态；顺序执行 | keel 判据更严，**缺"charting 时并行放研究"的协议与"只许一手源"的规则** |
| prototype 票 = 一次性代码回答一个具体问题；一条命令能跑；扔到一次性分支并留票号；结论进产品代码 | 无对应记录种类；zhaoxi 的 S1–S5 spike 以 RES 形式存在 | **缺** |
| 阻塞边 + 前沿（未阻塞、未领取）机器可查 | `claim.json` 领功能；overview 有"实施顺序与依赖"文字；`gate worktree` 重叠检测 | **缺前沿读取端**：没有命令回答"现在哪些功能/切片可以开工" |
| 一个会话只解一张票然后**停**；低分辨率读 map | 三跳（C-27）+ 不整目录加载（C-120）+ handoff（C-70） | 读的一侧已有，**缺"停"的规则**：k-new 一路做到底，k-impl 一功能多会话无切片边界 |
| to-spec 的"测试缝"（用最高的缝，尽量只一条） | C-37 每 AC 一条黑盒验收；DEC-168 黑盒/白盒 | **缺"缝在哪"的显式声明**——黑盒测试挂在哪个接口上，计划里没写 |
| to-tickets 的曳光弹纵向切片、单上下文装得下、可独立演示 | 功能计划"内部步骤"（zhaoxi F0 八步跨了十几个会话） | 缺切片尺寸规则；但"票=工作单元"与 C-19 冲突，只能在功能**内部**用 |
| domain-modeling：CONTEXT.md 只做词汇表、ADR 三判据 | CONTEXT.md（C-125）、DEC 的 adr 三判据（C-16） | 已有，且完全同构——keel 设计时已吸收过同作者的 grill-with-docs |
| `agents/openai.yaml`：Codex 侧显示名 + 禁隐式调用 | AGENTS.md 里 User/Model 技能两张清单；`gate sync` 只镜像到 `.claude/skills` | **缺**：Codex 是 F16 的 primary 平台之一，k-init/k-change/k-accept 这类"用户技能"在 Codex 上没有禁隐式调用的元数据 |
| 机器执法（谁能豁免、谁能批准） | L3 CI 权威、NO_WAIVE、APR 人类身份 | keel 独有；wayfinder 全靠提示词 |

## 结论

- **决定（建议）**：选 **B**，逐条借鉴，不整套采用。A 会把记录从 keel 的哈希/门禁链里挪出去，且与 C-19、C-06 正面冲突；C 放着七条缺口不管。
- **理由**：keel 与 wayfinder 同源（ADR 三判据、CONTEXT.md 词汇表、grilling 都能对上），差别在两处——wayfinder 有更好的**会话纪律与前沿可视**，keel 有 wayfinder 没有的**机器执法与记录链**。借它的纪律，留自己的执法。
- **借鉴清单（按价值/成本排序，第 1–3 条要 DEC，4–7 条改技能文字即可）**：
  1. **前沿读取端**：功能计划前言加 `blocked_by: [F1, F3]`；`gate status` 打印"前沿"（未阻塞、未 claim 的功能）；G-plan 校验引用存在。触碰计划模板与 G-plan → DEC。
  2. **fog 的判据与升级规则**写进 k-grill / k-new：`未决问题` 只收"现在能精确提问"的条目；不能的写进"尚未成形"段；出了范围的写"范围外"且不回流。基线仍是一次点头（C-06 不动），但允许 **bounded destination**：大项目按 epic 分批基线，避免 zhaoxi v1 式一次 80 条。触碰 C-05/C-06 的解释 → DEC。
  3. **prototype 作为记录种类**：`gate new spike`（或 RES 的 `kind: prototype`）——必须写明回答哪个 DEC/REQ 的问题、一条命令能跑、一次性分支 + 记录编号、结论只进 DEC 不进产品代码（对齐 C-127）。新 kind → DEC。
  4. **k-research 加两条**：charting 阶段把 AFK 研究票并行放子代理（各自分支/文件，回来只交 RES 编号）；标准/深度档"一手源优先，二手只作日期与旁证"（本 RES 已按此写）。
  5. **k-impl 加会话纪律**："一个会话一个切片，切片 = 单个新上下文装得下、可独立演示；切完更新 worklog 就停"，切片写在功能计划"内部步骤"里（不引入 ticket 作工作单元，C-19 不动）。
  6. **功能计划"测试义务"节加"缝"**：写明黑盒验收测试挂在哪个接口/命令上（尽量最高、尽量一条）——给 DEC-168 的黑盒一个物理落点。
  7. **`gate sync` 为每个 k-* 技能生成 `agents/openai.yaml`**：User 技能 `allow_implicit_invocation: false`，Model 技能 true；F16 的 Codex 触发实测顺带有了依据。
- **不借**：issue tracker 作记录载体（违反 C-73 记录即载体、C-120）；`.scratch/` 式仓内草稿（作者自己也说会"accidental persistence"，keel 的 evidence/ 已是 gitignore 特例）；"票=工作单元"（C-19 明令）。
- **反向教训**：wayfinder 最常见的失效——约束与豁免写在同一份被约束者拥有的文件里——在 keel 里以 `[proxy]` 的形式存在。DEC-168 的复审阈值（proxy > 1/3）要真的跑，建议 `gate status` 把 proxy 数打出来。
- **备选**：只做第 4–7 条（零 DEC），先看一个功能周期的效果，再决定 1–3。

## 借鉴清单详述（供 DEC 引用）

### 1. 前沿读取端：`blocked_by` + `gate status` 打印"现在能开工什么"

- **它怎么做**：票之间用 tracker 原生依赖连边；前沿 = 开着、未阻塞、未领取；GitHub 用 `gh api …/dependencies/blocked_by`，本地模式"扫目录，取第一张未阻塞未领取的"。领取 = 开工前先 assign 给自己。
- **keel 现在**：`claim.json` 记功能被谁领了（`gate worktree add`）；`overview-vN.md` 的"实施顺序与依赖"是散文；耦合表 I-nn 记接口从谁到谁，不记谁先谁后；`gate worktree` 的重叠检测只看"预计触碰文件"是否撞车（C-114）；`gate status` 打印波次、计数、交接路径——没有一行回答"哪些功能现在可以开工"。
- **缺口与实证**：zhaoxi 的 handoff 得手写"F0 与 F1、F6 原语同波；建议 `worktree add F0`"；第二个 harness 接手时只能读散文猜。C-112/C-114 已经假设并行，却没有并行需要的第一个读取端。
- **形状**：功能计划前言加 `blocked_by: [F1, F3]`（功能编号，可空）。`gate status` 加两行：`frontier: F2 F6`（阻塞者全部有 summary.md、且自己无 claim.json 的功能）、`blocked: F4 (by F1)`。G-plan 校验：引用的功能存在、无环。`gate worktree add Fnn` 对被阻塞的功能给 WARN 不阻止（DEC-155 说 worktree 是建议不是强制）。顺带把 DEC-168 的 proxy 计数也印在 status 里（`proxy_acs: 1`），让">1/3 复审"有读取端。
- **触碰**：feature-plan 模板、G-plan、status 输出 → **DEC**。成本：前言解析复用 `frontmatter.ts`，status/G-plan 各几十行，黑盒测试（三功能 fixture → status 前沿正确；环 → G-plan FAIL）。
- **不借的代价**：并行永远靠散文和口头；每次交接重新推一遍顺序。

### 2. fog 的判据与升级规则 + 按 epic 分批基线

- **它怎么做**：Destination 先定；fog（Not yet specified）只收"能感觉到但还说不精确"的；判据是"能否**现在**把问题说精确，不是能否回答"；解一张票就把已能精确提问的升成新票；范围外单独一节，永不回流；FAQ 明说 map 要按"一个 epic"划，"implement V1" 式的大 map 会在第 13 张票时作废后面的。
- **keel 现在**：需求书有 `未决问题` 节（C-05），基线前不许有活的 `[NEEDS-CLARIFICATION]`（G-req）；基线 = 整份文件一次点头（C-06）+ 缺口猎取；每条 REQ 有 non_goals。zhaoxi v1 的 `未决问题` 实际是一张 32 问的问答日志（已答/待调研/待访谈混在一起），F4 五条 REQ 整块 deferred、F7 "待调研"，全部塞进同一份基线里等一次点头。
- **缺口与实证**：没有规则说什么该成 REQ、什么该留在未决、什么该出范围；基线粒度是整份文件，大项目被迫一次写完（zhaoxi 80+ 条），第二天就出了 CHG-001，DEC-010 从 confirmed 翻回 provisional——正是作者描述的瀑布陷阱。
- **形状**：需求书固定三节：`## 未决问题`（每条是一句**问句** + 阻塞谁，待用户或待 RES）、`## 尚未成形`（fog：只写方向，不切条）、`## 范围外`（不回流，回流须 CHG）。升级规则：尚未成形 → 未决问题的条件是"能写成问句"；未决问题 → REQ/DEC/RES 之一。G-req 加一条便宜检查：`未决问题` 里的条目要么以 `?` 结尾要么带 `→ RES-/DEC-`（复用 k-grill 的数问号规则）。分批基线：k-new 允许按 epic 建 `vN.md`（前言 `scope: [F0, F1, F2]`），后续 epic 走既有的"新版本 + APR"，C-06 的"一份文件一次点头"不动。
- **触碰**：C-05 的解释、G-req 新检查、k-grill/k-new 文字 → **DEC**。成本：技能文字 + 一条 G-req 分支 + 正反 fixture 测试（zhaoxi v1 作正样本实测，ISS-038 教训）。
- **不借的代价**：下一个大项目重演 zhaoxi v1：一次写全、批准后立即改。

### 3. prototype 作为记录种类

- **它怎么做**：原型 = 回答**一个具体问题**的一次性代码；逻辑问题做可点的 HTML 状态机，UI 问题做多变体切换；规则：从第一行就标明临时、一条命令能跑、状态只在内存、不写测试不做抽象、结论搬进产品代码后原型留在一次性分支并写上票号；**变体由人选，agent 不许自己选**。
- **keel 现在**：没有这个种类。zhaoxi 的 DEC-012 把八项 spike 实测直接写进 DEC 正文；DEC-009 用 `research_exemption: 本机实测即证据`——就是没有记录的 spike；规划里 S1–S5 spike "各出 RES 新版本 / DEC，不写产品代码"。C-127 管 notebook，C-31 豁免级只要求"留痕"。
- **缺口与实证**：spike 的代码在哪、怎么复跑、结论去了哪，三样都没有固定落点；DEC-010 的壳选型推给"F6 的壳 spike"，到时候的产物没有地方放。
- **形状**：不加新目录，RES 加 `kind: spike`，必填 `question:`（回答哪个 DEC/REQ）、`run:`（一条命令）、`branch:`（`spike/<RES 编号>`，一次性）、`outcome:`（→ DEC-nnn）。G-research 对 spike 按本地档判（命令即证据）。规则两条：结论只进 DEC 不进产品代码；多个变体列出来让用户选（C-03）。
- **触碰**：RES 模板、rescheck、k-research 文字 → **DEC**（记录结构）。成本：模板字段 + rescheck 一个分支 + 测试。
- **不借的代价**：继续把 spike 塞进 DEC 正文，复跑命令随会话丢失。

### 4. k-research：charting 时并行放研究 + 一手源优先

- **它怎么做**：建 map 时对每张 research 票起一个子代理并行跑，各自写在 `research/<name>` 分支，回来只报文件位置与摘要；research 技能只许一手源（官方文档/源码/规范），二手不算，引文 ≤125 字。
- **keel 现在**：k-research 在主上下文里顺序做（k-new 第 2 步）；G-research 要求标准/深度档有引用，不要求一手；zhaoxi 的 RES-001~008 在同一个访谈会话里顺序写完，吃掉了访谈上下文。
- **形状**：k-research 加两段——"≥2 个互不依赖的问题时，各起一个空白上下文子代理，各自 `gate new res` 写文件，只回传编号；主上下文读 INDEX 不读正文（C-120）"；"标准/深度档：事实引一手源，二手只作日期与旁证并标明"。不动 gate。
- **触碰**：技能文字，**不需要 DEC**。成本：几行。本 RES 已按此写作为样例。
- **不借的代价**：大项目的调研继续串行、吃主上下文。

### 5. k-impl：一个会话一个切片，切完就停

- **它怎么做**：一个会话只解一张票，记一行，停；to-tickets 把 spec 切成"曳光弹式纵向切片"——贯穿所有层、单个新上下文装得下、可独立演示、阻塞者在前编号。
- **keel 现在**：工作单元 = 功能（C-19，禁 ticket）；计划有"内部步骤"（zhaoxi F0 八步）；worklog 追加保证可恢复（C-75）；handoff 在收尾写（C-70）。没有"什么时候停"的规则。
- **缺口与实证**：zhaoxi F0 一天十几条 worklog、跨多次上下文重置，评审 round 0 六条 blocking 全是"步骤没法单独演示"的后果；"修 A 引入 B"的链条都发生在长会话里。
- **形状**：k-impl 加"切片纪律"：内部步骤的每一步必须可用一条命令验证、单个新上下文装得下、纵向贯穿；**一个会话做一步**：实现 → 测试 → worklog 一行带证据 → `check --quick` → k-handoff 停，除非用户说继续。feature-plan 模板的"内部步骤"每条加 `verify:` 一栏（建议性）。不引入 ticket，C-19 不动。
- **触碰**：技能文字 + 模板一栏（建议性），**不需要 DEC**（若与第 1/6 条一起改模板，可并入那张 DEC）。
- **不借的代价**：会话越长、修复造缺陷的速率越高（zhaoxi round 0→2 的实测曲线）。

### 6. 功能计划"测试义务"加"缝"

- **它怎么做**：to-spec 写 spec 时先画"测试缝"——测试从哪一层打进去；"用最高的缝，尽量只一条"，新缝也要提在最高点；用户确认缝再往下写。
- **keel 现在**：C-37 每 AC 一条黑盒验收；DEC-168 定义黑盒 = 只用需求点名的输入、只断 AC 承诺的结果；但黑盒测试**挂在哪**（CLI？HTTP？模块 API？）没人写。
- **缺口与实证**：zhaoxi REQ-006 的代理测试就是缝的问题——AC 的缝（问答管道）在 F0 还不存在，测试只能挂到更低的 `autoActionAllowed()` 上，事后才被标成 `[proxy]`。如果计划里写了"REQ-006 黑盒缝 = `/zhaoxi ask`，F2 才有"，proxy 与解除条件在规划时就是已知的，不是评审时才发现。
- **形状**：feature-plan 模板"测试义务"节加一张表：`| REQ/AC | 缝（黑盒测试挂在哪） | 状态（真验收 / proxy 至 Fnn） |`；k-impl 要求黑盒测试挂在计划点名的缝上，`[proxy:…]` 的解除条件必须与表里一致。暂不加门禁（将来 X-trace 可以对账 proxy 注记与计划）。
- **触碰**：模板 + 技能文字，**不需要 DEC**；与第 1 条同改模板时并入。
- **不借的代价**：proxy 永远是事后发现，DEC-168 的 WARN 只能救火不能预防。

### 7. `gate sync` 生成 `agents/openai.yaml`

- **它怎么做**：wayfinder 目录里五行 `agents/openai.yaml`：`interface.display_name/short_description`、`policy.allow_implicit_invocation: false`。OpenAI 文档：默认 true；false 时 Codex 不把该技能放进隐式上下文，只能 `$skill-name` 显式调。issue #516：Codex 不认 SKILL.md 前言的 `disable-model-invocation`，必须靠这个文件。
- **keel 现在**：AGENTS.md 把 16 个技能分成 User（k-init/k-new/k-impl/k-change/k-accept…）与 Model（k-grill/k-research/k-decide/k-evidence/k-log）；`gate sync` 只镜像到 `.claude/skills`（DEC-147）；F16 把 codex 列为 primary，W5 触发台账里 Codex 是"未实测"；技能前言只有 name/description。
- **缺口与实证**：在 Codex 上 16 个 k-* 全部可被模型隐式调用，包括 k-accept、k-change、k-init——这三个恰是 keel 规定必须由人发起的动作。
- **形状**：`gate sync` 从 SKILL_CATALOG 为每个 k-* 生成 `.agents/skills/k-*/agents/openai.yaml`：display_name = 技能名，short_description = description 第一句，User 技能 `allow_implicit_invocation: false`，Model 技能 true；X-skills 校验文件存在且与目录一致。
- **触碰**：`gate sync` 产物、X-skills 判据、技能目录多一个文件 → **小 DEC**（DEC-147 的延伸）。成本：生成器 + 校验 + 测试，半天内。**未核实**：本机没装 Codex，效果只有文档与 issue 为证；落地后应按 W5 台账做一次 Codex 触发实测。
- **不借的代价**：Codex 上"人类动作"技能可被模型自启。

### 建议顺序

1. 先做 **4、5、6**：只改技能与模板文字，不需要 DEC，一次提交。
2. 再立 **1** 与 **7** 两张 DEC：机械、价值高、直接服务多 harness 并行（用户团队的实际形态）。
3. **2** 与 **3** 等 zhaoxi 下一次 k-new / k-change 或 F6 壳 spike 到来时再立——那时有真样本可实测判据（ISS-038 教训）。

## 剩余不确定性

- 未实跑 wayfinder；"一票一会话"在真实项目上的 token 成本没有作者数据，只有 FAQ 的定性描述（"genuinely slower and denser"）。
- `agents/openai.yaml` 对 Codex 的实际效果只有 OpenAI 文档与 issue #516 的描述，本机没装 Codex 未实测 `[未核实]`。
- Releases 页的日期年份抓取不一致 `[未核实]`；CLI 包是否以别名发布 `[未核实]`。
- 第 1 条"前沿"要不要同时管"切片"级别（功能内部）——取决于第 5 条先落地后的实际需要。
