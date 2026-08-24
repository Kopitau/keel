# A3 — Grok 实施过程审计（审计线 3）

> 审计对象：Grok Build（grok-4.6）在 `E:\program\en` 实施 W1~W6 的**过程**是否符合 `docs/handoff.md` + `DESIGN.md` + `docs/decisions.md` 设定的流程
> 审计日期：2026-08-24　审计员：独立审计线 3（只读核查，未改动任何被审文件）
> 数据源：`~/.grok/sessions/E%3A%5Cprogram%5Cen/01a02348-.../`（`updates.jsonl` 全量事件流 2613 条、`hunk_records.jsonl`、`compaction_checkpoints/`）、上级 `prompt_history.jsonl`、`E:\program\en` 仓库现状与 git 历史
> **时区约定**：trace 里的时间戳是 **UTC**；git log 显示的是本地时间 **UTC+8**。本文全部用 UTC，需要对照 git 时请 +8 小时。

---

## 0. 一句话结论

**过程整体守规，诚实度很高，没有发现一处谎报完成。** 所有"通过/PASS/N 个测试"的声明都能在 trace 里找到对应的真实命令输出。真正的问题不在"说了假话"，而在**几条已确认决策被静默跳过**（C-139 技能无歧义测试、C-31/C-35 先测后码与红灯证据、C-112/C-115 分支与尾注自用），以及**零 ISS 记录**——keel 自己的问题日志机制在自己身上一次都没启用。

---

## 1. 事实统计（供快速判断）

| 指标 | 数值 | 来源 |
|---|---|---|
| 实施总时长 | 07:47:13 → 10:05:09 UTC = **2 小时 17 分** | prompt_history 首条 / P9 turn_completed |
| 用户指令 | **11 条**（含 1 次回滚重发） | prompt_history.jsonl |
| Grok 主动请求用户确认 | **1 次**（含 2 个问题） | 07:49:25 消息 |
| 工具调用 | **759 次**（233 个推理轮） | events.jsonl 计数 |
| 提交 | **9 个**，全部 `keel-agent`，全在 `master` | git log |
| 上下文压缩 | **1 次**，400,417 → 9,726 tokens（-97.6%） | 09:31:30 / 09:33:38 |
| 累计输入 token | 47.9M（含缓存复用）／输出 260K | 各 turn usage 求和 |
| 产出 | TS 3,418 行 + 16 技能 + 46 测试 + CI | 仓库实测 |
| keel 记录 | 154 DEC / 24 REQ / 24 worklog / 4 journal / 10 RES / 1 CHG / 1 APR / 1 summary | 仓库实测 |
| **ISS 条数** | **0** | `keel/issues/INDEX.md` count: 0 |
| **lesson 条数** | **0** | `keel/lessons/INDEX.md` count: 0 |

---

## 2. 符合项（10 条，均有 trace 证据）

### S1　开工先读文档，不是凭空开写 ✔

第一次写文件是 07:54:33（`CONTEXT.md`），而在这之前 7 分钟全部在读：

```
07:47:35  read DESIGN.md (limit 200) / read docs/handoff.md / list docs/
07:47:44  read DESIGN.md (offset 320) / read docs/features.md / read docs/decisions.md
07:49:00  read docs/handoff.md（用户第 2 条指令要求「先读 handoff」，Grok 完整重读）
07:49:11  read docs/research/SUMMARY.md
```

必读四件套（DESIGN / features / decisions / research SUMMARY）**全部读到**，顺序也对。

### S2　遇到设计未覆盖的选择，按 F3 停下来问 ✔

`docs/handoff.md` 第五节列了两个开工前必问项。Grok 07:49:11 先自己跑 `git status` 探明现状，07:49:25 才提问，格式完全按 F3（推荐 + 理由 + 备选）：

> 「交接第五节要求开工前先拍两件事（设计未覆盖，按 F3 不能自行拍板）。每题附推荐：**1. W1 产物落在哪？** | 选项 | 含义 | **A（推荐）** | 就在当前 `E:\program\en` 落盘…」

用户 07:49:39 回「A A」，Grok 07:50:03 第一句就是「1A、2A 已确认」。**这是全场唯一一次阻塞式提问，也确实是全场唯一一处设计未覆盖的分叉点。**

### S3　F23 / C-137 自举迁移做全了 ✔

`keel/features/f23-bootstrap/migrate-report-w1.md` + `id-map.json` 显示：

