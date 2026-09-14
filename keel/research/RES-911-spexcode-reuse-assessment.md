---
id: RES-911
title: SpexCode 可借鉴机制评估
depth: standard
date: 2026-09-14
features: [F1, F2, F4, F6, F12, F16]
oss: []
source_repository: shuxueshuxue/Spexcode
source_revision: eebe41c6d1a48d74bab131e547466bca7f69b4d7
source_version: 0.7.0-next.22
status: research-only
---

# RES-911 SpexCode 可借鉴机制评估

## 范围与方法

本研究在 keel 0.13.0 优化完成、本地提交 62facd7 且完整检查无失败之后开始。仅调研和建议，不把下列候选转成已授权实施义务，不引入代码或依赖。

检索有两个同名项目：规格驱动开发的 [shuxueshuxue/Spexcode](https://github.com/shuxueshuxue/Spexcode)，以及 VS Code 扩展 fork bellodox/SpeXcode。按与本任务相关的规格驱动项目继续，并已向用户提示歧义；未收到更正，不能写成用户另行确认了仓库。

核对了官方仓库 README、固定提交的规格文件、guidance-catalog 实现、specs/anchors 的相关实现段、CLI/help、包清单与 LICENSE。Git clone 遇到网络空响应，转用 GitHub 官方 API/原文件和文档站读取；未安装或运行 SpexCode、未执行其 hooks/服务、未验证其跨平台性能或生产稳定性。

## 版本与资料可信度

- 固定[源码提交](https://github.com/shuxueshuxue/Spexcode/commit/eebe41c6d1a48d74bab131e547466bca7f69b4d7)时间为 2026-09-14T02:54:42Z，包清单版本为 0.7.0-next.22。同日 npm 查询的 latest 为 0.7.0-next.20、next 为 0.7.0-next.22；这些是访问时状态，不是长期版本保证。[包清单](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/package.json)
- [文档站的 guidance 发布信息](https://spexcode.net/guidance/)固定在另一提交 53f448b008ada602ea5122a7c3104216d3233885，不能把页面“最近抓取”当作与 main 一致。
- 搜索摘要和文档导航仍描述 spec-eval，但固定提交的完整 Git 树已无该模块（仅留下相关 issue 文件），根 workspaces 不含它，当前 [CLI](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/spec-cli/src/cli.ts)与 [help](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/spec-cli/src/help.ts)也无 eval 命令。当前 README 改为真实产品证明与 session files。因此不推荐“移植当前 eval 子系统”。
- [LICENSE](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/LICENSE)为 MIT。本轮只评估机制，未复制实现，故 oss 为空。若以后复用代码，应另记固定版本、许可及实际复用点。

判断：有可检索源码、发布包与实际实现，适合参考；仍处于 next 预发布且规格/文档正在演进，不宜未经试点就成为 keel 的运行时基础。

## 与 keel 的定位关系

SpexCode 把规格资产、会话/worktree 运行时和仪表盘分层；keel 的职责是保留需求、选型、决定、功能证据和交接，不接管模型编排。优先借鉴资产组织、导航、证据表达和来源透明度。其 Node ≥22 与本项目兼容，但 [spec-core](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/packages/spec-core/package.json)有 Tree-sitter WASM 运行依赖，[CLI](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/spec-cli/package.json)还依赖多个会话/协议包；整包引入会改变本项目 Node builtins-only 的运行契约。

## 建议一：代码归属与只读影响导航（优先）

SpexCode 区分决定规格是否需复核的 govern 关系与仅提供上下文的 related 关系，并提供按文件反查。当前 [governed-related 规格](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/.spec/spexcode/spec-cli/source-of-truth/governed-related/spec.md)和 CLI owner 分支都能核对到这一区别。

keel 已有 REQ → feature → 测试，但缺少可靠的“这个实现文件影响哪些承诺”入口。可以在现有功能计划中选择性补实现文件/相关文件映射，按路径或本轮 diff 查出受影响的 REQ、功能、接口、测试和人工核验条件。沿用现有记录，不创建第二棵 .spec。

最小切片是文件级只读查询和变更摘要，不阻塞提交、不宣称代码变化必然代表语义漂移。允许一个功能跨多个文件和共享模块，不复制“一节点只管一个文件”或 owner 数量上限。后续只有文件级提示确实过粗时，才评估函数锚点与解析器成本。

验收重点：映射/相关关系明确区分；改名、删除和不存在路径可见；未映射与已确认无影响区分；用户暂存区不变。收益是更快恢复上下文和判断回归范围，成本是维护少量关键文件映射。

## 建议二：可审计的指令来源清单（优先）

[GuidanceCatalog 实现](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/spec-cli/src/guidance-catalog.ts)把已有 prompt/help/guide 注册表投影为稳定目录，记录来源、版本、内容哈希与输出类型；它把真正发送的 hook 文本和纯信号分开，而不是把行为说明当成实际提示词。

keel 可以给已有 status/doctor 增加只读的“可发现/已生成指令清单”：受管 AGENTS 段、项目自有规则、skill 入口及参考文件、源版本、哈希、调用策略与同步差异。核心价值是回答“这条限制来自哪里”“源文件已更新但消费者或镜像是否仍旧”。

不新建提示词编排器或第二份指令编辑库，不默认把全部正文塞进模型上下文。没有宿主运行期观测时，只报告静态可发现或已生成内容，不能称为“当前模型实际收到的全部上下文”。

验收重点：输出确定、只读；来源与镜像可追踪；只发生同步漂移时给差异；隐藏/未观测的宿主指令不臆测。实现可以继续使用 Node 内置库。

## 建议三：面向人的证据报告（优先，按任务规模）

[review-report 技能](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/.spec/spexcode/.plugins/skills/review-report/spec.md)把变更、阅读顺序、前后对照、命令结果和未验证项聚合，让证据紧邻所支持的结论；它的具体选择是自包含 HTML。

keel 可以把这一组织方式做成可选交付视图：用户目标 → 功能结果 → 实际操作/输入 → 观察输出 → 证据指针 → 未验证项。默认 Markdown 就够；涉及截图、多轮问答或 UI 对比时再输出单页 HTML，引用现有 verify/JUnit 与原始材料，不再复制一套状态。

0.13.0 的 summary 模板和按类型汇总已打基础；净新增应是聚合与阅读体验，而不是重复创建证据制度。taotie 的原值查询四场景报告就是适合推广的已有实践。

不复制“所有工作必须交一份 HTML”或“绝不能单独给原始文件”的绝对限制。大证据可保留内容哈希与位置，先复用当前证据路径，不立即建设独立 blob 服务。报告自身不提高证据真实性，也不把旧截图或汇总自动认证为当前通过。

## 建议四：原始意图与展开说明分层（低成本增强，已有部分覆盖）

[three-part-body](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/.spec/spexcode/spec-cli/source-of-truth/three-part-body/spec.md)实际采用 raw source / expanded spec 两部分，并兼容没有这些标题的旧文档；[specs.ts](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/packages/spec-core/src/specs.ts)可看到对应可选解析。

keel 可在复杂需求中更直观地展示用户原话/已定边界与 agent 的工作解释，避免方案推导被误认为用户要求。CHG/APR 范围授权与 working 版本已经覆盖大部分，不必新增记录类型或迁移全部历史。

不照搬“当前状态全部从 Git 推导”的结论：Git 可以证明提交、版本和变更，不能证明真实交易日跑完、用户已授权某一步或数据具备资格。handoff 仍需保存来源明确的当前事实；冻结的行为与验收标准发生变化仍须按原规则出新版本。

## 建议五：静态功能/架构导航图（按需）

[atlas 技能](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/.spec/spexcode/.plugins/skills/atlas/spec.md)先选择值得画图的节点，并允许跳过无结构可展示的叶子，这一点适合保留。

keel 可由现有 feature、REQ 和 I-nn 关系导出只读总览或单文件 HTML，让用户从功能定位计划、实现与证据。首先服务真实复杂项目；不要求每条 REQ 一个 diagram.json，不引入常驻服务器、会话面板或新的权威图数据库。图片中的推断与未验证状态必须可见。

验收重点：图的关系来自同一份记录、链接可用、更新不反写需求；简单任务仍可以只用列表。

## 建议六：仅记录接入模式（未来确有采用需求时）

当前 README 和 init/help 源码有 --pure 分支，可先创建规格资产，不装 hook 或修改 agent 配置。keel 若要支持“先整理需求与选型，之后再采用完整流程”的使用者，可以提供同等轻量的仅记录接入选项。

这不是当前使用者缺失的必需功能。只有出现真实采用需求再做；不得把缺少完整框架配置误报为安装失败，也不应为了该模式新增一套项目状态机。

## 明确不建议直接引入

- L1/L2 会话调度、tmux/PTY、常驻 HTTP/仪表盘和嵌套 supervisor：超出 keel 定位，并与已有宿主能力重复。
- 函数锚点漂移直接阻塞提交：现有 [anchors 实现](https://github.com/shuxueshuxue/Spexcode/blob/eebe41c6d1a48d74bab131e547466bca7f69b4d7/packages/spec-core/src/anchors.ts)涉及语言解析、历史行范围、改名/合并与缓存；这是可计算变更信号，不能替代语义审阅。先用文件级提示证明价值。
- 强制每个节点只对应一个实现文件、按 owner 数量要求拆文件：不适合自然跨文件的产品功能，可能重新产生过度拆分。
- 每次结束前必须提交、每次修复必须人为制造 red 的统一限制：仍按 keel 当前的任务范围、可行性、真实证据和交付状态处理。
- 文档站残留的 spec-eval 整套机制：固定源码已不再提供它，不将历史介绍当成当前成熟能力。

## 推荐顺序与未验证项

优先一个小切片：实现文件反查 + 本轮变更影响摘要，默认只读和建议级。第二步是指令来源清单与可选证据聚合。意图分层可随实际记录改进，静态图与仅记录模式在真实需求出现时再做。

以上是基于源码和文档的适配建议，不是已实现功能、性能承诺或采用决定。没有对 SpexCode 进行安装运行、浏览器交互、Windows/WSL2、长历史压力或维护成本实测；不使用 stars、提交总数或项目自己的宣传替代这些证据。
