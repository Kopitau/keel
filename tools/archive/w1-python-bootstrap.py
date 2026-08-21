#!/usr/bin/env python3
"""ARCHIVED (CHG-001 / DEC-149). Do not evolve.

Original W1 one-shot: migrate design-round artifacts into keel records (F23/C-137).
Mission complete; Python gate runtime superseded by Node+TS.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KEEL = ROOT / "keel"
DOCS = ROOT / "docs"
MARKER = "<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->"

FEATURES: list[dict] = [
    {
        "fid": "F1",
        "req": "REQ-001",
        "slug": "f01-requirements-interview",
        "title": "需求访谈与记录",
        "must": "必需",
        "wave": "W4",
        "w1": "需求书迁入 + 条目模板",
        "cs": "C-02~C-07",
        "desc": "新项目/新功能先结构化访谈：事实 agent 自查、取舍留给用户、每问附推荐、模糊处禁止脑补；收敛后形成带编号需求条目，未收敛不进设计。",
        "acs": [
            "Given 本轮所有可问问题已齐 When 提问 Then 一次列出全部（编号+每题推荐）；有依赖的留下一轮；用户可切到一次一问（C-02）",
            "Given 问题可从代码/文档/网络查清 When 访谈 Then 不问用户（C-03）",
            "Given 一条需求 When 写入 Then 含 REQ 编号、状态、来源、描述、验收标准、边界与反例、非目标（C-04）",
            "Given 验收标准 When 书写 Then 以 GWT 为主，简单条目可用 checklist（C-07）",
            "Given 模糊点 When 记录 Then 标 [NEEDS-CLARIFICATION: 具体问题] 且未解分支进需求书「未决问题」节（C-05）",
            "Given 大功能/新项目点头前 When 基线确认 Then 未参与访谈的新上下文先挑遗漏矛盾；用户整体点头一次=基线（C-06）",
        ],
        "bounds": "未收敛不得进设计。不问可自查事实。",
        "non_goals": "不把访谈做成平台私有命令。",
        "test_level": "核心（协议）+ 功能级验收=无歧义测试（W4）。W1：需求书字段校验。",
        "files": [".agents/skills/k-grill/SKILL.md", "keel/requirements/", "keel/templates/requirements-entry.md"],
        "deps": ["F16", "F21"],
        "ifaces": ["I-01 写 requirements/vN.md"],
    },
    {
        "fid": "F2",
        "req": "REQ-002",
        "slug": "f02-research",
        "title": "强制调研",
        "must": "必需",
        "wave": "W4",
        "w1": "RES 包装迁入 + 模板",
        "cs": "C-08~C-12",
        "desc": "设计前必须调研，按风险分深度，产出带引用+日期的报告；不得零记录声称无需调研。",
        "acs": [
            "Given 新架构/关键依赖/数据模型/安全/公共接口/跨平台/高不确定 When 调研 Then 深度档：≥2-3 候选+一手引用+反例（C-08）",
            "Given 一份 RES When 落盘 Then 含问题/范围/候选/证据（引用+日期，未核实显式标）/结论三段/剩余不确定性，且通俗易懂（C-09）",
            "Given 重大决策无 RES When 过 G-调研 Then 不通过，除非 DEC 写豁免理由（C-10）",
            "Given 调研选用开源 When 结论落地 Then 强制建 OSS（C-11）",
            "Given 离线 When 调研 Then 用带来源/版本/日期的离线资料或明确停下，禁止凭印象选型（C-12）",
        ],
        "bounds": "调研不是可选步骤。",
        "non_goals": "不把网页摘录整篇复制进 RES（引用而非复制，C-69）。",
        "test_level": "核心：RES 格式与引用存在性。W1：包装文件指向原文。",
        "files": [".agents/skills/k-research/SKILL.md", "keel/research/", "keel/templates/RES.md"],
        "deps": ["F3", "F15"],
        "ifaces": ["I-02", "I-03"],
    },
    {
        "fid": "F3",
        "req": "REQ-003",
        "slug": "f03-decisions",
        "title": "技术方案逐条确认 + 决策账本",
        "must": "必需",
        "wave": "W1-migrate/W2/W4",
        "w1": "C-01~C-142 → 一决策一文件",
        "cs": "C-13~C-18",
        "desc": "每个技术决策单独呈报，用户逐条表态、当场记录；未拍板先推进的记暂定，带理由+复核触发条件。",
        "acs": [
            "Given 一条决策 When 落盘 Then 一文件，含机器头+通俗正文（问题/选项/推荐/用户原话/影响）（C-13）",
            "Given 状态迁移 When 非法（如 confirmed→proposed） Then 脚本拒绝（C-14）",
            "Given 用户表态 When 本轮 Then 当场写入，不积压到会话尾（C-15）",
            "Given 同时满足三门槛 When 记录 Then 打 adr 并写后果与复审，不另设 ADR 目录（C-16）",
            "Given 实现期低层可逆选择 When 非显然 Then 记 worklog 轻量决定；触碰高层边界升级（C-17）",
            "Given 暂定项 When 开场/复盘 Then 状态脚本显示计数，复盘销项（C-18）",
        ],
        "bounds": "agent 不得自行把 proposed 标成 confirmed。",
        "non_goals": "不另建 ADR 目录。",
        "test_level": "核心：状态机与必填字段。W1：142 条迁入+映射完整。",
        "files": ["keel/decisions/", "keel/templates/DEC.md", "tools/gate/gate.py"],
        "deps": ["F2", "F17"],
        "ifaces": ["I-02", "I-04"],
    },
    {
        "fid": "F4",
        "req": "REQ-004",
        "slug": "f04-unified-plan",
        "title": "统一实施规划",
        "must": "必需",
        "wave": "W1",
        "w1": "overview-v1 + 23 份小规划 + INDEX",
        "cs": "C-19~C-24",
        "desc": "技术方案落地时对所有功能统一规划；与方案基线捆绑一次确认；之后各功能开工不再单独审批计划。",
        "acs": [
            "Given 规划确认 When 查看 Then plan/INDEX 唯一指向 overview-vN；缺失或双指报错（C-24）",
            "Given 总览 When 阅读 Then 含功能清单、接口耦合表、实施顺序（C-24）",
            "Given 一功能 When 开工 Then 有 30~60 行小规划：范围/测试义务/内部步骤/触碰文件（C-24）",
            "Given 实施中 When 过程 Then worklog 追加式落盘（C-20）",
            "Given 触碰已确认接口/需求边界/规划外依赖/测试义务 When 继续 Then 必须先问用户（C-21）",
            "Given 中途新增功能 When 纳入 Then 走 CHG，不重开整份规划（C-23）",
        ],
        "bounds": "小项目≤3 功能可合并书写。本仓 23 功能必须总分结构。",
        "non_goals": "不拆任务票。不在每功能开工时再批一次计划。",
        "test_level": "核心：INDEX 唯一、小规划必填节。W1 即验收本条骨架。",
        "files": ["keel/plan/", "keel/features/*/plan/v1.md"],
        "deps": ["F3"],
        "ifaces": ["I-04", "I-05"],
    },
    {
        "fid": "F5",
        "req": "REQ-005",
        "slug": "f05-overhead",
        "title": "框架开销控制",
        "must": "必需",
        "wave": "W1-map/W4",
        "w1": "AGENTS 地图式；零 token 环节留给脚本",
        "cs": "C-25~C-30,C-69",
        "desc": "只省框架税且不损智：脚本做机械活，常驻短，导航不是枷锁，模板是便利，证据默认摘要。",
        "acs": [
            "Given 状态/门禁/索引/编号/骨架/镜像 When 执行 Then 走确定性脚本不经模型（C-25）",
            "Given 开场 When 装载 Then 仅根指令+技能名录，目标≤10KB（C-26，W6 校准）",
            "Given 开场 When 读上下文 Then 三跳后按需取用，不设墙（C-27）",
            "Given 长文初稿 When 扩写 Then 同模型 medium 思考；短记录内联（C-69）",
            "Given 省 token 方案 When 会损智能或功能 Then 不采用（C-69）",
        ],
        "bounds": "省 token 不以牺牲模型智能与功能实现为代价。",
        "non_goals": "不做花费记账（F20 明确不含）。",
        "test_level": "辅助：AGENTS 行数/字节。W1 测地图文件。",
        "files": ["AGENTS.md", "tools/gate/gate.py"],
        "deps": ["F16", "F20"],
        "ifaces": ["开场协议"],
    },
    {
        "fid": "F6",
        "req": "REQ-006",
        "slug": "f06-evidence",
        "title": "测试与完成证据",
        "must": "必需",
        "wave": "W3",
        "w1": "证据 JSON 模板 + 追溯标记约定",
        "cs": "C-31~C-38",
        "desc": "功能↔测试可追溯；完成只认机器可核验证据；门禁重跑对账；分级测试。",
        "acs": [
            "Given 核心代码 When 实现 Then 先测后码；辅助实现后必补；豁免留痕（C-31）",
            "Given 验收范围内测试 When 追溯 Then 按验收标准逐条对账，零引用=门禁不过（C-32）",
            "Given 一次测试运行 When 记证据 Then JSON 含命令/退出码/时间/commit/树哈希/报告哈希/计数/覆盖映射/输出尾 2KB/执行者（C-33）",
            "Given 代码树变化 When 旧证据 Then 自动作废（C-33）",
            "Given skip/删除测试 When 无 DEC 或 ISS 引用 Then 门禁报错（C-34）",
            "Given 核心新测试 When 留红灯证据 Then 先红后绿；修 bug=无补丁挂有补丁过（C-35）",
            "Given 每条验收标准 When 验收 Then ≥1 条可运行功能级验收测试（C-37）",
            "Given 耦合表一条接口 When 联动 Then ≥1 条契约/集成测试（C-38）",
        ],
        "bounds": "v1 不设覆盖率门与变异测试（C-36）。",
        "non_goals": "不把 notebook 探索当生产管道（C-127）。",
        "test_level": "核心（W3）。W1：模板存在、本仓格式测试带 req marker。",
        "files": ["keel/templates/evidence.json", "tools/gate/gate.py", "tests/"],
        "deps": ["F4", "F17", "F21"],
        "ifaces": ["I-06"],
    },
    {
        "fid": "F7",
        "req": "REQ-007",
        "slug": "f07-review",
        "title": "独立评审与人工验收",
        "must": "建议",
        "wave": "W4",
        "w1": "评审/验收材料模板要点写入规划",
        "cs": "C-39~C-44",
        "desc": "新上下文评审者对照需求与计划审 diff，只报正确性问题；然后用户按验收摘要验收。",
        "acs": [
            "Given 评审 When 启动 Then 未参与实现的新上下文；只给 diff/小规划/需求/证据/worklog 摘要，不给实现聊天（C-39）",
            "Given 工程轴 When 出报告 Then 只报影响正确性/需求达成的问题（C-41）",
            "Given blocking 回修 When 复审 Then 新一轮干净上下文，旧结论只当线索（C-42）",
            "Given 用户验收 When 提交材料 Then 五样齐（C-43）",
            "Given 已验收 When 合并 Then 仍走 F8，验收≠合并（C-44）",
        ],
        "bounds": "异构复审是可选配置，默认关（C-40）。",
        "non_goals": "评审者只报不改。",
        "test_level": "辅助（材料齐全检查 W2/W4）。",
        "files": [".agents/skills/k-review/SKILL.md", ".agents/skills/k-accept/SKILL.md"],
        "deps": ["F6", "F18"],
        "ifaces": ["I-07"],
    },
    {
        "fid": "F8",
        "req": "REQ-008",
        "slug": "f08-merge",
        "title": "合并/集成车道",
        "must": "必需",
        "wave": "W3-W4",
        "w1": "本地档说明 + no-mistakes 默认关",
        "cs": "C-45~C-50",
        "desc": "验收通过才许合并；CI 复算权威；no-mistakes 可选默认不装。",
        "acs": [
            "Given 合并 When 检查 Then 验收 APR+证据树哈希有效+追溯全绿+无未闭环 blocking（C-45）",
            "Given GitHub 档 When 合并 Then 一功能一 PR、squash、主干禁直推+required check（C-46）",
            "Given 本仓当前 When 合并 Then 本地档：hooks+合并前 gate+哈希 APR+合并说明存档（C-48）",
            "Given no-mistakes When 未装 Then 流程仍完整（C-47）",
            "Given 先合入者 When 在途功能 Then 提示 rebase+联动重跑，旧证据作废（C-50）",
        ],
        "bounds": "本地档防呆不防恶。Gitee 无 no-mistakes PR/CI 步。",
        "non_goals": "v1 不自动升级依赖。",
        "test_level": "核心：合并前置检查（W2/W3）。",
        "files": [".github/workflows/", "keel/config.json", ".githooks/"],
        "deps": ["F6", "F7", "F17", "F18"],
        "ifaces": ["I-07", "I-08"],
    },
    {
        "fid": "F9",
        "req": "REQ-009",
        "slug": "f09-retro",
        "title": "复盘与功能级总结",
        "must": "必需",
        "wave": "W1-seed/W4",
        "w1": "OVERVIEW 种子 + summary 模板",
        "cs": "C-51~C-56",
        "desc": "每功能完成强制功能总结+更新项目总览；开场必读总览。不含花费。",
        "acs": [
            "Given 功能合并成功 When 复盘 Then 立即写 summary 固定节（C-51/C-52）",
            "Given OVERVIEW When 复盘 Then 原地更新：是什么/路线图/能力清单/在途/风险与暂定计数（C-53/C-54）",
            "Given 复盘 When 销项 Then 暂定决策+问题闭环+摩擦候选三条都有记录（C-55）",
            "Given 标已完成 When 缺 summary/总览未更新/问题未闭环/销项无记录 Then 门禁不许（C-56）",
        ],
        "bounds": "OVERVIEW 不是冻结确认件，不版本化。",
        "non_goals": "总结不含花费说明。",
        "test_level": "辅助：固定节存在性（W2 G-复盘）。",
        "files": ["keel/OVERVIEW.md", "keel/templates/summary.md", "keel/features/*/summary.md"],
        "deps": ["F8", "F3", "F10", "F13"],
        "ifaces": ["I-08"],
    },
    {
        "fid": "F10",
        "req": "REQ-010",
        "slug": "f10-issues",
        "title": "问题日志与防复发闭环",
        "must": "必需",
        "wave": "W2/W4",
        "w1": "ISS 模板",
        "cs": "C-57~C-62",
        "desc": "问题当场记；归档前闭环成回归测试/lint/hook/规则/决策之一，或显式不修+理由。",
        "acs": [
            "Given 琐碎异常 When 未达提升条件 Then 只 worklog 一行（C-57）",
            "Given 正式 ISS When 书写 Then 含复现命令、根因、修复、为何未被更早发现、闭环选择与理由（C-58/C-59）",
            "Given 修 bug When 无复现 Then 不修，只收集数据；回归测试先行；3 次不成熔断（C-60）",
            "Given 同指纹再现 When 记录 Then 解释上次防线为何失效并升一级；同功能≥3 次触发 F13（C-61）",
            "Given 防线指针 When 门禁 Then 指向的文件必须存在（C-62）",
        ],
        "bounds": "可能复发的不许只留档。",
        "non_goals": "不因错误总数自动升级（看指纹）。",
        "test_level": "核心：指针存在性。",
        "files": ["keel/issues/", "keel/templates/ISS.md", ".agents/skills/k-log/SKILL.md"],
        "deps": ["F6", "F13"],
        "ifaces": ["I-09"],
    },
    {
        "fid": "F11",
        "req": "REQ-011",
        "slug": "f11-change",
        "title": "需求变更管理",
        "must": "想要",
        "wave": "W4",
        "w1": "CHG 模板 + 需求版本化目录",
        "cs": "C-63~C-68",
        "desc": "实现期需求只读；改需求走变更单→用户批→联动更新+旧证据作废。",
        "acs": [
            "Given 基线已确认 When 改当前 vN Then 门禁失败（C-66）",
            "Given CHG 批准 When 生效 Then 出新版需求+重索引，旧版保留（C-63/C-64）",
            "Given 批准 When 联动 Then 受影响 DEC 复核、功能规划新版、测试义务更新、旧证据作废（C-65）",
            "Given 纯文字澄清且验收语义不变 When 出澄清版 Then 免影响评估免重新确认（C-67）",
        ],
        "bounds": "紧急小改也走变更单。",
        "non_goals": "不原地改历史版本。",
        "test_level": "核心：改当前版=失败。",
        "files": ["keel/changes/", "keel/requirements/", ".agents/skills/k-change/SKILL.md"],
        "deps": ["F1", "F18"],
        "ifaces": ["I-01"],
    },
    {
        "fid": "F12",
        "req": "REQ-012",
        "slug": "f12-handoff",
        "title": "会话交接/断点续传",
        "must": "想要",
        "wave": "W1",
        "w1": "keel/handoff.md + journal 目录 + status 桩打印路径",
        "cs": "C-70~C-75",
        "desc": "会话收尾更新交接；新会话开场先跑状态脚本再读交接。不依赖平台会话格式。",
        "acs": [
            "Given 收尾或上下文将满 When 更新 handoff Then 含做了什么/为什么、当前功能与阶段、下一步、未决、该读文件（C-70）",
            "Given 新会话 When 开场 Then 三跳+OVERVIEW；status 含交接路径/未决数/暂定数（C-72）",
            "Given 换 harness When 接手 Then 只靠仓库记录，不靠原平台会话（C-73）",
            "Given worklog 随做随记 When 交接未写完 Then 可从 worklog 重建（C-75）",
        ],
        "bounds": "hook 双保险可选，不构成依赖（C-74）。",
        "non_goals": "不解析各平台会话 JSON。",
        "test_level": "辅助：handoff 节齐全、status 打印路径。W1 即测。",
        "files": ["keel/handoff.md", "keel/journal/", "tools/gate/gate.py"],
        "deps": ["F5", "F9"],
        "ifaces": ["开场三跳"],
    },
    {
        "fid": "F13",
        "req": "REQ-013",
        "slug": "f13-lessons",
        "title": "摩擦沉淀（经验观察者）",
        "must": "必需",
        "wave": "W4",
        "w1": "worklog 候选标签约定 + LES 模板",
        "cs": "C-76~C-81",
        "desc": "非阻断观察：五类信号打标签，自然边界核实后才成正式经验。",
        "acs": [
            "Given 五类信号之一 When 记录 Then worklog 一行 #经验候选+类型+一句话，不打断（C-76/C-77）",
            "Given 同指纹同功能≥3 次 When 出现 Then 强制升级候选（C-78）",
            "Given 复盘核实属实 When 沉淀 Then LES 含现象/教训/边界/反例+去向（C-79）",
            "Given 规划或评审 When 相关 LES 存在 Then 脚本提示，保证被读到（C-80）",
        ],
        "bounds": "不因错误总数自动升级。问题日志与经验互不替代（C-81）。",
        "non_goals": "不在实现中途强制停下来写经验。",
        "test_level": "辅助：标签汇集（W2/W4）。",
        "files": ["keel/lessons/", "keel/templates/LES.md"],
        "deps": ["F10", "F9"],
        "ifaces": ["I-09", "I-10"],
    },
    {
        "fid": "F14",
        "req": "REQ-014",
        "slug": "f14-knowledge",
        "title": "跨项目知识库",
        "must": "必需",
        "wave": "W1-empty/W4",
        "w1": "创建 ~/.keel/knowledge/ 空库+INDEX",
        "cs": "C-82~C-87",
        "desc": "项目经验可脱敏泛化提升到用户级知识库；进某项目正式规则仍走该项目确认。",
        "acs": [
            "Given KLES When 存放 Then ~/.keel/knowledge/ 一条一文件，不入项目仓（C-82）",
            "Given 提升 When 执行 Then 必须脱敏泛化，不自动同步（C-83）",
            "Given 开场 When 注入 Then 只索引摘要几行（C-84）",
            "Given 跨项目知识 When 成为本项目规则 Then 须本项目确认并注明 KLES 编号（C-85）",
        ],
        "bounds": "条数约 100 封顶提醒蒸馏（C-86）。平台自带记忆不算框架记录（C-87）。",
        "non_goals": "不把知识库当第二个 AGENTS.md。",
        "test_level": "豁免（用户目录文件）。W1：目录可建。",
        "files": ["~/.keel/knowledge/", "keel/templates/KLES.md"],
        "deps": ["F13"],
        "ifaces": ["I-10"],
    },
    {
        "fid": "F15",
        "req": "REQ-015",
        "slug": "f15-oss",
        "title": "开源复用登记与追踪",
        "must": "必需",
        "wave": "W2/W4",
        "w1": "OSS 模板 + 复查周期初值 28 天",
        "cs": "C-88~C-93",
        "desc": "直接复用开源必须登记并定期只读复查；不自动改代码。",
        "acs": [
            "Given 直接依赖 When 验收 Then 依赖清单与 OSS 登记表一致，缺则不过（C-89）",
            "Given OSS 条目 When 书写 Then 含精确版本或 commit、许可证、复用点、本地差异、追踪计划（C-88）",
            "Given 到期复查 When 执行 Then 只读对比，结论四选一，升级走 CHG（C-90）",
            "Given GPL/AGPL 借鉴改造 When 登记 Then 提醒用户决策（C-92）",
        ],
        "bounds": "传递依赖不要求登记。",
        "non_goals": "不自动 bump 版本。",
        "test_level": "核心：登记表对账（W2/W3）。",
        "files": ["keel/oss/", "keel/templates/OSS.md"],
        "deps": ["F2", "F11"],
        "ifaces": ["I-03"],
    },
    {
        "fid": "F16",
        "req": "REQ-016",
        "slug": "f16-platforms",
        "title": "六平台适配",
        "must": "必需",
        "wave": "W1-layout/W4-W5",
        "w1": "AGENTS.md + CLAUDE.md 桥 + 技能目录占位",
        "cs": "C-94~C-99",
        "desc": "一份 AGENTS.md + 标准技能目录五家零适配；Claude Code 一行桥+镜像；流程逻辑全在技能层。",
        "acs": [
            "Given Codex/OpenCode/Pi/Grok/dsh When 读指令 Then 原生 AGENTS.md + .agents/skills/（C-94）",
            "Given Claude Code When 读指令 Then CLAUDE.md 仅为 @AGENTS.md，技能从镜像读（C-94）",
            "Given 技能 When 书写 Then 只用标准字段，零私有字段不嵌套（C-95）",
            "Given Windows 上的 dsh When 运行其 SDK Then 文档标明走 WSL（C-96）",
            "Given 平台钩子 When 实现 Then 只转调同一 gate，一家失效不影响正确性（C-97）",
        ],
        "bounds": "Pi 为兼容档，冒烟即可。命名正式为 keel / keel/ / k-*（C-99）。",
        "non_goals": "零平台私有过程命令。不做重型中央编排（N4）。",
        "test_level": "核心：CLAUDE.md 一行、AGENTS 预算。W5 五家触发实测。",
        "files": ["AGENTS.md", "CLAUDE.md", ".agents/skills/", ".claude/skills/"],
        "deps": ["F17", "F20"],
        "ifaces": ["I-11"],
    },
    {
        "fid": "F17",
        "req": "REQ-017",
        "slug": "f17-gate",
        "title": "门禁强制层",
        "must": "想要",
        "wave": "W2",
        "w1": "gate.py status 桩 + hooks 占位 + PLATFORM-LIMITS",
        "cs": "C-100~C-105",
        "desc": "五层强制；一份 stdlib 脚本五处共用；CI 复算唯一权威。",
        "acs": [
            "Given gate When 实现 Then Python≥3.11 仅标准库，Windows UTF-8 启动（C-101）",
            "Given 六门禁 When 输出 Then 通过/警告/不通过+原因+修复指引；警告放行须 worklog 记理由（C-103）",
            "Given L1/L2 被绕过 When 推到远端 Then L3 仍按同一脚本全量重算（C-100）",
            "Given 改 hooksPath/--no-verify/改测试目录 When 检测 Then 提醒级拦截并有测试（C-105）",
        ],
        "bounds": "W1 桩只实现 status，不算六门禁落地。",
        "non_goals": "不在 W1 假装 check 已可用。",
        "test_level": "核心 pytest（W2）。W1：status 退出 0 且打印 handoff 路径。",
        "files": ["tools/gate/gate.py", ".githooks/", "tests/"],
        "deps": ["F21"],
        "ifaces": ["I-12"],
    },
    {
        "fid": "F18",
        "req": "REQ-018",
        "slug": "f18-approvals",
        "title": "审批记录机制",
        "must": "建议",
        "wave": "W1-draft/W2",
        "w1": "APR 模板 + 设计基线草稿（待人类身份提交）",
        "cs": "C-106~C-111",
        "desc": "审批留内容哈希+人类身份提交；错字不作废，语义变才重批。",
        "acs": [
            "Given 重确认 When 落 APR Then 含路径+版本+内容哈希+批准人+日期+范围（C-106）",
            "Given APR 提交作者 When 在 agent 清单内 Then CI 拒绝（C-107）",
            "Given 轻确认 When 对话同意 Then 当场记录可继续，不必 APR（C-110）",
            "Given 信任模型 When 文档 Then 写明防误记谎报、不防人为恶意（C-111）",
        ],
        "bounds": "不强制签名、不建密码学身份。",
        "non_goals": "agent 不得自行把草稿标成已批准提交。",
        "test_level": "核心：作者校验（W2/W3）。W1：草稿存在且 status=draft。",
        "files": ["keel/approvals/", "keel/templates/APR.md"],
        "deps": ["F17", "F21"],
        "ifaces": ["I-07"],
    },
    {
        "fid": "F19",
        "req": "REQ-019",
        "slug": "f19-parallel",
        "title": "多人团队 + 多 agent 并行",
        "must": "想要",
        "wave": "W2",
        "w1": "约定：一功能一分支一 worktree；W1 单写者",
        "cs": "C-112~C-117",
        "desc": "一功能一分支一 worktree；文件重叠即串行；提交尾注记身份。",
        "acs": [
            "Given 认领功能 When 开始 Then 建 keel/F-编号-短名 分支与 worktree（C-112）",
            "Given 双认领 When 检测 Then 报警；换手须释放或显式接管（C-113）",
            "Given 触碰文件与在途功能重叠 When 认领 Then 串行或接口先行（C-114）",
            "Given 提交 When 写入 Then 尾注含功能/开发者/平台模型/会话（C-115）",
        ],
        "bounds": "乐观并发，不搞心跳锁。OVERVIEW 只在复盘时由完成方更新（C-117）。",
        "non_goals": "不在 W1 并行多功能。",
        "test_level": "核心：重叠检测（W2）。",
        "files": ["tools/gate/gate.py", "keel/plan/overview-vN.md"],
        "deps": ["F4", "F17"],
        "ifaces": ["I-05"],
    },
    {
        "fid": "F20",
        "req": "REQ-020",
        "slug": "f20-context-budget",
        "title": "上下文预算控制",
        "must": "想要",
        "wave": "W1-values/W2-check",
        "w1": "初值写入 config + AGENTS 守 150 行 + 硬限档案",
        "cs": "C-118~C-123",
        "desc": "指令行数/字节上限进 CI；记录永不自动注入。不含花费记账。",
        "acs": [
            "Given AGENTS.md When 机检 Then 行数≤150 且链≤32KiB；超硬限不通过（C-118/C-119）",
            "Given 记录目录 When 根指令 Then 不批量注入（C-120）",
            "Given 技能数 When 超过封顶 Then 须下沉或改配置+记 DEC（C-121/C-123）",
            "Given 硬限数字 When 文档 Then 有出处（C-122）",
        ],
        "bounds": "超软预算=警告。",
        "non_goals": "不做 token 花费账本。",
        "test_level": "核心：预算机检。W1 测 AGENTS 行数与 CLAUDE 一行。",
        "files": ["AGENTS.md", "tools/gate/PLATFORM-LIMITS.md", "keel/config.json"],
        "deps": ["F16", "F17"],
        "ifaces": ["预算字段"],
    },
    {
        "fid": "F21",
        "req": "REQ-021",
        "slug": "f21-config",
        "title": "语言与项目类型配置",
        "must": "想要",
        "wave": "W1",
        "w1": "config.json + CONTEXT.md + 画像字段",
        "cs": "C-124~C-129",
        "desc": "指令英文/记录中文；测试基座按项目类型配置。",
        "acs": [
            "Given 根指令与技能 When 书写 Then 英文；记录正文中文、字段名英文（C-124）",
            "Given 术语 When 需要 Then CONTEXT.md 懒创建，只收术语与禁用近义词（C-125）",
            "Given 本仓 When 测试 Then python-cli 画像=pytest（C-126）",
            "Given 探索 notebook When 沉淀进管道 Then 逻辑迁出模块并补核心测试（C-127）",
            "Given config.json When 解析 Then 含画像/测试命令/身份/平台/预算/可选组件（C-129）",
        ],
        "bounds": "JSON 无注释语法，用 _comment 键；gate 忽略 _ 前缀。",
        "non_goals": "W1 不接 nbmake/Playwright 实跑。",
        "test_level": "辅助：JSON 合法、必填键存在。W1 即测。",
        "files": ["keel/config.json", "CONTEXT.md", "keel/templates/config.json"],
        "deps": [],
        "ifaces": ["I-15"],
    },
    {
        "fid": "F22",
        "req": "REQ-022",
        "slug": "f22-migrate",
        "title": "既有框架迁移",
        "must": "必需",
        "wave": "W1-maps/W4-skill",
        "w1": "Trellis/Superpowers 映射表 + 非结构化挖掘规则 + 本仓挖掘报告",
        "cs": "C-130~C-136",
        "desc": "把 Trellis/Superpowers 工件与 docs/ 不规范内容转换成 keel 初稿；只读源；双框架互斥须用户确认后才停用旧框架。",
        "acs": [
            "Given Trellis/Superpowers 源树 When 迁移 Then 按映射表转换，无理由 DEC 标暂定·需补理由（C-130）",
            "Given 迁移产物 When 落盘 Then 标迁移初稿（未确认），工具不替用户确认（C-131）",
            "Given 源目录 When 迁移 Then 只读不删不改，完成后打已迁移标记（C-132）",
            "Given 完成 When 报告 Then 映射了什么、没映射什么、冲突、待确认（C-133）",
            "Given docs/ 散落 md When 挖掘 Then 分类为需求/规划决策/规则/存疑/无法归类（C-136）",
        ],
        "bounds": "本仓自举受 F23/C-142 约束：设计轮确认记录视为第一批正式账本，不是「未确认初稿」。对外项目仍走 C-131。",
        "non_goals": "不从存量代码扫描生成基线（那是 N2/v2）。",
        "test_level": "核心：映射表存在；报告四段齐全。W1 即测。",
        "files": ["keel/templates/migrate/", "keel/features/f22-migrate/", "keel/features/f23-bootstrap/"],
        "deps": ["F1", "F3", "F4"],
        "ifaces": ["I-13"],
    },
    {
        "fid": "F23",
        "req": "REQ-023",
        "slug": "f23-bootstrap",
        "title": "框架自举（自己管理自己）",
        "must": "必需",
        "wave": "W1",
        "w1": "把 features/decisions/research/DESIGN 迁入 keel 记录并保留编号映射",
        "cs": "C-137~C-142",
        "desc": "keel 仓库后续开发用自己的流程；设计阶段产物按 F22 方式迁入；上一版 gate 管下一版。",
        "acs": [
            "Given W1 When 完成 Then 存在 REQ/DEC/RES 标准记录且 id-map 覆盖 F1–F23、C-01–C-142、R1–R7（C-137）",
            "Given 源 features.md/decisions.md/research/DESIGN When 迁移 Then 不重写原文，只加已迁移标记（C-137）",
            "Given 改 gate 的提交 When 到 CI Then 用主干现行版 gate 裁决（W3 落地，C-138）",
            "Given 本轮对话确认 When 记账 Then 视为第一批正式账本来源（C-142）；APR 仍须人类身份提交（C-107）",
        ],
        "bounds": "消费项目升级 v1=tag+脚本列覆盖清单+用户确认，不做自动升级（C-141）。",
        "non_goals": "W1 不实现上一版 gate 的 CI 检出（无远端、无 check）。",
        "test_level": "核心：映射完整、源文件仍在。W1 即测。",
        "files": ["tools/bootstrap/w1_bootstrap.py", "keel/features/f23-bootstrap/", "keel/requirements/v1.md"],
        "deps": ["F22"],
        "ifaces": ["I-14"],
    },
]

RESEARCH = [
    ("RES-001", "R1", "R1-pocock-grilling-lineage.md", "Pocock grilling 谱系", "深度",
     "grilling 原语能否直接采用？缺什么？"),
    ("RES-002", "R2", "R2-harness-capability-matrix.md", "六 harness 能力矩阵", "深度",
     "六家指令/技能/钩子交集是什么？权威执法放哪？"),
    ("RES-003", "R3a", "R3a-trellis-and-spec-frameworks.md", "Trellis 与主流 spec 框架", "深度",
     "Trellis 与 11 个对照框架的机制、硬度、可偷师与应避免？"),
    ("RES-004", "R3b", "R3b-community-practices-and-failure-modes.md", "社区实践与失败模式", "标准",
     "2025–2026 社区共识与失败模式如何约束本框架？"),
    ("RES-005", "R4", "R4-model-landscape-implications.md", "模型版图与设计含义", "深度",
     "前沿模型作弊/失忆对记录与验证意味着什么？"),
    ("RES-006", "R5", "R5-enforcement-evidence-traceability-ci.md", "强制层工程", "深度",
     "硬门禁、证据、追溯、CI 如何跨 harness 落地？"),
    ("RES-007", "R6", "R6-kk-framework-audit.md", "kk 框架审计", "标准",
     "E:\\program\\kk 设计稿哪些可借鉴、哪些不合并？"),
    ("RES-008", "R7", "R7-no-mistakes.md", "no-mistakes 评估", "标准",
     "kunchenguid/no-mistakes 能否作为合并车道组件？"),
]


def slug_ascii(text: str, fallback: str) -> str:
    s = text.lower()
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")[:50].strip("-")
    return s or fallback


def parse_decisions(path: Path) -> list[dict]:
    rows: list[dict] = []
    in_confirmed = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## 已确认"):
            in_confirmed = True
            continue
        if in_confirmed and line.startswith("## "):
            break
        if not in_confirmed or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 4:
            continue
        cid, date, title, body = cells[0], cells[1], cells[2], cells[3]
        if not re.fullmatch(r"C-\d+", cid):
            continue
        n = int(cid.split("-")[1])
        fm = re.search(r"F(\d+)", title)
        features = [f"F{fm.group(1)}"] if fm else []
        rows.append(
            {
                "cid": cid,
                "n": n,
                "dec": f"DEC-{n:03d}",
                "date": date,
                "title": title,
                "body": body,
                "features": features,
            }
        )
    rows.sort(key=lambda r: r["n"])
    return rows


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not text.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8", newline="\n")


def mark_migrated(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER in text:
        return
    write(path, MARKER + "\n" + text)


def emit_decisions(rows: list[dict]) -> None:
    ddir = KEEL / "decisions"
    ddir.mkdir(parents=True, exist_ok=True)
    for old in ddir.glob("DEC-*.md"):
        old.unlink()
    for r in rows:
        fname = f"{r['dec']}-{r['cid']}.md"
        feats = ", ".join(r["features"]) if r["features"] else ""
        write(
            ddir / fname,
            f"""---