- `docs/decisions.md` C-01~C-142 → `keel/decisions/DEC-001-C-01.md` … `DEC-142-C-142.md`，**编号一一对应**（实测 142 条源、142 个映射键、目录里 154 个 DEC 文件 = 142 迁入 + 12 条 CHG-001 新增）
- F1~F23 → `keel/requirements/v1.md` REQ-001~023 + 24 个 `keel/features/<slug>/`
- R1~R7（含 R3a/b）→ RES-001~008 **包装文件**（正文仍在 `docs/research/`，不复制不重写）
- 原文件只加 `<!-- keel-migrated: ... -->` 标记，**正文一个字没删**（C-132）

抽查 DEC-020 与源 C-20 行逐字一致；未被引用的字段（如 `research_exemption`）明写「不事后补写 RES 引用**以免编造**」——这是对的做法。

### S4　实施过程确实落盘，不是只写代码 ✔

- **24 个 worklog**（每个 feature 一个，C-20），随波次追加不重写，例：`keel/features/f17-gate/worklog.md` 有 W1 重做 / W2 / W3 / W6 四段
- **4 篇 journal**（C-115 按开发者分目录 `keel/journal/keel-agent/`），每篇有「未写入 handoff 的细节」
- **每波更新 `keel/handoff.md` + `keel/OVERVIEW.md`**（hunk 记录 P5/P6/P7/P8/P9 均命中）
- **非显然实现决定写进 worklog**（C-17），例：`journal/2026-08-21-02.md`「不为 tsc 引入 `@types/node`（白名单仅 typescript），手写 `tools/gate/node-min.d.ts`」

### S5　每波真跑了测试，数字全部对得上 ✔（重点核查项）

把 Grok 声称的数字与 trace 里的真实终端输出逐条对账：

| 波次 | Grok 声称 | trace 实际输出（时间/命令） | 对账 |
|---|---|---|---|
| W1(py) | 「pytest → **10 passed**」 | 08:08:15 `python -m pytest -q` → `10 passed in 0.20s` | ✔ |
| W2 | 「**22 passed**，tsc 干净」 | 09:01:09 → `# tests 22 # pass 22 # fail 0`、`tsc 0` | ✔ |
| W3 | 「**28 passed**」 | 09:13:15 → `# tests 28 # pass 28 # fail 0` | ✔ |
| W4 | 「**31 passed**」 | 09:23:43 → `# tests 31 # pass 31 # fail 0` | ✔ |
| W5 | 「**36 通过**」 | 09:43:09 → `# tests 36 # pass 36 # fail 0` | ✔ |
| W6 | 「**46 通过**」 | 10:03:11 后台任务完成 → `# tests 46 # pass 46 # fail 0` | ✔ |
| W6 | 「常驻装载 **6427/10240**」 | 10:00:28 `measureAutoload` → `{"total":6427}` | ✔ |
| W6 | 「年检 **16 个检查项**全 KEEP」 | `gate-review-2026.md` 表格实测 16 行数据 | ✔ |
| 各波 | 「gate check **PASS**」 | 09:13:36 / 09:24:07 / 09:31:27 / 10:03:22 / 10:03:31 均 `result: PASS fail=0 warn=0` | ✔（强度见 Q1） |
| W5/W6 | 「工作区干净」 | `artifacts/tmp/w6-clean.txt` = `''`（空） | ✔ |

**没有找到任何一处"声称跑了实际没跑"。** 反而看得到真实的失败-修复循环（见 S10）。

### S6　压缩后没有丢失设计约束 ✔（重点核查项）

压缩发生在 **W5 中途**（09:31:30 触发 → 09:33:38 完成），上下文从 400,417 掉到 9,726 token。压缩后 **8 秒**，Grok 的第一个动作就是 pull 模式恢复：

```
09:33:46  MSG「先看当前落盘和 W5 还差哪几步，再接着做。」
09:33:46  read docs/handoff.md + keel/handoff.md + list E:\program\en
09:34:00  read DESIGN.md / keel/OVERVIEW.md / AGENTS.md / 多个 worklog
09:34:34  read keel/journal/keel-agent/2026-08-21-02.md
09:34:40  read keel/decisions/DEC-094-C-94.md（W5 要用的那条）
```

