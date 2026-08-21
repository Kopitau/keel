<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# 调研汇总索引

> 调研执行：2026-08-17（六路并行）；R2/R3a/R4 因周限额中断，2026-08-21 续跑完成并补验。
> 用法：本文件只做导航与交叉结论；细节与全部引用见各报告（每份自带 References + 访问日期，未核实项显式标注）。

## 报告清单

| # | 文件 | 主题 | 一句话结论 |
|---|------|------|-----------|
| R1 | `R1-pocock-grilling-lineage.md` | Matt Pocock（grill-me 作者）全部工作 | grilling 原语（rounds/frontier + 每题推荐 + facts-vs-decisions + confirmation gate）可直接采用；但 grill **不产生结构化记录**——"决策账本 + 稳定 ID"是作者本人认可（#341）却未落地的缺口，正是我们要补的 |
| R2 | `R2-harness-capability-matrix.md` | 六 harness 能力矩阵（2026-08 实测） | `AGENTS.md + .agents/skills/`（标准字段）= 五家零适配交集，唯 Claude Code 需桥；PreToolUse 拦截六家可达，但 Stop 完成门仅 3 家且 Grok fail-open → **权威执法只能放 CI 复跑** |
| R3a | `R3a-trellis-and-spec-frameworks.md` | Trellis 深审 + 8 个主流框架 | Trellis 四痛点结构性证实（research 可选、门禁全软、记录滚动流水、功能级 handoff 缺失被官方推迟）；**功能↔测试追溯 + 测试证据机器校验是全场空白 = 本框架最大差异化**；记录必须被后续步骤消费，否则会像 Agent OS decisions.md 一样烂掉 |
| R3b | `R3b-community-practices-and-failure-modes.md` | 社区实践与失败模式（2025–2026） | 跨厂商共识十条 + 失败模式 F1–F13 目录；元结论：**机械可判定→lint/hook/CI；语义判断→新上下文独立评估者；剩下才写短小规则** |
| R4 | `R4-model-landscape-implications.md` | 2026-08 模型版图与设计含义 | "Sol 5.6" = OpenAI GPT-5.6 Sol；**作弊/虚假完成随能力恶化**（METR：GPT-5.6 Sol 作弊率历来最高；ImpossibleBench 50–54%）→ 外部验证不可省；巨型规则文件与微任务切分应删（AGENTS.md 类文件平均 +20% 成本无普遍收益；compaction 后事实 106/108 丢失 → 状态必须落盘拉取） |
| R5 | `R5-enforcement-evidence-traceability-ci.md` | 强制层工程 | 五层强制 L0 指令→L1 harness hook→L2 git hooks（`.githooks/`+core.hooksPath）→L3 CI（权威）→L4 人工审批；单一 `gate.py`（Python≥3.11 stdlib）五处共用；证据绑 `git write-tree` 树哈希；审批 = 制品 sha256 + 人类身份提交 + CODEOWNERS；trailer 追溯（prepare-commit-msg 不受 `--no-verify` 抑制） |

## 六路交叉后的十一条设计公理

1. **证据链优先于自述**：完成只认"命令 + 退出码 + 输出 + 与当前代码树绑定的哈希"，不认 agent 的话（R3b F4；R4 作弊趋势；R5 证据格式）。
2. **事实归 agent，决策归人**：能查代码/文档/网络的不许问用户；取舍必须问用户（R1 A4）。
3. **共识先于产物**：需求与方案未确认不得动手（R1 A6 confirmation gate）。
4. **三层分工**：机械可判定 → 脚本/hook/CI；语义判断 → 新上下文独立评审（可异构模型）；其余才写短小、具体、可验证的自然语言规则（R3b 元结论）。
5. **单一事实源 + 薄桥**：核心文件写一次（AGENTS.md + .agents/skills/ + 记录目录），平台差异只存在于桥接层（R2）。
6. **记录必须被消费**：每类记录都要指定"谁在哪个步骤必读"，否则必然腐烂（R3a Agent OS 教训）。
7. **仪式随规模伸缩，证据与审批不打折**：快车道可以省访谈省调研，不能省测试、证据与验收（R3a；R3b F1）。
8. **一任务一上下文 + 状态外置**：任务大小以一个新鲜上下文窗口为界；会话开场从文件拉状态，绝不依赖模型记忆（R1 A16/A23；R4 compaction 失忆证据）。
9. **权威执法在 CI，harness hook 只是加速器**：Stop 门仅 3/6 家可用且有 fail-open，绕过 git hook 有实证（R2；R5 #40117）。
10. **框架组件 = 对模型缺陷的假设**：模型升级后逐个复审删减，避免脚手架化石化（R3b 共识第 10 条；R4）。
11. **教训必须闭环**：问题记录必须转化为 test/lint/hook/规则/决策之一，或显式 wontfix + 理由，任务才许归档（R3a GSD `recurrence_guard` + compound-engineering；R3b 3f）。
