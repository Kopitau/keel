# worklog — F6 f06-evidence

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W3，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W3）

- 进度：`gate verify` 写 `keel/evidence/verify.json`（gitignore）。树哈希用临时 index 的 `git write-tree`，排除 `keel/evidence/`。过期证据使 X-evidence / G-done / G-merge 失败。
- 实现决定：JUnit reporter 写入相对路径；解析失败则回退 TAP `# pass`。不把证据打进树哈希，避免 JSON 自污染。

## 2026-08-24（P0）

- 进度：ISS-002 无证据 = FAIL；ISS-003 `X-trace` 只扫 `tests/`，范围=已宣称完成的功能。

## 2026-08-26（DEC-168：黑盒验收与白盒回归分开计数）

- 决策：DEC-168（用户原话「A」）。起因：本仓 179 条与 zhaoxi F0 104 条测试逐条审读——标准（C-32/34/35/37/38）为功能而写，执行器只认字符串；本仓 `REQ-017/AC-1..4` 四条占位与 zhaoxi 六条代理测试同一形态（白盒测试挂黑盒的名）。
- 内部分解：`trace.ts` 只从**测试名**取标记（JS/TS 复用 `parseTestInventory`，Python 取 `def test_` / `@pytest.mark` 行），注释与 fixture 字符串不再算覆盖；`[proxy:<解除条件>]` 记 WARN；`ISS-`/`DEC-`/`fp:` 开头的名带 AC 标记记 WARN（本版仍计覆盖，升 FAIL 另出 DEC）；`gate trace` 加 proxy 列与白盒违规清单；`CheckItem.acknowledged` 让理由已在工件里的 WARN 不被 C-103 升为 FAIL（X-trace 在 NO_WAIVE 里，否则 proxy 会直接挡提交）。
- 实现决定：DESIGN §5 F6 **不原地改**（C-24/C-63；DESIGN.md 自 W1 后未改过）。规则由 DEC-168 承载，`k-impl` 第 4 条与 CONTEXT.md 术语表引用之——DEC-168 影响节第 1 条提到的「DESIGN §5」以此为准。
- 实现决定：`req_coverage`（verify.json）随之只数测试名命中的文件，比原先的全文扫描少——这是修正，不是回归。
- C-34: ref=DEC-168 —— 删除 `tests/r2-rework.test.ts` 的 `REQ-017/AC-1`、`/AC-2`、`/AC-3`、`/AC-4` 四条占位（正文与 AC 无关，见 DEC-168 证据表）。改名：w6 两条 + p0 ISS-005 → `REQ-017/AC-4 …`；w6 CI 工作流 → `REQ-017/AC-3 [proxy:CI never ran; AC not locally verifiable, rewrite via k-grill] …`；w1 哈希 → `I-16 …`；w1 config → `I-17 …`（加 `isAllowedTestCommand` 断言）；w4 sync → `I-18 …`（加非符号链接断言）。
- 新增 `tests/dec168-test-kinds.test.ts`：判据守卫 9 条（分类函数 / 注释不算 / 黑盒 PASS / proxy WARN 不升级 / 白盒挂 AC WARN / Python 名 / 矩阵 proxy 列 / 本仓正样本 / k-impl 文字）+ `REQ-017/AC-1` 两条黑盒（拷到仓库外无 node_modules 跑 `gate status`；假 node 20 让本平台启动器拒绝且不进 gate.ts）+ `REQ-017/AC-2` 一条黑盒（FAIL/WARN/PASS 三态、fix 行、C-103 worklog 放行）。
- 问题链接：ISS-044（模板与脚手架不生成 `req:`，X-trace 对消费项目不绑定；open，另起实施）。
- 遗留：`REQ-017/AC-3` 现为 `[proxy]`，本仓 X-trace 从此显示 WARN——CI 从未跑过且该 AC 不可本地验收，按 DEC-168 复审条款应回 k-grill 改写 AC。zhaoxi 六条代理测试按 DEC-168 影响节第 5 条由其自行处理。
- 证据：`npx tsc --noEmit` 干净；`node --test` **187/187**（179 − 4 占位 + 12 新增）；`gate check --quick` → `PASS_WITH_WARN fail=0 warn=1`（唯一 WARN = X-trace 的 REQ-017/AC-3 proxy，按设计）；`gate verify` exit 0，passed=187，tree `5cd0caa27b273d472209801134615d37d5140293`（dirty=true，未提交）；假 node 20 的启动器拒绝测试在 Windows（gate.ps1）实跑通过，POSIX 分支（gate.sh）待 CI/macOS 首跑。