这正是 C-72「开场三跳 + OVERVIEW 前置」和 PV-1「pull 模式为正确性基础」的教科书执行。P8 的 `read_file` 调用数 **93 次**（全场最高），压倒性地集中在压缩之后。

另外，压缩摘要本身也保住了关键约束（`compaction_checkpoints/ffba0523....json`）：

> 「…following confirmed C-records, not auto-invoke superpowers, and treat unconfirmed §8/9 as working order while **remaining honest (e.g. no fake five-harness live skill fires)**」
> 「gate Node ≥22.18.0 run `.ts` with type-stripping, runtime zero npm deps…confirmed artifacts immutable (new version + reindex)」

**结论：压缩后未观察到任何"开始违反之前遵守的规则"的行为。** 压缩后写的代码（triggers.ts / autoload.ts / bypass.ts / review.ts）全部是 Node+TS 零依赖、全部配了测试、全部有 worklog。keel 担心的 C-72/PV-1 失效**在本次没有发生**——但要注意这多半是因为 Grok 自己主动重读了，checkpoint 里的 `reread_file_paths` 字段是**空的**，压缩机制本身并没有强制它去读。

### S7　回滚干净，且回滚这件事有记录 ✔

回滚动作（08:38:28）：

```
Move-Item tools\bootstrap\w1_bootstrap.py → tools\archive\w1-python-bootstrap.py
（删除 tools/gate/gate.py、pytest.ini、tests/test_w1_skeleton.py）
08:45:56  Get-ChildItem -Recurse -File -Include *.py,pytest.ini,test_w1_skeleton.py,gate.py  ← 自己复查残留
```

今日复验：仓库里 `git ls-files | grep .py` 只剩 `tools/archive/w1-python-bootstrap.py`（CHG-001 明确要求"归档不再演进"，属于**要求保留**而非残留）。`keel/oss/OSS-001-pytest.md` 也被正确改成 `status: retired`，写明「CHG-001 / DEC-152. keel gate tests use node:test」。

返工记录在三处：`keel/features/f17-gate/worklog.md`「2026-08-21（W1 重做）」段、`keel/journal/keel-agent/2026-08-21-02.md`、`docs/handoff.md` 的「W1 代码回滚（2026-08-21）」。**唯独没有 ISS**（见 D2）。

### S8　对"没做到的事"的披露非常诚实 ✔（重点核查项）

这是本次审计最正面的发现。Grok 多次**主动**把未完成项标出来，而不是含糊带过：

- W4（09:24:44）：「无歧义测试这一轮是**结构机检**（存在、字段、预算、镜像字节级一致）。**五家触发词实测留 W5**。」
- W5（09:45:45）：表格里 deepseek-harness / pi 两行直接写 **`[未实测]`**；并单列一节「**故意没做的**：没有付费对话里的五家技能实点（C-09）。claude / codex / opencode 只核到 CLI 版本；dsh / pi 不在 PATH。」
- W6（10:05:09）：「**未做合并**：本地档、APR-001 仍是 draft、没有人类身份。」
- `keel/OVERVIEW.md`：「F1–F16, F18–F23 | 规范已确认；记录已迁入 | **尚未有 `summary.md`**」「未做：远端、人类 APR、dsh/pi live、消费项目接入」

推理流里也能看到它在刻意避免夸大（09:35:44 thought）：

> 「…could work as a proxy without installing anything. That **keeps it honest and avoids claiming live smoke**.」

而且它声称的"已装"版本号（claude 2.1.238 / codex 0.144.1 / opencode 1.18.18）**确有实测输出**（`artifacts/tmp/w5-inspect.txt`），不是编的；16/16 技能载入也有 `grok inspect --json` 的真实解析（`w5-skills-parse.txt`）。

### S9　没有绕过门禁 ✔

- 全场 **0 次** `--no-verify`（grep 所有 759 条命令与两个提交脚本）
- hooks 确实生效：9 个提交的 message 里都有 `prepare-commit-msg` 注入的尾注块（虽然值是 unknown，见 D3）
- W5/W6 用 python 脚本提交（`w5-commit.py`/`w6-commit.py`）是为了绕开本机 git stdout 故障，脚本内部走的仍是普通 `git commit`，没有加任何跳过参数

### S10　看得到真实的调试循环，不是"一把过" ✔

W3 那段最典型：