id: {r['dec']}
title: {r['title']}
status: confirmed
date: {r['date']}
features: [{feats}]
research: []
research_exemption: 设计阶段确认记录迁移；不事后补写 RES 引用以免编造。原文 docs/decisions.md {r['cid']}。调研原文见 docs/research/ 与 RES 包装文件。
adr: false
source_id: {r['cid']}
bootstrap: true
---

# {r['dec']} {r['title']}

## 问题

{r['title']}

## 选项对比

设计阶段确认记录未单列选项。不重写历史。原文：`docs/decisions.md` 中 {r['cid']}。

## 推荐理由

见「用户决定原话」（该行即当时拍板内容）。

## 用户决定原话

{r['body']}

## 影响

关联功能：{feats or '见条目'}。本条由 W1 自举迁入，状态=confirmed（C-142：本轮对话确认为第一批账本）。
""",
        )


def emit_research() -> None:
    rdir = KEEL / "research"
    rdir.mkdir(parents=True, exist_ok=True)
    for old in rdir.glob("RES-*.md"):
        old.unlink()
    for rid, src_id, fname, title, depth, question in RESEARCH:
        src = DOCS / "research" / fname
        exists = src.is_file()
        write(
            rdir / f"{rid}-{src_id}.md",
            f"""---
id: {rid}
title: {title}
depth: {depth}
date: 2026-08-21
features: []
oss: []
source_id: {src_id}
source_path: docs/research/{fname}
bootstrap: true
---

