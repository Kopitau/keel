# 需求缺口猎取 v4

- **hunter**: Codex fresh-context subagent gap_hunt_v4（未参与访谈/编写）
- **date**: 2026-08-27
- **scope**: proposed 的 `keel/requirements/v4.md` 全部 28 条 REQ；对照 `gap-hunt-v3.md`、CHG-010、DEC-169/170/173~178、DESIGN §5 与必要的现有实现事实
- **method**: 先按 REQ-001~028 逐条核对 acceptance 与 verification 的数量和顺序，再追溯用户已确认决策、v3 六条严重项及仍延期项；重点检查 CHG→REQ 状态顺序、功能级验收射程、update 零写入、CI 两层证据、legacy RES、REQ-027/028。只读命令包括 `gate status`、定点 `Get-Content`/`rg` 与内存计数脚本；本文件是唯一写入。

结论：**v4 仍应保持 proposed，当前存在 6 组基线阻断项，不得据此切换 INDEX 或声称已确认。** 28 条 REQ 的 acceptance/verification **数量全部一一匹配**；阻断来自状态、射程和验证语义，而不是数组长度。

## 发现

### A. 阻断基线

#### V4-B01　CHG→REQ 状态顺序自相矛盾

- **严重度**: 严重，阻断基线
- **证据**: v4 文件级 `status: proposed`，CHG-010 与 CHG-008 均仍为 `proposed`，但 28 个 REQ 行全部写 `status: confirmed`。REQ-011/AC-5 又规定：confirmed REQ 引用的 CHG 必须 approved 且可追到 APR；DEC-178 也明确自己不能代替 v4 的正式 APR。现有 G-req 以任一 confirmed 行作为“已取基线”标记，并不读取文件级 proposed。
- **去向/处置建议**: v4/CHG 未批准期间，所有变更后 REQ 不得标 confirmed。明确顺序为：处理本报告 → 用户批准 CHG（CHG-008 单独批准或由 CHG-010 明确取代）→ 人类 APR → REQ confirmed → INDEX 切换；G-req 必须先实现 CHG/APR 关系判据。

#### V4-B02　“功能完成声明”对 REQ-025/027/028 没有唯一射程

- **严重度**: 严重，阻断基线
- **证据**: v4 开头声称 REQ 与 F 一一映射，附录却只列 REQ-001~024。REQ-025 的 `feature` 是 `F16 / F23`，REQ-027/028 又共同属于 F7。DEC-174 以功能出现 `summary.md`、计划中的 `req:` 为强制验收触发；对跨两个功能的 REQ-025，文档没有规定“任一完成即触发”还是“两个都完成才触发”。
- **去向/处置建议**: 每个 REQ 设一个唯一 owner feature，其他关联项用 `related_features`/依赖表达；或明确多 owner 的 AND 规则。附录必须覆盖 28 条 REQ，并要求受影响计划新版列全 `req:`，否则会提前验收或永远漏验。

#### V4-B03　DEC-169 只落了一部分可观察行为

- **严重度**: 高，阻断基线
- **证据**: REQ-004/AC-7 已写 `feature:`/`req:`/`blocked_by:`、frontier/blocked 与 G-plan 非法关系失败，但没有钉住 DEC-169 已确认的 frontier 精确定义（未完成、未认领、依赖均完成）、旧计划缺 `blocked_by` 视为无阻塞、`worktree add` 对阻塞功能只 WARN 不拒，以及 status 的 `proxy_acs:` 读取端。
- **去向/处置建议**: 把这些行为补成 AC，或逐项写明延期及复审触发；不能以一个笼统 AC 代表整份 confirmed DEC。

#### V4-B04　DEC-170 的人类动作技能边界没有写进 AC

- **严重度**: 高，阻断基线
- **证据**: REQ-016/AC-8 只说生成“匹配技能类型”的 `agents/openai.yaml`，但没有定义匹配结果。DEC-170 的核心是 User skills 的 `policy.allow_implicit_invocation: false`、Model skills 为 true，且两类并集等于技能目录；这正是防止 k-accept/k-change/k-init 被模型隐式启动的授权边界。
- **去向/处置建议**: 在 AC 中明列 User/Model 两类策略、目录并集与镜像一致性；缺失、stale 或分类漂移均应 X-skills FAIL。