```
09:08:14  node --test tests   → # tests 1 # fail 1（路径写错）
09:08:47  node --test         → # pass 27 # fail 1
09:09:52  node --test         → # pass 28 # fail 0
09:10:38  node --test         → # pass 27 # fail 1（又掉回去）
09:11:21 / 09:12:05           → 单独跑 w3-verify.test.ts 定位
09:12:41  node --test --test-name-pattern "gate verify writes"  → 精确到单条
09:13:15  node --test         → # pass 28 # fail 0（真修好）
```

这不是"大段代码一次性生成未验证"的样子。

---

## 3. 偏离项（5 条）

### D1　C-139 里"技能无歧义测试 + 五平台触发实测"两轮都被推掉，最后不了了之 ⚠

这条**不是** DESIGN §8 那种"建议、非确认项"，而是**已确认决策**。DEC-139「用户决定原话」：

> 「gate=pytest 核心级；**技能=无歧义测试+五平台触发实测**；模板/格式=校验测试；框架功能级验收测试=冒烟样例项目全流程走通」

实际轨迹：W4 说"留 W5"→ W5 说"留付费对话实点"→ W6 结束，`keel/handoff.md`「下一步 2. 装 `dsh` / `pi`；付费对话技能实点」。

**问题不在推迟本身**（没装 dsh/pi 是客观限制，只跑得起 grok 一家），**在于推迟的方式**：这是一条 confirmed 决策没能履约，按 keel 自己的规矩应该走 F11 变更单或至少开一条 ISS 挂着，实际只在 handoff 的"下一步"里留了半句话。**没有向用户提过"这条确认项我做不到，要不要改"。**

### D2　零 ISS —— keel 的问题日志机制在自己身上一次都没启用 ⚠

C-57 的提升条件写得很明确：

> 「异常先 worklog 记一行；满足提升条件（影响行为 / 致测试门禁失败 / 需调查 / **可能复发** / **致返工** / 评审验收发现）才升正式问题条目」

本轮至少两件**同时命中多个条件**：

1. **用户令回滚重做 W1**（08:33:57 / 08:35:31）——妥妥的"致返工"，重做花了 14 分钟、改了 40 个文件。
2. **本机 git 写 stdout 报 `Bad file descriptor`**——08:05:30~08:07:31 连试 **8 条**排查命令（`cmd /c`、`Format-Hex`、`GIT_PAGER=cat`、直接调 `D:\app\git\Git\cmd\git.exe`…），最后只能改用 Python `subprocess` 包装；这个 workaround 一直用到 W6（`artifacts/tmp/w5-commit.py`、`w6-commit.py`）。命中"需调查""可能复发"。

两件都只写进了 worklog / journal，`keel/issues/INDEX.md` 至今 `count: 0`，`gate status` 打 `open_issues: 0`。**顺带 `keel/lessons/INDEX.md` 也是 0**——F13 摩擦沉淀同样没启用。

讽刺的是，Grok 在 W5 冒烟测试里**特意演示了** `gate new iss`（`tests/w5-smoke.test.ts:121`「弄坏 greet → `runNew(ctx, ["iss", "greet ignores name"])` → 修好」），说明它完全知道这套机制怎么用——只是没用在自己身上。

### D3　F19 分支纪律 + C-115 身份尾注没有自用 ⚠

C-112：「**一功能一分支一 worktree**（`keel/F-编号-短名`）」；C-115：「提交尾注：功能 / 开发者 / agent 平台模型 / 会话」。

实际：

```
$ git branch -a
* master          ← 只有一个分支，9 个提交全在上面

$ git log --format='%s%n%b' -1
W6: F17 C-105 pilot, budget calibration KEEP, gate annual review
Feature: unknown
Developer: keel-agent
Agent: unknown
Session: unknown
```

`tools/gate/hook.ts:9,52-53` 说明了为什么全是 unknown：`Feature` 从分支名正则 `F-?(\d+)` 提取，`master` 提不出；`Agent`/`Session` 读 `KEEL_AGENT`/`KEEL_SESSION` 环境变量，Grok **一次都没设过**。

也就是说：**机制写了、测试也过了、但 keel 自己的 9 个提交没有一条是可追溯的。** F23/C-137 要求「骨架生成后 keel 仓库**立即用自己的**目录/门禁/技能管理后续全部开发」，这两条没做到。`gate worktree` 子命令写了 68 行代码 + 测试，从未被真正使用过一次。

**且任何记录里都没有说明理由**（比如"本地档单 agent，暂不开分支"这类）——grep 全部 worklog/journal/handoff/OVERVIEW 无结果。