# {rid} {title}

档位：{depth}（设计阶段已完成；本文件是包装，不重写原文）

## 调研问题

{question}

## 检索范围

见原文 `docs/research/{fname}`（文件存在：{exists}）。本包装不复制正文（C-69 引用而非复制）。

## 候选对比

见原文。

## 逐项证据

见原文 References / 访问日期。未核实项原文已标。

## 结论

见原文关键结论节。不在此重写，以免漂移。

## 剩余不确定性

见原文。SUMMARY 导航件 `docs/research/SUMMARY.md` 不单独成 RES。
""",
        )


def emit_requirements() -> None:
    lines = [
        "# 需求书 v1",
        "",
        "- version: v1",
        "- date: 2026-08-21",
        "- status: confirmed（设计轮功能清单，C-01/C-142）",
        "- source: docs/features.md（只读原文，不重写）",
        "- replaces: null",
        "- change: null",
        "- note: 工作单元=功能。F 编号保留；REQ 与 F 一一映射见文末。",
        "",
        "## 未决问题",
        "",
        "- 远端 GitHub/Gitee URL 未提供 → 执法档维持 local（用户 2A）。",
        "- 人类 git 身份未写入 config.identities.humans → APR 只能停留 draft（C-107）。",
        "- DESIGN §8/9 仍为建议项；本仓采纳为工作顺序，变更须告知用户。",
        "",
        "## 非目标",
        "",
        "- N2：从存量**代码**扫描生成基线（v1 只留接口；旧框架工件迁移由 F22 覆盖）。",
        "- N3：设计轮交付边界=规范、不写实现。实施轮开始后本条不再阻止写代码。",
        "- N4：不做重型中央编排器、不干预模型阶段内推理方式。",
        "",
    ]
    for f in FEATURES:
        lines.append(f"## {f['req']} {f['title']}")
        lines.append("")
        lines.append(f"- **status**: confirmed")
        lines.append(f"- **source**: docs/features.md {f['fid']}；技术方案 {f['cs']}")
        lines.append(f"- **feature**: {f['fid']}")
        lines.append(f"- **must**: {f['must']}")
        lines.append(f"- **description**: {f['desc']}")
        lines.append("- **acceptance**:")
        for ac in f["acs"]:
            lines.append(f"  - {ac}")
        lines.append(f"- **bounds_and_counterexamples**: {f['bounds']}")
        lines.append(f"- **non_goals**: {f['non_goals']}")
        lines.append("")
    lines += [
        "## 附录：旧访谈条目（存疑，不作为当前基线）",
        "",
        "来源 `docs/requirements.md`（2026-08-17，R-01~R-21）。功能层已被 features.md 取代（handoff / C-142）。",
        "对照：R-01→F1，R-02→F2/F3，R-03→F6，R-04→F10，R-05→F3，R-06→F16，",
        "R-07→F19，R-08→F20，R-09→F17，R-10→F12/F9，R-11→F11，R-12→F1，",
        "R-13→F10/F13，R-14→F21，R-15→F18（实施计划审批已收束为「方案+统一规划一次确认」F4），",
        "R-16→F21，R-17→N3（设计轮），R-18→F5，R-19→已解除独立约束，R-20→F5/C-69，R-21→F8。",
        "",
        "## F ↔ REQ 映射",
        "",
        "| F | REQ | slug |",
        "|---|---|---|",
    ]
    for f in FEATURES:
        lines.append(f"| {f['fid']} | {f['req']} | {f['slug']} |")
    write(KEEL / "requirements" / "v1.md", "\n".join(lines) + "\n")


def emit_feature_plans() -> None:
    w1_slugs = {
        "f04-unified-plan",
        "f05-overhead",
        "f12-handoff",
        "f16-platforms",
        "f18-approvals",
        "f20-context-budget",
        "f21-config",
        "f22-migrate",
        "f23-bootstrap",
    }
    for f in FEATURES:
        base = KEEL / "features" / f["slug"]
        files = "\n".join(f"- `{p}`" for p in f["files"])
        deps = ", ".join(f["deps"]) if f["deps"] else "无"
        write(
            base / "plan" / "v1.md",
            f"""---
