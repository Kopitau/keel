---
id: RES-903
title: 首次真实使用的执法缺口实证
depth: 本地
date: 2026-08-26
features: [F1, F2, F13]
oss: []
oss_none: 本次是对本框架自身执法链的实证审计，不涉及任何外部开源项目的选用。
---

# RES-903 首次真实使用的执法缺口实证

档位：**本地**（对象是本仓与一个本机项目，证据全部来自可复跑的本地命令；无需外部检索）。

## 调研问题

keel 第一次被用在真实业务项目上（zhaoxi，2026-08-25）。要回答的是：

1. 哪些已确认规则**有规则但没有执法**——即违反了也不会被任何检查发现？
2. 每一处的根因是判据写错，还是根本没有判据？
3. 防线应该放在闭环阶梯的哪一层，代价各是多少？

## 检索范围

- zhaoxi 会话记录：`C:\Users\NF3317\.claude\projects\E--program-zhaoxi\b14ac2e3-*.jsonl`（约 1 MB，流式解析）
- zhaoxi 产出：`E:\program\zhaoxi\keel\`（需求 v1.md 61 条、v1-gaps.md、research 3 份）及其 worktree `.keel-worktrees/F-00-platform-base`
- 本仓门禁源码：`tools/gate/check.ts`（17 项检查）、`osscheck.ts`、`testbase.ts`
- 本仓规则：`DESIGN.md`、`keel/decisions/`（160 条）、`.agents/skills/k-*/SKILL.md`
- 派生报告：`docs/review/A8-zhaoxi-field-lessons.md`（独立子代理产出）

## 候选对比

每条缺口的防线层级取舍（阶梯见 C-59）：

| 缺口 | 门禁/测试可行？ | 选定层级 | 被否决的更高档及原因 |
|---|---|---|---|
| 调研先于需求 | 可 —— RES 文件存在性 vs REQ 条目数，全在磁盘上 | 回归测试 | 无更高档 |
| 缺口猎取做没做 | 可 —— 但需先定义产出物 | 回归测试 | 无更高档 |
| 调研期选定依赖 | 可 —— RES frontmatter 表态 | 回归测试 | 无更高档 |
| 访谈写成主张 | **不可** —— 访谈不落盘，门禁看不到任何字节 | 项目规则 | 回归测试/lint/门禁均无被测对象；"访谈提纲落盘受检"因违背 F5 开销控制被否决 |

## 逐项证据

**1. 门禁在"空"状态下静默**（复跑命令与实测输出）

```
$ node tools/gate/gate.ts check --quick      # 在 zhaoxi 上，2026-08-25 状态
SKIP G-req    尚未开始，跑 k-new 建立需求基线
SKIP X-oss    no package.json
result: PASS  fail=0 warn=0
```

当时 `keel/research/` 已有 3 份 RES，需求尚未落盘。判据把"实施活动"定义为 `keel/features/` 非空，**调研不计入**（`hasImplementationActivity()`，`tools/gate/check.ts`）。

**2. 调研期依赖对 OSS 账本不可见**

`RES-001` 结论是把 deepseek-harness 作为锁定依赖；`E:\program\zhaoxi\keel\oss\` 为空；三份 RES frontmatter 均为 `oss: []`。`X-oss` 的判据链起点是 `package.json`（`packageDirectDeps()`），而调研发生在清单存在之前。

**3. 访谈形态**

单条访谈消息 5946 字，编号条目 30 个（`Q\d+`），问号 7 个。条目形如「Qnn 选题。推荐：…。备选：…」。用户在 67 分钟后才提出「什么是 Inbox」——术语首次出现未解释。

**4. 缺口猎取：先前结论被推翻**

初判为「承诺了 C-06 却没做」。**该判断错误**，实证如下：

```
$ ls E:/program/zhaoxi/keel/requirements/
INDEX.md   v1-gaps.md   v1.md
$ node -e "...enumeratedRows/hasHunterAttribution on v1-gaps.md..."
枚举条数: 51 (阈值 3)
署名可识别: true
```

`v1-gaps.md` 开头写明「由一个未见过访谈对话的子代理只读审查」，45 条缺口带严重度与处置，13 条转成新 REQ。**完全符合 C-06。**

误判来源：只在主工作区按设想的文件名找过，未列目录，也未注意到仓库另有未合并 worktree（`git worktree list` 显示 `.keel-worktrees/F-00-platform-base`）。同时早期读数（45 条 REQ、零 commit）均为过时快照——实测为 61 条 REQ、3 个 commit。

**5. 误杀实测（本次最重要的一条证据）**

第一版缺口猎取判据要求：文件名 `gap-hunt-vN.md`、字段 `- **hunter**:`、章节 `## 发现`。拿 zhaoxi 的真实产出实测——**三条全部不满足**（它叫 `v1-gaps.md`、署名在散文里、发现用表格）。即：一条会把现实中做得最好的那次实践判为违规的防线。

判据据此改为查实质（有没有列出发现、能不能看出谁猎的），并把该样本固化成回归测试。

**6. 本仓测试套件已红一整天**

```
$ node --test        # 2026-08-26，改动前
# tests 155 / pass 151 / fail 4
```

其中两条与当天改动无关，断言的是 `enforcement_tier === "local"` 与 `SKIP X-owners`，被 2026-08-25 的提交 `b74b4a0`（执法档升 github）打破。`keel/handoff.md` 当时写着「测试 139 全绿」。

## 结论

- **决定**：四条防线，三条上门禁+回归测试，一条（访谈写法）止于项目规则并明确标注强度上限。判据一律**查实质不查格式**，且上线前必须拿现实中最好的样本实测。
- **理由**：四条里三条本有规则而无判据，留在 L0 等于承认规则只是建议；第四条无被测对象，硬装机检会造出走过场的检查。
- **备选**：只改技能措辞（否决——失效的正是这一层）；只做成本最低的两条（否决——问题最大的缺口猎取反而不管）。

共同根因是**「空即合规」**：多项检查用"文件存在"代理"阶段已开始"，而这个代理恰在项目最早期失效——那正是本框架第一个功能要管的阶段。六轮自举复审踩不到它，因为 keel 自己从第一天就有 28 条需求。

## 剩余不确定性

- 防线 4 的实际效力**无法测量**：技能文本被读没被读、读了守没守，都不产生可观测信号。只能等下一次真实使用来检验。
- 存量迁移成本**只在两个项目上估过**（本仓 10 份 RES、zhaoxi 3 份）。RES 数量大的项目代价未知。
- 「空即合规」在其余五项检查（G-plan / G-done / G-retro / X-owners / X-full）上**同样存在，本次未处理** —— 它们的 SKIP 是否也需要判据，尚未评估。 [未核实]
- A8 报告中另有若干发现（C-107 身份审批可被 `git config` 绕过、本地档七项检查从未自动运行、经验候选标签无接收端、`gate new` 被当号码机）**本次未验证亦未处置**，仅作线索记录。 [未核实]