### D4　测试全部事后补，零次"先红后绿" ⚠

C-31：「核心（业务逻辑/数据处理/对外接口/算法）**先测后码**」；C-35：「仅核心级要求先红后绿**留红灯证据**」。

hunk 记录里六个波次的写入顺序，**无一例外都是实现在前、测试在后**：

| 波次 | 实现文件首写 | 测试文件首写 | 间隔 |
|---|---|---|---|
| W1 redo | `gate.ts`/`hash.ts` 08:38:58 | `w1-skeleton.test.ts` 08:39:42 | +44s |
| W2 | `check.ts`/`approve.ts` 08:55:58 | `w2-gate.test.ts` 08:57:55 | +117s |
| W3 | `verify.ts` 09:06:46 | `w3-verify.test.ts` 09:07:56 | +70s |
| W4 | `skills.ts` 09:21:29 | `w4-skills.test.ts` 09:23:12 | +103s |
| W5 | `triggers.ts` 09:27:57 | `w5-smoke.test.ts` 09:29:14 | +77s |
| W6 | `review.ts` 09:59:03 | `w6-pilot.test.ts` 10:00:15 | +72s |

gate 的哈希规范化（DEC-144，CHG-001 点名"最高风险项"）、门禁判定逻辑，按 C-31 分类应属"核心级"。**没有一次红灯证据**，`keel/evidence/` 里也没有任何红灯记录。同时 C-34（删/skip 测试须引决策或问题编号，否则门禁报错）和 C-35 本身**都没有进 gate 实现**——也就是说这条纪律既没被遵守，也没有执法者。

### D5　`gate status` 硬编码 `wave: W2`，W6 之后仍在骗人 ⚠

`tools/gate/status.ts:43`：

```ts
"keel status",
"wave: W2",          // ← 写死的字符串
`runtime: node+ts ${process.versions.node}`,
```

今日实跑确认：

```
$ node tools/gate/gate.ts status
keel status
wave: W2            ← 实际已到 W6
```

C-72 规定「开场三跳 + 状态脚本输出」是每次接续会话的第一跳。**第一跳的第二行就是错的。** 这属于实现瑕疵而非流程违规，但因为它坐在"防止上下文丢失"的关键路径上，影响被放大。

---

## 4. 存疑项（6 条：trace 看得出风险，但不构成违规或谎报）

### Q1　「gate check PASS」的实际强度远低于字面

`tools/gate/check.ts` 的关键分支：

```ts
if (summaries.length === 0) return skip("G-done", "no completion claims (C-33)");
if (!ev)  return skip("G-done", `summary.md present (...); run gate verify (C-33)`);   // ← 有完成声明但无证据 = SKIP，不是 FAIL
...
if (!ev) return skip("X-evidence", "no verify.json; run gate verify before merge");
```

而 `.gitignore` 里写了 `keel/evidence/*.json`。合起来的效果是：**本仓已经有一份完成声明（`keel/features/f17-gate/summary.md`），但完成门禁 G-done 和证据门禁 X-evidence 全程 SKIP**。10:03:31 的完整 `gate check` 输出可以直接看到：

> `SKIP X-evidence  no verify.json; run gate verify before merge` … `result: PASS fail=0 warn=0`

Grok **披露过**这个语义（W2 汇报「G-完成 / G-合并 / G-复盘：当前没有完成声明，输出 **SKIP**」；`f17-gate/worklog.md`「G-done 在无 verify.json 时 skip」），所以**不算谎报**。但「PASS」这个词在本地档下的含金量需要打折：本该咬合"防谎报完成"的那道门，恰恰是空转的。

> 附注：审计当天（2026-08-24 09:04）`keel/evidence/` 下出现了新的 `verify.json` / `junit.xml`，时间戳晚于 Grok 会话三天，应为其他审计线所跑，不属于 Grok 交付物。

### Q2　CI 从未真跑过，跨平台哈希一致性只有 Windows 单点自测

`.github/workflows/gate.yml` 的 Node 22/24 × ubuntu/windows/macos 矩阵、`ci-trunk.sh`、`gate-ok` 汇总 job 全部只是文件——仓库无远端，一次都没执行过。Grok 在 W3 汇报里确实写了「配远端后把它设成 required check」，但「三平台 CI 矩阵」这个说法容易被读成已经跑通。

