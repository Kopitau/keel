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