#### V4-B05　verification 数量正确，但部分语义不满足 DEC-174

- **严重度**: 高，阻断基线
- **证据**: 28 条 REQ 的 AC/verification 数分别全部相等；但 `manual` 必须写明证据条件，REQ-003/AC-3、REQ-004/AC-5、REQ-005/AC-4~5、REQ-012/AC-3、REQ-014/AC-2、REQ-015/AC-3~4 未给可留存的人工/真环境证据。REQ-016/AC-1 写五家 harness “读指令”却标 auto，与 DEC-156 记录的“未做五家 live 实点”层次混淆；REQ-027/AC-7 的无子代理平台真实回退标 machine-doc，也只能证明协议文字存在。
- **去向/处置建议**: 为每个 manual AC 写证据载体、执行环境、通过判据与 tree/commit 绑定；把“本地布局契约”和“真实 harness 行为”拆成 auto/manual 两层。machine-doc 不得冒充真人或真平台执行。

#### V4-B06　legacy RES 与评审清零各缺一个决定性判据

- **严重度**: 高，阻断基线
- **证据**: REQ-002/AC-6 与 REQ-022/AC-6 已提出 persistent legacy marker + 原规范化内容哈希，但未定义客观升级截止点、哈希材料是否排除 marker/hash 自身、以及 WARN 的显式解除路径；否则可能自引用或把升级后的任意旧缺口重新“洗成 legacy”。REQ-027/AC-5 只要求实跑并记录结果，没有写“复现命令不再复现才可清零”；DEC-159 明确要求确认被拒。REQ-027/AC-8 的追加历史本身写对了。
- **去向/处置建议**: legacy 最低语义应固定为“升级清单中预存 ID+去除 legacy 元数据后的规范化哈希”，仅原哈希匹配且仍零 URL 时 WARN；补 URL 后 PASS，其他实质修改仍零 URL 时 FAIL。评审则须明确每条 blocking 的复现判据、失败/被拒才可 clear、无命令或仍复现不得 passed。

### B. gap-hunt-v3 六条严重项 disposition

| v3 项 | disposition | 证据与去向 |
|---|---|---|
| G-01 CHG 未批而 REQ-027/028 confirmed | **未解决，仍阻断** | DEC-178 只确认核心方向且明确不代替 APR；CHG-008/010 仍 proposed，v4 全部 REQ 却 confirmed。见 V4-B01。 |
| G-02 REQ-019 与 DEC-155 冲突 | **需求正文已解决，配套未解决** | v4 的三档语义准确；但根 AGENTS.md 仍无条件写“一功能一分支一 worktree”。切基线前须按批准变更同步 L0，否则新会话仍收到相反规则。 |
| G-03 `keel update` 静默覆盖 | **需求层解决，实施待证** | REQ-025/AC-7 已覆盖完整清单、直接 `y/N`、默认 N、非 y/EOF/stdin 不可用零写入，bounds 也限制只触碰清单文件；现有 `update.js` 仍直接 `force: true` 复制并写 config，故实施与测试未完成前不得验收。 |
| G-08 approvals 目录保护无 REQ | **已解决** | REQ-018/AC-5 已覆盖 GitHub/Gitee CODEOWNERS 真人与 local 降级。 |
| G-09 破坏性变更无 REQ | **已解决** | REQ-023/AC-6 已覆盖 adr DEC + approved CHG + release 说明。 |
| G-28 全仓覆盖与验收范围冲突 | **部分解决，仍受阻断** | `summary.md` 触发和三类 verification 已写入，数组数量也正确；但共享 REQ owner 不明、若干 verification 类型不诚实，见 V4-B02/B05。 |

### C. 重点协议核对