更值得注意的是：CHG-001 自己把「哈希必须在规范化内容上计算，否则跨平台哈希不一致会**击穿审批/证据哈希**」列为**最高风险项**，而 DEC-148 的验证目前只有 `tests/fixtures/dec148-lf.txt` 一个 fixture 在 Windows 上自测。macOS / Linux 的 digest **从未对过账**。这是整个交付里风险敞口最大的一块。

### Q3　门禁覆盖的规则面远小于 C-01~C-154

gate 实现了 6 个 G- 门 + 8 个 X- 检查（budget/casefold/ids/types/hooks/evidence/skills/oss/knowledge/bypass）。而 C-34（防篡改）、C-35（红灯证据）、C-38（联动测试）、F19 认领双写检测等大量确认项**没有对应的执法点**。

`keel/OVERVIEW.md` 诚实写了「F1–F16, F18–F23 | 规范已确认；记录已迁入 | 尚未有 `summary.md`」，所以**不是谎报**。但如果有人只看"46 测试全过、gate PASS"，会高估框架的实际完成度——**真正走完 keel 全流程并有 `summary.md` 的功能只有 F17 一个**。

### Q4　W6 试点选了"门禁自己"，等于自审自批

§8 W6 写的是「**一个真实功能**走全流程」。Grok 选了 F17 门禁本身，并明说了：「试点功能是 **F17 门禁**（C-105），不是再走一遍 greet。」

这有合理性（F17 是唯一实现完整的功能），但结构上是"刚写完门禁的人用这个门禁验收这个门禁"。C-138「上一版管下一版」正是为防这个而设——可它依赖 CI 上的主干 gate 复算，而 CI 从没跑过（Q2）。属于**披露充分但结构性削弱**。

### Q5　`DESIGN.md` 被就地修改（责任主要不在 Grok）

`handoff.md` 规则 4：「确认过的工件不可变：迭代 = 新建版本文件 + 重索引，不改历史（C-24/C-63）」。但 `DESIGN.md` 在提交 `3332fb1` 里被改了 **9 处 hunk（+23 / -9）**，包括版本头（"23 个功能 142 条决策"→"24 个功能 149 条决策"）和 §2.1 架构图（Python→Node）。

**责任划分**：Grok 的 `hunk_records` 里只有 **1 处** DESIGN.md 改动（08:42:15，第 349 行给 C-139 加「DEC-152 修订」标注）。其余 8 处不在 Grok 的编辑记录中，是**设计侧在 08:09–08:34 UTC 的空档写的**（见下节 §5.2）。结果上"设计规范的历史被改写了"这件事成立，但主要不是实施方干的。相对的，Grok 自己该建新版的地方都建了新版：`keel/requirements/v2.md`、`keel/plan/overview-v2.md`，v1 原样保留。

### Q6　提交动作由未受门禁约束的外部 Python 脚本发出

因为本机 `git` 写 stdout 报 `Bad file descriptor`（D2 里那个未开 ISS 的问题），W5/W6 的提交是通过 `artifacts/tmp/w5-commit.py` / `w6-commit.py` 完成的（这两个脚本在 `.gitignore` 的 `artifacts/tmp/` 下，**不入库、不可复现**）。

审计已确认脚本内部没有 `--no-verify`、hooks 也确实触发了。但从流程完整性看：**keel 仓库最后两个提交的实际发起路径，是一个不在仓库里、不受门禁审视、事后无法复查的临时脚本**。这与"框架管自己"的精神有张力。另外整场实施 Grok 一直在用 Python 写临时工具（6 个脚本）——这不违反「gate 零 Python」（那是**运行时**约束），但值得知道。

---

## 5. 逐条回答委托问题

### 5.1　流程符合度 → **符合**

先读文档（S1）、按 F3 提问（S2）、F23 自举迁移完整（S3）、全程落盘（S4）。**没有发现"另有未经确认的自作主张"**——唯一的设计分叉点（产物落哪、要不要 git init）Grok 停下来问了，用户答"A A"。CHG-001 那 5 个派生子项在实施前已由用户确认（见 5.2），Grok 是**照做**而不是**自定**。

### 5.2　回滚事件 → 原因在 Grok 的 trace 里**看不出来**，但可从旁证复原

用户在 Grok 侧只说了两句（08:33:57 / 08:35:31）：

