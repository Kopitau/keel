<!-- keel-migrated: 2026-08-21 mapping: keel/features/f23-bootstrap/id-map.json -->
# 交接（handoff）—— 设计阶段完成，移交实施

> 更新：2026-08-21
> 读者：接手实施的 agent（任何 harness/模型）与用户
> 本文件是开工第一读物；读完按"下一步"执行

## 一、当前状态

**设计阶段已完成并经用户终审**。keel 框架的 23 项功能（F1~F23）与 142 条技术决策（C-01~C-142）全部经用户在对话中逐条确认。**本轮尚未编写任何可运行代码**（这是用户确认的交付边界 N3）。

## 二、必读文件（按顺序）

| 顺序 | 文件 | 是什么 |
|---|------|--------|
| 1 | `DESIGN.md` | **设计规范 v1.0 定稿**——实施的唯一直接依据。23 项功能逐条规范，每条标注 (C-xx) 可回溯到用户原话 |
| 2 | `docs/features.md` | 功能清单（用户定稿版，功能层唯一事实源） |
| 3 | `docs/decisions.md` | 确认账本 C-01~C-142，含用户每次修订的原话要点。**有疑义时以此为准** |
| 4 | `docs/research/SUMMARY.md` | 调研汇总与十一条设计公理；需要依据时再读 R1~R7 全文 |

## 三、实施必须遵守的规则（用户明确定过，勿自行更改）

1. **只有用户在对话中确认的内容才算数**。设计已确认的部分照做；**遇到设计未覆盖的选择，按 keel 自己的 F3 流程办**：给推荐+理由+备选，向用户逐条确认后落 DEC 记录，不得自行拍板后默默实现。
2. **DESIGN.md 第 8、9 节（路线图、技能清单）未经确认**，是建议材料，可调整——但调整要告知用户。
3. **模型智能与功能实现优先，省 token 不以牺牲两者为代价**（C-69）。写代码该花多少花多少。
4. **确认过的工件不可变**：迭代=新建版本文件+重索引，不改历史（C-24/C-63）。
5. 语言：agent 指令/技能/字段名英文；面向人的记录正文中文、通俗易懂（C-124/C-09）。
6. 平台：主力五家 = Claude Code / Codex / OpenCode / Grok Build / DeepSeek Harness；Pi 为兼容档（C-96）。
7. 执法三档：GitHub 完整 / Gitee 降级 / 本地档（用户实际用 GitHub + Gitee，C-48/C-104）。
8. 运行时：gate = Python ≥3.11 **仅标准库、零 pip 依赖**，Windows 优先实测（C-101）。

## 四、下一步：实施轮 W1

按 `DESIGN.md` §8 路线图开工，W1 内容：

1. 生成目录骨架（§3 目录布局）+ AGENTS.md（英文 ≤150 行，地图式）+ CLAUDE.md 桥 + 各记录模板（懒创建式）+ `keel/config.json` 注释模板；
2. Trellis / Superpowers 迁移映射表初稿（F22）；
3. **自举迁移（F23/C-137）**：把本设计轮的 `docs/features.md`、`docs/decisions.md`、`docs/research/`、`DESIGN.md` 迁成 keel 自身的标准记录（features→需求书 v1；C-记录→DEC 条目；R 报告→RES 条目；DESIGN→规划总览素材），**保留原编号映射、不重写历史**。

此后 W2 gate 核心 → W3 证据与 CI → W4 技能 → W5 五平台实测 → W6 试点校准（详见 §8）。

## 五、开工前建议先与用户确认的两件事

1. **W1 产出物落在哪个仓库/目录**（当前 `E:\program\en` 是设计工作区，非 git 仓库；keel 正式仓库位置未定）；
2. **是否先做 git init 与远端（GitHub/Gitee）配置**——F23 自举要求 keel 立刻用自己的流程管自己，而门禁/审批需要 git 环境。

