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