## 2026-08-28（P1 / verification parser 切片）

- 内部分解：本会话只做 plan v2 步骤 1——requirements 的 acceptance/verification 等长与 `auto`/`machine-doc`/`manual` 枚举；trace 展示、claimed scope 证据判定和 evidence stale 留后续会话。
- 开工审计：现有 trace 只数 `Given` 行，G-req 完全不读取 verification，少项、多项和非法类型都会静默通过。
- 兼容边界：DEC-174 明确该协议由 requirements v4 引入；完全没有声明“验证方式”且无 verification 字段的旧格式保持可读，一旦协议出现就对当前文件全部 REQ 严格校验，避免旧 fixture/消费项目被无迁移路径直接阻断。
- 执行边界：P6 继续只做本地，真实 GitHub 六格不触发，REQ-017/AC-4 保持 proxy WARN。
- 红灯：`node --test tests/chg010-verification.test.ts` 为 1 pass / 3 fail；少项、多项、非法枚举均被旧 G-req 报 PASS，合法三类型数组为唯一既有 PASS。
- 实现决定：parser 进入既有 `trace.ts`，G-req 与 trace 共用同一份 REQ/acceptance 结构，避免两套 AC 计数漂移；数组严格区分大小写，只接受确认的三个字面值。
- C-34: ref=DEC-174 新增四条 verification 协议黑盒测试并更新测试名基线。
- 绿灯：新增测试 4/4；连同 DEC-168 trace、旧格式兼容、frontier 与既有 F6 回归为 27/27；`npx tsc --noEmit` exit 0；quick 为 PASS_WITH_WARN，G-req 报告 `28 verification array(s) valid`，唯一 WARN 仍是 REQ-017/AC-4 六格 proxy。
- 追溯：`gate trace` 的 28 条 REQ/AC 数量保持不变，REQ-006/AC-2 与 AC-7 现在由 `tests/chg010-verification.test.ts` 覆盖；本切片尚未把 verification 类型列加入 trace 表，留 plan v2 步骤 2。

## 2026-08-28（P1 / trace verification 与 claimed scope 切片）

- 内部分解：plan v2 步骤 2；只扩展 trace 的可观察协议，不改变未声明完成功能不阻断的 DEC-174 边界，也不解除真实六格 proxy。
- 红灯：新增两条黑盒后 `node --test tests/chg010-verification.test.ts` 为 4 pass / 2 fail；旧矩阵看不到 AC 对应的 verification 和 claimed scope，manual proxy 虽已存在但无法与验证类型、强制范围同表对账。
- 实现决定：`TraceRow` 直接携带 requirements parser 的 AC 顺序 verification 和由 `summary.md` 推导的 claimed 布尔值；输出增加 scope/verification 两列、claimed 总数与 claimed uncovered，避免另建第二套映射。
- C-34: ref=DEC-174 —— 新增 claimed/unclaimed 正反向输出测试，以及“claimed manual proxy 只能 WARN、不得 PASS”的黑盒测试；基线更新为 223 个测试名。
- 绿灯：新文件 6/6；连同 DEC-168、ISS-044、P0/R2 trace 回归共 37/37；`npx tsc --noEmit` exit 0。真实 `gate trace` 显示 2/28 REQ claimed、claimed uncovered=0，REQ-017/AC-4 明确为 manual proxy，未冒充 PASS。
- 边界：P6 继续本地；GitHub Actions 六格 run 证据未记录，REQ-017/AC-4 proxy 保留。