| 协议 | 结论 | 说明 |
|---|---|---|
| update `y/N` 与确认前零写入 | 需求文字通过 | “任意 update”使 `--force` 也不能绕过确认；实现证据仍欠。 |
| feature-scoped coverage | 不通过 | 单 owner/多 owner 触发语义及 25~28 映射缺失。 |
| CI 两层证据 | 通过 | REQ-017/AC-3 为本地 workflow 契约 auto；AC-4 为真实六格 GitHub Actions manual；未决问题如实写首次运行尚缺。 |
| legacy RES WARN/FAIL | 不通过 | 方向正确，但持久身份与解除规则不足以防重新盖章，见 V4-B06。 |
| REQ-027 打开态/关闭态 ISS | 通过 | REQ-010/AC-2~3 已分开最小打开字段与关闭诊断字段。 |
| REQ-027 `repro_runs` 历史 | 通过 | AC-8 明确追加且空轮不得抹除；清零结果判据另见 V4-B06。 |
| REQ-028 攻击面清单 | 通过 | 路径、最小字段、追加不删均已进入 AC-5。 |

### D. 28 条 REQ 逐条核对

下表的 `n/n` 表示 acceptance 数量与 verification 数量一致；“延期”表示 v3 已指出但本次 CHG 未解决，不等于已接受为基线。

| REQ | 数量 | 结论 |
|---|---:|---|
| REQ-001 | 6/6 | 数量通过；bounds 仍复述 description、无真实反例（G-31，延期）。 |
| REQ-002 | 6/6 | legacy 方向进入 AC；`≥2-3` 仍不可判（G-24），manual 离线证据与 legacy 判据见 B05/B06。 |
| REQ-003 | 6/6 | 状态机可测；“当场写入”仍无可观察证据（G-25/B05）。 |
| REQ-004 | 7/7 | DEC-169 部分落地；统一规划确认的 APR+规范化哈希仍缺（G-15）。 |
| REQ-005 | 5/5 | AC-3“无墙”和 AC-4~5 主观判据仍空洞（G-22）；bounds 仍无反例（G-31）。 |
| REQ-006 | 8/8 | 完成触发已收口；共享 REQ 射程见 B02；non_goals 仍误放 notebook 义务（G-32）。 |
| REQ-007 | 5/5 | 协议机检层次清楚；`must: 建议` 与必需的 REQ-027/028 仍倒挂（G-04）。 |
| REQ-008 | 5/5 | 主流程可判；合并后清 worktree/触发复盘、失败开 ISS 仍缺（G-16）。 |
| REQ-009 | 4/4 | “summary 固定节”仍未列五节，技术路线说明仍可能漏验（G-23）。 |
| REQ-010 | 6/6 | 打开/关闭 ISS 字段冲突已修；bounds 仍是 description 复述（G-31）。 |
| REQ-011 | 5/5 | 新增 CHG→REQ 判据正确，但草案自身违反它（B01）；must 三档仍未定义（G-04）。 |
| REQ-012 | 4/4 | journal 的写入责任/格式仍无 AC 或 non-goal（G-11）；跨 harness manual 证据不明确。 |
| REQ-013 | 4/4 | “五类信号”仍未在 REQ 内列举（G-26）。 |
| REQ-014 | 4/4 | verification 字段承认脱敏为 manual 是进步，但没有人工核验记录条件（G-27/B05）。 |
| REQ-015 | 4/4 | status 到期数与 summary/OVERVIEW 引用 OSS 仍缺（G-13）。 |
| REQ-016 | 8/8 | headless 配方补齐（G-10）；DEC-170 分类边界与 live harness 层次仍缺（B04/B05、G-19）。 |
| REQ-017 | 5/5 | CI 契约/真实运行两层修正正确；hooksPath 与 `--no-verify` 尾注义务仍缺（G-17）。 |
| REQ-018 | 5/5 | G-08 已解决；数量与语义无新增阻断。 |
| REQ-019 | 4/4 | DEC-155 三档已准确落地；AGENTS.md 配套仍冲突（G-02）。 |
| REQ-020 | 4/4 | 数量与验证类型无新增发现。 |
| REQ-021 | 5/5 | 多画像/按触碰范围选命令仍缺（G-12）；tsc 射程仍不明（G-20）；W1 non-goal 已过时（G-30）。 |
| REQ-022 | 6/6 | legacy AC 新增；停用旧框架确认、k-migrate/gate 分工和分批规则仍无 AC（G-14）。 |
| REQ-023 | 6/6 | G-09 已解决；技能/模板/冒烟验收仍被截断（G-19），AC-4 仍偏定义而非判据（G-25）。 |
| REQ-024 | 6/6 | 真实平台证据已诚实标 manual；首次六格未跑已列未决，无新增文本阻断。 |
| REQ-025 | 9/9 | G-03/G-06 已在需求层修正；`doctor` 仍零 AC（G-21）；实现尚未满足 y/N。 |
| REQ-026 | 4/4 | 空项目 SKIP 与活动后 FAIL 边界清楚，无新增发现。 |
| REQ-027 | 8/8 | headless、ISS 打开态、证据绑定、熔断、追加历史均补入；清零结果判据与真实平台回退验证仍缺（B05/B06）。 |
| REQ-028 | 5/5 | 攻击面清单缺口已修；AC-5 标 machine-doc 只能验结构，条件触发追加仍需可运行行为证据。 |