## 六、遗留校准项（试点后回填，已在 DESIGN.md 附录 B 列出）

常驻装载 ≤10KB、OSS 复查 28 天、知识库 ~100 条封顶、规则区条数封顶——均为初值；各平台技能触发词措辞需 W5 实测校准；dsh 正式版后复评。

---

## ⚠ 2026-08-21 变更：CHG-001（实施方必读，影响 W1 已产出物）

用户在 W1 完成后追加两项要求，已按 F11 走变更单：`keel/changes/CHG-001-cross-platform-and-node-ts-runtime.md`（status: approved）。

**1. 新增 F24 跨平台支持（Windows + macOS + Linux）** — DEC-143~148
- Linux 也是正式支持平台（CI 权威门禁本就跑在 Linux runner）；
- **最高风险项**：哈希必须在规范化内容（LF、UTF-8 无 BOM）上计算 + `.gitattributes` 强制 `* text=auto eol=lf`，否则跨平台哈希不一致会击穿审批/证据哈希；
- 大小写冲突检查进 CI；双启动器 `gate.sh`/`gate.ps1`；技能镜像三平台一律复制；多平台一致性 fixture。

**2. gate 运行时由 Python 改为 Node + TypeScript** — DEC-149（adr，取代 DEC-101/C-101）
- 直接运行 `.ts`（Node 原生类型剥离，**零构建步骤**），仅用 Node 内置模块，保持零依赖；
- 实证见 `keel/research/RES-901-cross-platform-and-runtime.md`（本机实测：Node 22.19 跑 .ts 成功；启动开销与 Python 差异在噪声内、远小于一次 git 调用；六个目标 harness 中五个经 npm 分发 → Node 必然存在，Python 不保证）。

**需要联动重做的 W1 产出物**：`tools/gate/gate.py`（54 行桩→TS 重写）、`tools/bootstrap/w1_bootstrap.py`（一次性工具，归档不再演进）、`tests/test_w1_skeleton.py` + `pytest.ini`（改 Node 侧）、`keel/config.json` 的 profiles.active、`.gitattributes`、`keel/decisions/INDEX.md`（本次手工追加，欠 W2 `gate index` 重新生成）。

**W1 代码回滚（2026-08-21）**：用户指示第一次 Python W1「计划不完全，回滚重新实施」。Python `gate.py` / pytest 已移除；自举脚本归档。keel 记录（含本变更单与 DEC-143~154）保留。按下列确认项用 Node+TS 重做 W1。

**5 个派生子项已于 2026-08-21 全部确认（DEC-150~154），实施方直接照此执行**：

| 项 | 决定 |
|---|---|
| DEC-150 Node 基线 | **≥22.18.0**（该版起类型剥离免标记，已核实）；CI 矩阵测 **Node 22 LTS + 24 LTS × 三平台**；低于基线启动器须明确报错，不得静默降级 |
| DEC-151 构建 | **直接运行 `.ts`，不编译**。tsconfig 开 `erasableSyntaxOnly: true` 强制可擦除子集：禁 `enum`/`namespace`/旧式装饰器/构造函数参数属性；类型导入用 `import type`；相对导入带扩展名 |
| DEC-152 测试运行器 | **内置 `node:test`** + `--test-reporter=junit`（实测可直接跑 .ts、原生输出 JUnit XML，直接喂证据协议）。**取代 DEC-126/DEC-139 中"gate=pytest"的表述**；用户项目的测试画像不受影响 |
| DEC-153 分发 | **v1 仓库内随项目走（vendored）**，升级按 DEC-141；npm 发布留 v2 |
| DEC-154 类型检查（adr） | **`tsc --noEmit` 进门禁**，本地与 CI 同一命令。**「零依赖」正式定义**：运行时=仅 Node 内置模块零第三方依赖；开发/CI 期允许 devDependency，白名单当前仅 `typescript`，新增须走决策记录 |