## 2026-08-28（P1→P2 / evidence stale 与 review 追加历史联动）

- 内部分解：F6 plan v2 步骤 3 与 I-06/I-22；用同一攻击探针贯穿未修复、修复、重复 clear、verify 保留、代码树变化失效和重跑刷新，避免把两个证据写入器分开验证。
- 红灯：有效跨平台探针夹具下 `node --test tests/chg010-review-loop.test.ts` 为 0/2；第二轮 clear 只留下 1 条最新记录而非 2 条追加历史，重复 clear 还会清空。
- 实现决定：每条新 `repro_run` 写 `round`、`recorded_at`、`tree_hash`；`attachReview` 追加旧历史；passed 判据按每个 ISS 的最后一次运行判断，早期退出 0 的漏洞态不删除、也不让后来确已拒绝的结果永久失败。
- C-34: ref=DEC-177 —— 新增 `tests/chg010-review-loop.test.ts` 两条跨模块黑盒；兼容已有无新增元数据的旧 review 证据，不伪造其历史时间/hash。
- 绿灯：新测试 2/2；连同 W3、CHG-008、R4/R5 为 44/44。ISS-036 按既定回归测试防线关闭；tree change 使旧 evidence stale，重跑 verify 后 fresh 且 review 历史字节级保持。

## 2026-08-29（CHG-011 Q6 全量证据）

- 进度：X-evidence 只在全量 check 判（quick 不含）；`gitWriteTree` 剔除评审回路产物；`gate verify` 在提交后的干净树上重跑，证据见提交信息。

## 2026-09-01（CHG-014 S4：DEC-187 证据快照与回读）

- 进度：`evidence.ts` 新增 `approvalEvidenceLines` / `readApprovalEvidence` / `evidenceViaApproval` / `evidenceVerdict`；G-done / G-merge / X-evidence 改走 `evidenceVerdict`：`verify.json` 新鲜且对账 → 照旧；缺失或过期 → 找 approved APR 的 `evidence_tree_hash` 等于当前树、exit 0、failed 0、passed > 0 → PASS 并注明 `via APR-nnn`；否则 FAIL 且提示里加一句"local 档可用 APR 快照"。
- 实现决定：**树哈希排除 `keel/approvals/`**（`git.ts gitWriteTree`，与 evidence / 评审产物同列）。第一次跑测试就撞上：`gate approve` 改写 APR 文件本身会移动树，快照永远对不上批准后的树。APR 是对树的证明、由自身正文哈希（X-apr）绑定，不该计入被证明的树。顺手把排除清单从硬编码 `keel/` 改为按 `records_dir` 计算。
- 证据：`tests/chg014-evidence-snapshot.test.ts` `REQ-006/AC-9`（verify.json 删除后三条门禁经 APR-001 PASS；树移动后三条 FAIL）；`node --test` **251/251**；`npx tsc --noEmit` 干净。

## 2026-09-01（CHG-014 S5：verify 的 junit 展开）

- 进度：`gate verify` 对 pytest 补 `--junitxml=keel/evidence/junit.xml`、对 `vitest run` 补 `--reporter=default --reporter=junit --outputFile=…`，node:test 保持原展开；证据里的 `command` 仍是展开后的 argv，`evidenceGaps` 用同一套解析核对。fmea-v3 那种本地改 `verify.ts` 补 junit 的补丁可以撤。见 F21 worklog 同日节。

## 2026-09-01（评审第 1 轮：ISS-061）

- 同树的红色 / 未对账 `verify.json` 优先于任何 APR 快照；快照只认已提交且与 HEAD 一致的 APR 文件。见 F7 worklog 同日「评审第 1 轮」节。

## 2026-09-01（REQ-006/AC-10：证据按功能说话）