### E. v3 其余中低项去向

- **已解决**: G-05、G-06、G-07、G-10、G-33；G-08/G-09 见严重项表。
- **部分解决**: G-27（有 manual 类型但证据条件不足）、G-29（已区分 machine-doc，但 live 行为仍须另证）、G-30（REQ-017/019/023/024 已改，REQ-021 仍留 W1 语句）。
- **仍延期，未静默销项**: G-04、G-11~G-26、G-31、G-32、G-34；其中 G-15/G-19/G-22/G-25 与本报告阻断项相交，不能仅标“以后再说”。
- **低项配套仍在**: G-21 的 doctor AC、G-34 的 N1 去向、AGENTS.md 地图缺 `loop`/`hook`；后者还会降低 REQ-027 的可发现性。
- **结构性建议**: verification 字段已采纳；source 仍大量使用 C 区间，v3 所建议的显式列举与“来源声明但无落点”机检尚未采纳。
- **v3 已判可接受项**: C-22/C-28/C-29/C-30/C-68/C-109/C-116 的相邻规则覆盖未发现新的反证，可保持原 disposition。

### F. 新增矛盾、遗漏、不可测与越权分类

- **新增矛盾**: V4-B01、V4-B02。
- **新增/继续遗漏**: V4-B03、V4-B04、REQ-027 清零结果判据。
- **不可测或证据类型不符**: V4-B05、legacy hash 身份的自引用/重新盖章风险。
- **AC/verification 数量错位**: 无；28 条全部匹配。
- **越权范围或新增未批准依赖**: 无；未发现 v4 新增重型中央编排器、运行时 npm 依赖或修改 DESIGN §8/9 的确认地位。

## 结论与基线门槛

本次 gap-hunt **不确认 v4**。在以下事项完成前，v4 应继续 proposed、INDEX 应继续指向 v3：

1. 修正 CHG/APR/REQ 的状态顺序，并决定 CHG-008 与 CHG-010 的批准或取代关系。
2. 定义 REQ-025/027/028 的 owner feature 与完成触发，补全 28 条映射。
3. 完整落地 DEC-169/170 的用户已确认边界。
4. 修正 manual/machine-doc/auto 的证据语义，特别是真实 harness 与主观纪律项。
5. 固定 legacy RES 的不可重新盖章身份及解除规则。
6. 把 blocking 复现“已被拒/不再复现”写成 review passed 的必要条件。
7. 同步 AGENTS.md 的 DEC-155 三档规则，并在实施后取得 update 零写入、CI 六格、trace/legacy/review-history 的相应证据。

其余延期项可进入后续 CHG/澄清版，但必须逐项保留状态，不能因为 v4 新增 verification 字段而视为自动解决。

## 复核 R2

- **reviewer**: Codex fresh-context subagent gap_hunt_v4（R2 仅复核修订结果，未参与 v4 修订）
- **date**: 2026-08-27
- **inputs**: requirements v4、本 gap-hunt R1、CHG-010、DEC-169/170/173~181、必要的 DESIGN §5 与 AGENTS.md
- **method**: 逐项重放 V4-B01~B06 的证据链；重新机械计数 28 条 acceptance/verification、REQ 状态与 owner 映射；R1 历史不改写，本节给出最新 disposition。

### R2 总结

六组 R1 阻断中，**B-02、B-03、B-05、B-06 已解决；B-01 仍有一处顺序冲突；B-04 仍有一处精确字段路径缺口。** 因而本轮仍有 2 个基线阻断，尚不能进入用户整份确认。