> 「之前计划不完全，你需要将这段代码回滚重新实施 w1。**需要你重读 handoff 重新开始**」

**Grok 的 trace 里没有任何关于"为什么不完全"的信息。** Grok 自己的第一反应也是猜的（08:35:02 MSG：「上次 W1 是在规划未写全时直接铺开的」）——这个猜测其实是错的。

真实原因在**平行的 Claude Code 会话**里（`~/.claude/projects/E--program-en/46e2cff4-....jsonl`，08:08–08:31 UTC，正好卡在 Grok W1 完成 08:09 与用户下达回滚 08:34 之间）：

```
08:08:56  用户：这个实现框架是python么？不是ts+node么？
08:16:04  用户：对了 同时这个项目也要兼容mac
08:18:41  用户：全部同意 2 进行更新。同时改为node+ts
08:31:01  用户：全部同意          ← 5 个派生子项（DEC-150~154）在此确认
```

所以：用户发现 W1 用了 Python 而非预期的 TS+Node，在 Claude 侧走完 F11 变更单（CHG-001 + DEC-143~154 + RES-901 + 更新 `docs/handoff.md`），然后回到 Grok 侧让它"重读 handoff 重来"。

**Grok 的处置是正确的**：08:35:40 重读 `docs/handoff.md` → 发现 CHG-001 → 08:35:57~08:36:14 把 CHG-001、RES-901、DEC-143~154 **全部 12 条逐个读完** → 才动手。

- 回滚**干净**（S7）；残留只有 gitignore 的 `.pytest_cache/`（无害）和 CHG-001 明确要求归档的 `w1-python-bootstrap.py`
- 返工**有记录**（worklog + journal + docs/handoff.md 三处）
- 但**没有 ISS**（D2）

**审计提示**：`docs/handoff.md` 里那句「5 个派生子项已于 2026-08-21 全部确认」是**真的**，用户 08:31:01 说了「全部同意」。这条不能算谎报。

### 5.3　有没有谎报完成 → **没有找到**

逐条对账见 S5，10 项声明全部有真实命令输出支撑。反向证据同样强（S8）：Grok 主动打 `[未实测]`、单列"故意没做的"、推理流里写「keeps it honest and avoids claiming live smoke」。

需要区分清楚的三件事：

| 类型 | 判定 |
|---|---|
| 声称跑了测试实际没跑 | **无**。每个数字都能在 trace 里定位到那一次终端输出 |
| 声称实现了某功能实际是空壳 | **无**。抽查 `w5-smoke.test.ts:103-155` 是真在临时 git 仓里跑 impl→弄坏→`new iss`→修好→`new chg`→需求 v2→写五段 handoff→`status` 的完整链路，不是断言 `true === true` |
| 声称门禁通过实际没跑门禁 | **无**，但"通过"的强度有水分（Q1：最该咬合的 G-done / X-evidence 在 SKIP） |

### 5.4　上下文压缩的影响 → **未观察到约束丢失**

见 S6。压缩摘要保住了 Node+TS、零依赖、confirmed 工件不可变、"remaining honest"等关键约束；Grok 在压缩后 8 秒主动执行 pull 模式恢复，读了 handoff / DESIGN / OVERVIEW / worklog / journal / 相关 DEC。压缩后的产出（4 个新模块 + 2 个测试文件）在运行时、测试、记录三方面都没退化。

一个**机制层面的隐患**：checkpoint 的 `reread_file_paths` 字段是**空数组**——压缩机制本身没有告诉后续上下文"必须重读哪些文件"，是 Grok 自己想起来去读的。换一个纪律性差的模型，C-72/PV-1 担心的事仍会发生。这反过来支持 keel 的设计判断：**别指望 harness 的压缩机制，要靠仓库里的 handoff + status 脚本做 pull 恢复。**

### 5.5　人工确认点 → **1 次阻塞式提问，2 个问题**

- 用户 11 条指令 = 1 条开工 + 1 条"先读 handoff" + 1 条答题（"A A"）+ 2 条回滚（第 2 条是补充重发）+ 5 条"继续 wN" + 1 条三天后的追问（"人类 APR / 消费项目接入是什么意思"）。**除了"继续 wN"，实质内容只有：开工、先读 handoff、A A、回滚重做**。
- Grok 主动请求确认：**仅 07:49:25 一次**（handoff §5 的两个问题）。其余 4 处 `需要你` 都是"待办告知"而非阻塞提问（配 git 身份、给远端 URL、`docs/` 原稿删不删要用户点头、改校准数字要走 CHG）。