- 用户："273条测试通过，门禁这些感觉没有什么意义。应该有类似测试或者门禁分类的说明，通过什么测试了XX功能通过了。" `trace.ts` 新增 `featureCoverageLines`：每个带计划的功能一行——编号与目录、已 summary / 施工中、认领的每条 REQ 标题、验收条目数、黑盒 / 替身（哪几条）/ 缺失（哪几条）、测试文件；`gate trace` 开头打印「按功能（人话）」节，`gate verify` 在 counts 后打印 `coverage by feature:`。AGENTS.md「Turn end」要求汇报证据时按功能引用这份摘要而不是测试总数。
- 证据：`tests/chg014-evidence-summary.test.ts` ×3（夹具两功能的精确文案、verify 输出、本仓 F17 行）。

## 2026-09-01（ISS-068：junit 多 suite 计数；0.9.3）

- 试点清理时 zhaoxi 主干 `gate verify` 报 `passed=5`，node:test 自己汇总 193 条。根因：`parseJunit` 取全文第一个 `tests=` 属性；node:test 每个 describe 一个 `<testsuite>`，根元素无总数。修复：只认根元素属性，否则逐个数 `<testcase>` 减去带 `<failure>`/`<error>`/`<skipped>` 子元素的。
- 探针（DEC-182）：修复前树 61cdb1e8b7eb… 上 `passed=5 failed=0`、退出 0；修复后同一探针退出 1。
- 证据：`tests/iss068-junit-suites.test.ts` ×2（node:test 嵌套 suite + 文件级失败；pytest 单 suite 与 vitest 根总数不变）。

## 2026-09-02（CHG-015：证据 JSON 带 feature_coverage）

- `verify.ts` 把 REQ-006/AC-10 的按功能行写进 verify.json（`feature_coverage`），pack 的 `evidence` 随之带上，评审者第三问直接读；`evidenceGaps` 的评审判定改为"检查命令退出 0 = 已清"（DEC-191）。证据：`tests/chg015-review-three-questions.test.ts`（REQ-006/AC-10）。

## 2026-09-04（CHG-016 / DEC-192：证据树只算代码；草稿计划只警告；替身须有解除条件）

- `git.ts`：`gitWriteTree` 去掉整个记录目录再加回 `config.json`；`gitDirty` 同理（ISS-070 的例外被覆盖）。`trace.ts`：`claimPlanFiles` 取有 APR 绑定的最高计划版本；`draftClaimedReqs` 单列基线外的 REQ（REQ-000 除外）；`traceWarnings` 报无解除条件的替身。证据：`tests/chg016-audit-round2.test.ts`（REQ-006/AC-11、AC-12、AC-13）。

## 2026-09-14（CHG-019：Astra / taotie 审查后的全面优化）

- 范围与授权：见 CHG-019；新版需求 v10、总览 v6，仅修改 keel，不动 taotie 业务树。官方依据与审查来源见 RES-910。
- 技术取舍：保留既有 evidence 字段与 Node 内置运行时；dirty 仅为观察元数据，G-merge 读当前工作区。trace 是静态映射，manual 始终另核验，不新增人工证据数据库或冒充自动验收。普通 review 与正式循环按需分开。
- 修复前：新增 tests/chg019-evidence-types.test.ts 五场景 0/5，实际复现 dirty 误判、损坏 JUnit 被 APR 冻结、manual 被算黑盒、ac-only 不能辨别 manual、草稿覆盖绑定计划汇总。
- 实现：evidenceGaps 不因 dirty 失败；approve 用完整对账；G-merge 独立给提交提示；trace 按类型显示映射/人工/替身/缺项，claim 汇总复用绑定范围；manual ac-only 明确待核验，不可因新增名称清除。
- 指令与记录：AGENTS、grill/new/research/evidence/handoff/review/migrate、模板与工作说明对齐；正式循环移至 skill references；旧确认件不改，当前总览不堆叠历史“当前版本”。
- 测试调整：旧 P1 dirty 拒绝断言由 REQ-006/AC-14 的公共命令回归替代，保留缺 JUnit 拒绝；旧“黑盒数量即证明”输出期望改为静态类型映射，保留 REQ/AC 与替身/缺失明细。不是删除功能覆盖。
- 当前证据：新五场景转绿，增加 init/update/sync 相对参考文件集成；相关 36/36 通过，TypeScript 检查退出 0。quick 无失败，既有 GitHub 六格 proxy/manual 条件仍明示。skill-creator 校验通过，PyYAML 只装在 uv 临时工具环境，未加入项目依赖。
- 待完成：最终全量、独立审阅、提交状态与随后 spexcode 调研；本节不是未运行检查的通过声明。