### B-01~B-06 逐项 disposition

| R1 项 | R2 disposition | 复核证据 |
|---|---|---|
| V4-B01 CHG→REQ 状态顺序 | **remaining blocker** | 状态本身已修正：v4 文件为 proposed，28/28 REQ 均 proposed、0 confirmed，CHG-008/010 仍 proposed，DEC-179 也规定合并 APR。可是 CHG-010“批准”首段仍写“规划新版和实现完成后”才 gap-hunt/APR；DEC-179 则明确“一次 APR 后才编写计划新版并实施 CHG-010”。同一变更单中前后顺序相反。 |
| V4-B02 唯一 owner 与完整映射 | **resolved** | DEC-180 与 v4 一致：REQ-025 owner=F23、`related_features: [F16]`；REQ-027/028 owner=F7；附录 28 行覆盖 28 个唯一 REQ，并明确 related feature 不重复承担验收。 |
| V4-B03 DEC-169 精确语义 | **resolved** | REQ-004/AC-7~9 分别钉住非法引用/自指/不存在/环、旧计划缺 `blocked_by`=空数组、frontier/done/claim/blocker 精确定义、blocked 格式、`proxy_acs:`、worktree WARN 但不拒。 |
| V4-B04 DEC-170 集合/策略/漂移 | **remaining blocker** | User/Model 两个精确集合、不相交/并集=catalog、先生成再镜像、missing/stale/字段/分类漂移/X-skills FAIL 均已补；但 AC-9 只写 `allow_implicit_invocation`，DEC-170 的实际接口是嵌套字段 `policy.allow_implicit_invocation`。授权边界字段路径仍允许错误实现。 |
| V4-B05 manual/真实 harness/fallback | **resolved** | R1 点名的 manual 项均新增证据载体与判据；REQ-016 已拆成本地布局 auto + 六家真实触发 manual；REQ-027 已拆成 fallback 协议 machine-doc + 真实新会话 manual。未再用 machine-doc 冒充真 harness 执行。 |
| V4-B06 legacy 与 clear 谓词 | **resolved** | DEC-181 和 REQ-002/022/025 固定 `<records_dir>/migrations/res-citation-legacy.json`、0.8.0 客观分界、写前 config、外置 ID/路径/DEC-144 全文哈希、仅明确 y 后写、URL→PASS、修改零 URL→FAIL；无自引用或重新盖章口子。REQ-027/AC-5 已要求 ISS 打开时记录“已修复谓词”，只有不再复现/明确拒绝才 clear，并追加命令、判定、轮次、时间、tree hash。 |

### R2 blocker 详情

#### R2-N01　CHG-010 内部的批准/实施顺序互相反转

- **严重度**: 严重，阻断用户整份确认
- **证据**: CHG-010“批准”首段要求“完整 v4、规划新版和实现完成后”再独立 gap-hunt、整份确认与 APR；同文件随后记录的 DEC-179 方案，以及 DEC-179“影响”正文，都要求 v4+gap-hunt+用户点头先形成合并 APR，**随后**才编写计划新版并实施，目的正是避免再次未批准先实现。
- **处置建议**: CHG-010 的批准段必须统一为 DEC-179 顺序：v4 草案 → gap-hunt/R2 无阻断 → 用户整份点头 → 同一 APR 原子批准 CHG-008/010/v4 → 计划新版 → 实施与验收证据。不要保留“实现完成后才批准”的旧句。

#### R2-N02　DEC-170 的 YAML 策略字段缺少 `policy.` 路径

- **严重度**: 高，阻断用户整份确认
- **证据**: DEC-170 明确 Codex 读取 `policy.allow_implicit_invocation`；REQ-016/AC-9 只写 `allow_implicit_invocation: false/true`。YAML 顶层同名字段与 `policy` 下字段不是同一接口，AC-10 的“字段错误 FAIL”也必须先有唯一字段路径才能判。
- **处置建议**: 把 AC-9 两处改成完整的 `policy.allow_implicit_invocation: false/true`，AC-10 继续校验生成文件与该嵌套路径一致。

### 28 条 acceptance/verification R2 计数

机械复核结果：28 个 REQ、28 个 proposed、0 个 confirmed；owner 映射 28 行且 REQ 唯一数为 28。所有数组仍按顺序等长：