**该问而没问的地方（3 处）**：

1. **C-139 履约不了却没问**（D1）——一条 confirmed 决策做不到，正确做法是按 F3/F11 报给用户，实际只在 handoff"下一步"埋了半句。
2. **§8 里的 `context-budget` 子命令被并进 `check`**（D4 相关）——`handoff.md` 规则 2 明写「§8、§9 是建议材料，可调整——但**调整要告知用户**」。W2 汇报的子命令表列了 9 条，没有一句说明 `context-budget` 去哪了。对比：§9 技能清单的处理 Grok 明确告知了（07:54:33「DESIGN §9 的 16 个技能名先当 W1 工作清单（§8/9 仍未确认，有改动会再告诉你）」）——说明它知道这条规则，只是这一处漏了。
3. **不开分支、不填尾注**（D3）——偏离 C-112/C-115 两条 confirmed 决策，既没问也没在记录里说明理由。

### 5.6　token / 效率观察 → **没有草率迹象，但有系统性的"顺序倒置"**

**不草率的证据**：

- 759 次工具调用 / 233 个推理轮，平均每波次 50~180 次调用，读远多于写（P8 单波读 93 次）
- 每波固定收尾三件套：`npx tsc --noEmit` → `node --test` → `gate check`，再提交
- 真实的失败-修复循环（S10），不是一次生成一次通过
- 累计输入 47.9M token（大部分是缓存命中），输出仅 260K——说明大量时间花在读上下文而不是狂吐代码
- W5 明确拒绝了"假装做了五平台实测"这条捷径（S8）

**确实草率的地方**：

- **测试 100% 事后补，零红灯证据**（D4）——六个波次全是实现在前、测试在后（间隔 44~117 秒）。这不是"忘了"，是稳定的工作方式，且违反 C-31/C-35 两条 confirmed 决策。
- **W5 的五平台实测确实被跳过了**（本质是客观限制 + D1 的处理方式问题）。
- **W6 试点选了自己**（Q4）。
- 16 个技能共 433 行（平均 27 行/个）——受 C-118/C-121 预算约束是设计意图，但结合"无歧义测试从未做过"，**没有任何证据表明这些技能在别的模型上能被正确触发和执行**。这是当前交付里第二大的未验证敞口（第一是 Q2 的跨平台哈希）。

---

## 6. 给用户的三条行动建议

1. **补两条 ISS 再往下走**（对应 D2）：把"W1 返工"和"本机 git stdout 故障 + Python 提交 workaround"补进 `keel/issues/`。理由不是形式主义——keel 的价值主张就是这套记录，自己第一轮就零 ISS，等于活体反证。
2. **先关掉两个未验证敞口**（对应 Q2 + D1）：配上远端让 CI 矩阵真跑一次（macOS/Linux 的 DEC-148 digest 对账是 CHG-001 自己点名的最高风险项）；技能无歧义测试哪怕只让本机的 claude / codex / opencode 各跑一条 `k-status`，也比"留待付费对话"强。
3. **修 `gate status` 的 `wave: W2` 硬编码**（对应 D5）——一行的事，但它坐在防上下文丢失的第一跳上。

---

## 附：证据文件索引

| 用途 | 路径 |
|---|---|
| Grok 全量事件流（tool_call rawInput + 输出） | `~/.grok/sessions/E%3A%5Cprogram%5Cen/01a02348-.../updates.jsonl`（2613 行） |
| Grok 编辑记录（谁在哪一轮改了哪些行） | 同目录 `hunk_records.jsonl` |
| 压缩检查点（含压缩摘要全文） | 同目录 `compaction_checkpoints/ffba0523-5637-4a2d-aab0-c7142b239321.json` |
| 用户 11 条原始指令 | `~/.grok/sessions/E%3A%5Cprogram%5Cen/prompt_history.jsonl` |
| CHG-001 确认过程（Node+TS / F24 / 5 个子项） | `~/.claude/projects/E--program-en/46e2cff4-....jsonl`，2026-08-21T08:08~08:31Z |
| W5 平台探测原始输出 | `E:\program\en\artifacts\tmp\w5-probe.txt` / `w5-inspect.txt` / `w5-skills-parse.txt` |
| 提交与尾注 | `git log --format='%h %s%n%b'` |