- 首次全量 317 过 / 8 失败：失败来自旧文档测试要求“最多一次”或要求正式协议在主入口，以及交接路径/发布说明的约定。已将正式协议断言改为沿明确引用读取，移除已替代的次数/行数断言，保留真实协议与镜像检查；迁移的独立提交与原子停用要求保留，仅去掉 dirty=功能失败误述。
- 导航核对：gate index 按设计保留原 current，本轮显式切换 v10 / overview-v6。同时发现无 current 时按字典排序选 v9 而不是 v10；新增 REQ-004/AC-1 公共回归先红（v9 != v10），改为按数字排序并继续保留显式 current，避免自动激活新草稿。
- 当前完整验证：326 过 / 0 失败，含 TypeScript；tree=d2b02f9b211b31834f946268abf849fd39260227。完整 check 唯一失败为 G-merge 当前未提交代码，G-done 明示实际 CI manual 条件，X-evidence 通过；既有 APR-002/003 漂移提醒仍保留。APR-010 只绑定用户实施范围；v10/v6 未标已验收。待独立审阅与本地提交后复用本证据。
- 独立审阅（chg019_review，新上下文、只读）发现一个 P2：新 approve 完整对账仍依赖只比较 passed/failed 的 evidenceGaps，skipped=99 与 JUnit=0 不一致也可被冻结。公共 approve 回归先红，现补齐三项计数；主入口补充普通审阅不能满足既有全 summary 的正式循环条件，未改该门禁。修复后需重新验证当前树，旧 326/0 不作为新树通过声明。
- 修复验证：skipped 错配公共回归先红后绿，相关 APR/JUnit 12/12 通过。随后 327 项功能测试通过但 TypeScript 指出新增测试未收窄 nullable ev；改为显式缺失判断后，最终 verify 退出 0，327 过 / 0 失败 / 0 跳过，含 TypeScript，tree=d979f351c07dd1040f5c7ecb65974c20deef974e，evidenceGaps=[]。
- 独立前向试跑（chg019_forward_trial）：在 /tmp/keel-chg019-forward.Ball3Y 的隔离 0.13.0 工作快照中，给出虚构 CSV 原值登记/查询任务并声明单位、复权未知；未提供预期答案。agent 仅用 k-impl/k-evidence，未暂停或询问、未读父任务结论，交付 raw-query.mjs 与 5 项 CLI 回归，verify/check 均退出 0；正式验收/合并条件明确跳过，未造 APR/提交/验收。
- 主 agent 复核：实际执行 `node raw-query.mjs query 000001 2026-01-02` 退出 0，返回字符串 symbol=000001、price=12.340、volume=001200，price_adjustment / volume_unit 均为 null。原始 CSV SHA-256 仍为 7dda095053d0f59c368494eea26b0fc4a6183c3beb8fcb91deeee7c4d835a0f0；试跑证据树 6fa5af64b63e3d523e400e5b74839af080658793。该试跑使用最终 skipped 补漏前的安装快照，仅支持这次授权/未知语义场景，不是 Astra 长期成功率实验。
- 消费兼容只读核对：以新 featureCoverageLines 读取 taotie 当前记录，F13 / REQ-033 正确报告自动行为映射 5、人工/真实环境 1（AC-1），未更新其框架或业务工作区。npm pack --dry-run 确认 0.13.0 包含正式评审参考、checklist 与版本说明。
- 窄复核（chg019_fix_review，新的只读上下文）无 actionable findings：确认 skipped 错配公共回归真实、正常快照和 dirty 复用路径未退化，G-done 模式补充准确。当前全部优化与范围内修复完成；本地提交后只需完整 check 复用同树证据，再开始 spexcode 调研。