| REQ | AC/verification | REQ | AC/verification |
|---|---:|---|---:|
| REQ-001 | 6/6 | REQ-015 | 4/4 |
| REQ-002 | 6/6 | REQ-016 | 10/10 |
| REQ-003 | 6/6 | REQ-017 | 5/5 |
| REQ-004 | 9/9 | REQ-018 | 5/5 |
| REQ-005 | 5/5 | REQ-019 | 4/4 |
| REQ-006 | 8/8 | REQ-020 | 4/4 |
| REQ-007 | 5/5 | REQ-021 | 5/5 |
| REQ-008 | 5/5 | REQ-022 | 6/6 |
| REQ-009 | 4/4 | REQ-023 | 6/6 |
| REQ-010 | 6/6 | REQ-024 | 6/6 |
| REQ-011 | 5/5 | REQ-025 | 9/9 |
| REQ-012 | 4/4 | REQ-026 | 4/4 |
| REQ-013 | 4/4 | REQ-027 | 9/9 |
| REQ-014 | 4/4 | REQ-028 | 5/5 |

### 其他 remaining（不新增为本轮 B-01~B-06 blocker）

- AGENTS.md 仍写无条件“一功能一分支一 worktree”，与 DEC-155/REQ-019 三档不一致；这是 R1 的 G-02 配套实施项，批准后必须优先同步，不能继续当作当前 v4 已落地证据。
- AGENTS.md gate 地图仍漏 `loop`/`hook`；v3 中低项及 R1 E 节列出的延期项仍维持原 disposition，没有因本轮六组修订而自动解决。
- 首次 GitHub Actions 六格、真实六 harness、update/legacy 消费项目实测仍是实施验收证据，不是本次 requirements 文本复核可替代的结果。

### R2 结论

当前 **remaining blocker = 2，new blocker = 1（R2-N01；R2-N02 是 B-04 的残余）**。先修正 CHG-010 的相反顺序与 REQ-016 的完整策略字段路径，再做一次定点复核；在此之前不得进入用户整份确认，也不得把 proposed 改为 confirmed。R2 评审者不替用户确认。

## 复核 R3

- **reviewer**: Codex fresh-context subagent gap_hunt_v4
- **date**: 2026-08-27
- **scope**: 仅定点重读当前磁盘上的 CHG-010、REQ-016/AC-9、requirements INDEX，并机械复核 28 条状态与 AC/verification 数量；不沿用 R2 缓存。

### R2-N01/N02 disposition

| R2 项 | R3 disposition | 当前磁盘证据 |
|---|---|---|
| R2-N01 CHG-010 批准/实施顺序反转 | **resolved** | CHG-010“批准”现统一为：完整 v4 → 未参与访谈的新上下文 gap-hunt 且评审通过 → 用户整份点头 → APR 哈希批准；随后才编写规划新版并实施。其后 DEC-179 记录同样写“完整草案和独立复核完成、用户整份点头后，由同一份 APR 一次批准”，不再保留“实现完成后才批准”的旧顺序。 |
| R2-N02 DEC-170 策略字段路径不完整 | **resolved** | REQ-016/AC-9 已精确写 User skills 为 `policy.allow_implicit_invocation: false`、Model skills 为 `policy.allow_implicit_invocation: true`；两组精确集合、不相交、并集=catalog 与 AC-10 的 missing/stale/字段/分类漂移失败条件保持完整。 |

### 机械复核

- REQ 条目：28。
- `status: proposed`：28；`status: confirmed`：0。
- acceptance/verification：28 条逐条等长，`mismatch=none`。
- requirements INDEX：`current: v3.md`；v4 只列在 versions 中，尚未成为当前基线。

### R3 结论

- **remaining blocker**: 0。
- **new blocker**: 0。
- **是否可进入用户整份确认**: **可以**。本次只表示 requirements 文本的独立 gap-hunt 已无阻断，可把完整 v4 提交给用户整份点头；不代表评审者替用户确认，也不把 proposed 自动改为 confirmed。
- 用户若点头，后续仍须按 DEC-179 用同一 APR 原子批准 CHG-008、CHG-010 与 requirements v4；之后才进入规划新版与实施/真实环境证据阶段。