feature: {f['fid']}
slug: {f['slug']}
plan_version: v1
replaces: null
change: null
wave: {f['wave']}
req: {f['req']}
---

# {f['fid']} {f['title']} — 规划 v1

## 范围

{f['desc']}

主波次 **{f['wave']}**。W1 切片：{f['w1']}。

决策依据：{f['cs']}。需求：{f['req']}。

## 非范围

{f['non_goals']}

{f['bounds']}

## 测试义务

- 分级：{f['test_level']}
- 验收标准：见 requirements/v1.md {f['req']}（逐条对账，C-32/C-37）
- 联动：{', '.join(f['ifaces'])}（C-38）

## 内部步骤

1. W1：{f['w1']}
2. 后续波次按总览顺序实现技能/脚本/测试；触碰 I-* 契约须先看 overview-v1。
3. 低层可逆选择记 worklog；触碰已确认接口停下来问（C-21）。

## 预计触碰文件

{files}

## 依赖

{deps}
""",
        )
        if f["slug"] in w1_slugs:
            log = f"""# worklog — {f['fid']} {f['slug']}

## 2026-08-21

- 进度：W1 开工。切片：{f['w1']}
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无
"""
        else:
            log = f"""# worklog — {f['fid']} {f['slug']}

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 {f['wave']}，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md
"""
        write(base / "worklog.md", log)


def emit_indexes(dec_rows: list[dict]) -> None:
    req_idx = """# requirements index (generated)

- generator: tools/bootstrap/w1_bootstrap.py
- current: v1.md
- versions: v1.md

W2 `gate index` 将接管生成。禁止手写第二份 current。
"""
    plan_idx = """# plan index (generated)

- generator: tools/bootstrap/w1_bootstrap.py
- current: overview-v1.md
- versions: overview-v1.md

W2 `gate index` 将接管生成。缺失或双指=G-规划失败（C-24）。
"""
    write(KEEL / "requirements" / "INDEX.md", req_idx)
    write(KEEL / "plan" / "INDEX.md", plan_idx)

    dec_lines = [
        "# decisions index (generated)",
        "",
        f"- count: {len(dec_rows)}",
        "- generator: tools/bootstrap/w1_bootstrap.py",
        "",
        "| ID | source | title | status | file |",
        "|---|---|---|---|---|",
    ]
    for r in dec_rows:
        fname = f"{r['dec']}-{r['cid']}.md"
        dec_lines.append(f"| {r['dec']} | {r['cid']} | {r['title']} | confirmed | `{fname}` |")
    write(KEEL / "decisions" / "INDEX.md", "\n".join(dec_lines) + "\n")

    res_lines = [
        "# research index (generated)",
        "",
        "| ID | source | title | file |",
        "|---|---|---|---|",
    ]
    for rid, src_id, fname, title, _depth, _q in RESEARCH:
        res_lines.append(f"| {rid} | {src_id} | {title} | `{rid}-{src_id}.md` |")
    res_lines.append("")
    res_lines.append("SUMMARY（`docs/research/SUMMARY.md`）是导航件，不成 RES。")
    write(KEEL / "research" / "INDEX.md", "\n".join(res_lines) + "\n")


def emit_id_map(dec_rows: list[dict]) -> dict:
    data = {
        "generated": "2026-08-21",
        "note": "Bootstrap mapping. Source IDs never reused. History not rewritten.",
        "features": {
            f["fid"]: {"req": f["req"], "slug": f["slug"], "title": f["title"]}
            for f in FEATURES
        },
        "decisions": {r["cid"]: r["dec"] for r in dec_rows},
        "research": {src: rid for rid, src, *_ in RESEARCH},
        "sources": [
            "docs/features.md",
            "docs/decisions.md",
            "docs/research/",
            "DESIGN.md",
        ],
    }
    dest = KEEL / "features" / "f23-bootstrap" / "id-map.json"
    write(dest, json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    return data


def emit_placeholders() -> None:
    for sub in ("issues", "changes", "oss", "lessons", "approvals", "journal/keel-agent"):
        p = KEEL / sub
        p.mkdir(parents=True, exist_ok=True)
        keep = p / ".gitkeep"
        if not keep.exists() and not any(p.glob("*.md")):
            keep.write_text("", encoding="utf-8")


def main() -> int:
    dec_path = DOCS / "decisions.md"
    if not dec_path.is_file():
        print("missing docs/decisions.md", file=sys.stderr)
        return 1
    rows = parse_decisions(dec_path)
    if len(rows) != 142:
        print(f"expected 142 C-records, parsed {len(rows)}", file=sys.stderr)
        return 1
    ids = [r["n"] for r in rows]
    if ids != list(range(1, 143)):
        missing = [i for i in range(1, 143) if i not in ids]
        print(f"C-id gaps: {missing}", file=sys.stderr)
        return 1

    emit_decisions(rows)
    emit_research()
    emit_requirements()
    emit_feature_plans()
    emit_indexes(rows)
    emit_id_map(rows)
    emit_placeholders()

    for path in [
        ROOT / "DESIGN.md",
        DOCS / "features.md",
        DOCS / "decisions.md",
        DOCS / "handoff.md",
        DOCS / "requirements.md",
        DOCS / "research" / "SUMMARY.md",
    ]:
        if path.is_file():
            mark_migrated(path)
    for path in (DOCS / "research").glob("R*.md"):
        mark_migrated(path)

    print(f"DEC {len(rows)}  RES {len(RESEARCH)}  REQ {len(FEATURES)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
