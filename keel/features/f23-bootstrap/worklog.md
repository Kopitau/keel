# worklog — F23 f23-bootstrap

## 2026-09-06（CHG-018 / 框架指令安全更新）

- 已授权：用户允许 agent 修改 keel 相关部分、保留项目本身内容；只做更新器与指令迁移，不替 taotie 开发业务或提交已有改动。v9 / overview-v5 是 working，直接纳入这次反馈；旧确认版本不动。
- 诊断：--yes 生效但仍显示确认问题；旧 AGENTS.md 无标记被跳过，工具版本却显示 applied。taotie 的现有 AGENTS.md 全文是旧框架指令，未含项目业务条款。
- 红绿：补上公共 CLI 回归，修前 8 过 / 5 失败（/private/tmp/keel-update-red.log）；修后更新与相关集成组 28 过 / 0 失败，tsc 退出 0。覆盖缺失/歧义边界保持原文、部分完成退出 2、项目前后文 CRLF/中文/空格字节保留、字面量替换、agent 补边界后完成、重复更新无写入及源错误零写入。
- C-34: ref=CHG-018 将旧无标记提示断言改为 PENDING，--yes 不再应出现交互问题；保留原有功能断言。新 AC-13 覆盖部分完成；agent-prepared 测试只证明接口和字节保护，不冒称模型语义判断已自动测试。
- 按 skill-creator 精简现有 k-impl 的升级指导，不加技能、依赖或模型调用。后续记录完整验证、taotie 文件保护与交付结果。
- 定向复核：更新/发现/镜像/发布组通过，tsc 退出 0；官方技能校验缺 PyYAML，未增装依赖，已有元数据与镜像检查通过。补充代码围栏示例边界回归，修前 11 过 / 2 失败，修后通过，避免把项目文档里的示例当成受管内容。
- taotie 实际迁移：先读完整 AGENTS.md，确认全文是旧框架指令后替换为当前受管段；`keel update --yes` 实际退出 0、applied 0.12.1、pending=none。重复执行退出 0、NO FILE CHANGES / already up to date；quick 检查无失败或提醒。
- 项目保护：迁移前快照 200 个文件，只有 AGENTS.md、两份 k-impl、keel/config.json 和 installed.json 共 5 项框架内容变化，其余 195 个文件哈希不变；真实暂存区哈希前后相同。未修改 taotie 业务需求、设计、代码、测试配置，也未提交其原有未提交改动。

## 2026-08-21

- 进度：W1 开工。切片：把 features/decisions/research/DESIGN 迁入 keel 记录并保留编号映射
- 内部分解：先落骨架与记录，再在后续波次补脚本/技能。
- 实现决定：自举用 `tools/bootstrap/w1_bootstrap.py` 从 `docs/` 生成 DEC/REQ/RES，不手写 142 份决策（C-25 机械环节走脚本）。
- 问题链接：无
- 验证：`python -m pytest -q` → 10 passed（2026-08-21）。id-map：23 F、142 C、8 RES。
- 实现决定：本地 git 身份 `keel-agent <agent@keel.local>`，仅非 APR 提交；APR-001 保持 draft（C-107）。
- git：`init` + `core.hooksPath=.githooks` + `autocrlf=false`。首提交 `0bb57ad`（W1 树）。本环境 `git` 写 stdout 会 `Bad file descriptor`，提交仍成功（见 `.git/refs/heads/master`）。

## 2026-08-21（W1 重做）

- 进度：用户要求回滚不完整规划下的代码。Python 自举脚本归档到 `tools/archive/w1-python-bootstrap.py`，已迁入的 DEC/REQ/RES **不删**（不重写历史）。
- 实现决定：记录层保留；只替换运行时与测试。

## 2026-08-21（W5）

- 进度：框架级验收冒烟 `tests/w5-smoke.test.ts`：临时样例走实现（v1 问候）/红灯修 bug/CHG+需求 v2（空名抛错）/handoff 接力。样例内核 `samples/greet/greet.js` 为 v2。

## 2026-08-25（ISS-022）

- 进度：全局安装器改为纯 JS（`tools/cli/*.js`），`bin/keel.js` 不再 import `.ts`、去掉 `isMain` 静默跳过。载荷 `tools/gate/*.ts` 仍复制进项目后执行。`npm pack` e2e 护栏。
- 实现决定：手写 JS 安装器，不加构建步骤（DEC-154）。
- 问题链接：ISS-022

## 2026-08-24（CHG-007）

- 进度：全局安装器 `bin/keel.js` + `keel init/update/uninstall/doctor`。init 写干净 config（`profiles.active=unset`、`keel_version`）、自动 `writeTestBaseline`、hooks 可执行位。private 仍保留，分发用 git URL / `npm i -g file:<path>`（DEC-157）。
- 实现决定：其余命令转发到项目内 `tools/gate/gate.ts`，不改 `repoRootFromGateFile`。
- 问题链接：CHG-007 DEC-157 REQ-025

## 2026-08-24（P2）

- 进度：ISS-014 补记 W1 回滚；LES-001。C-139 v1 见 DEC-156。

## 2026-08-28（CHG-010 / P3）

- 红灯：先新增 `tests/chg010-update.test.ts`，运行 `node --test tests/chg010-update.test.ts tests/chg010-legacy-res.test.ts`；旧 updater 直接写入，预览回调 0 次，N/EOF 仍显示 applied，非法源版本也未拒绝，测试 1 过 6 失败；这份输出证明测试先于实现生效。
- 进度：`keel update` 改为写前快照规划器，完整列出文件/目录 `ADD`、`OVERWRITE`、`DELETE` 与 legacy entry 变化，然后询问 `y/N`。只接受单字母 `y`/`Y`；N、`yes`、空输入、EOF、无确认器和真实非交互 stdin 都取消。
- 零写入证据：取消测试比较整个 fixture 树的路径、字节哈希、mode、mtime（包括 `.git/index`），并断言没有 `keel/migrations/`；不再调用 `git add -A`，非 `k-` 个人技能和用户文件不进入管理范围。
- 迁移：严格校验写入前与目标语义版本；仅 `<0.8.0→>=0.8.0` 在确认后生成 `<records_dir>/migrations/res-citation-legacy.json`，旧 RES 不改写。清单使用 ID、仓库相对路径和 DEC-144 规范化全文 SHA-256，重复 ID/路径在确认前拒绝。
- 自举实跑：先以 N 预览本仓升级，计划只有 `keel/config.json`、`keel/migrations/` 和 RES-001..008 八项；随后同一命令注入明确 `y`，输出 `keel update applied 0.8.0`。`keel/handoff.md` 不在计划内且未被 updater 触碰。
- 发布：`package.json`/lock 与项目 config 升到 0.8.0；`RELEASE-0.8.0.md` 列出目录、字段、G-research 和 updater 的破坏点。没有发布到公共 npm，也没有触发 GitHub CI。
- 绿灯：`node --test tests/chg007-installer.test.ts tests/chg010-update.test.ts tests/chg010-legacy-res.test.ts` → 28/28；`npx tsc --noEmit` → exit 0。
- C-34: ref=DEC-173 新增 update 预览、明确 y、N/EOF/非交互零写入黑盒；ref=DEC-181 新增 legacy manifest PASS/WARN/FAIL 与规范化哈希矩阵。只增加测试，没有删除或 skip。
- 全量兼容修正：旧 R6 fixtures 明确写 `keel_version: 0.8.0`，bootstrap wrapper 在 source 有效后仍须有 exact manifest 才能 WARN；没有删除原守卫。另补损坏安装源拒绝测试，防止缺 `tools/gate` 时把目标管理目录误判为 DELETE；SemVer 按正式 precedence 判定，`0.8.0-rc.1 < 0.8.0`。最新 P3 组合为 31/31（前述 28/28 是补这三条守卫前的中间绿灯）。

## 2026-08-28（P4 提交环境复核）

- 摩擦：预提交期间另一个用户任务并行扫描 D 盘，而本机 Node/npm 也安装在 D 盘；同一 `npm pack → prefix install → keel init` 黑盒由先前 34 秒通过变为 pack 120/300 秒超时，并留下已精确终止的测试孤儿进程。定位到外部磁盘争用后，不放宽测试、不改产品；把同版本 Node 22.19/npm 10.9.3 复制到 C 盘一次性运行时后，原始 120 秒/步断言完整通过（191 秒总计）。这是本机执行环境隔离，不是 keel 行为修复，不建 ISS。

## 2026-08-28（P6 本地消费项目）

- 进度：从 commit `eb4e232` 真正执行 npm pack→隔离 prefix install→`keel init`→交互式 `keel update`，消费项目由 0.7.0 升 0.8.0；预览后输入单字母 y，legacy RES 前后规范化 hash 一致，doctor ok，quick fail=0。详见 `consumer-update-p6.md`。
- 边界：未发布公共 npm、未触发 GitHub Actions；真实六格仍为 proxy。

## 2026-08-29（CHG-011 Q6 发布与消费项目）

- 进度：版本 0.8.0 → 0.9.0（package.json / package-lock.json）；`RELEASE-0.9.0.md` 列出 CHG-011 破坏点与消费项目要做的事（C-140）；黑盒 `tests/chg011-release.test.ts` REQ-023/AC-6。`tools/cli/update.js` 去掉 legacy 清单预览/写入，`migration.js` 只剩 semver。
- zhaoxi：`printf 'y\n' | node /e/program/en/bin/keel.js update` 打出完整预览（tools/gate 24 项 OVERWRITE/ADD/DELETE 等）后按 DEC-173 取消——确认只认 TTY 上的单字母 y，管道不算（`tools/cli/main.js` confirmUpdate）。这是设计行为，不绕：升级留给用户在交互终端跑 `node /e/program/en/bin/keel.js update`。zhaoxi 当前 quick 仍是旧 22 条门禁全绿，`keel_version` 0.7.0。

## 2026-08-29（zhaoxi 升级 0.7.0 → 0.9.0，记录在案的委托）

- 用户「升级由你去跑」：按 DEC-173 的确认由用户在对话里给出，agent 经 `runCli(["update"], { confirmUpdate: () => "y" })` 执行，预览 107 项（tools/gate / .githooks / 模板 / k-* 技能与镜像），`keel_version` 0.9.0；按 RELEASE-0.9.0 删 `keel/test-baseline.json`（无 migrations / state.json）。zhaoxi 自己的 `gate check --quick`：PASS fail=0 warn=0 checks=4。以 keel-agent 身份提交（另一会话的 worktree claim 未动）。

## 2026-08-29（版本号约定 + `keel --version`）

- 用户原话：「以后版本先0.9.1这样 因为都还不算正式版本」——在正式版之前只走 0.9.x 补丁号递增（下一个 0.9.1），不升次版本；正式版本另议。worklog 级约定，不出 DEC。
- 进度：`keel --version` / `-v` / `version` 打印安装器 package.json 版本（全局 CLI 是软链 → 与仓库一致）；黑盒 `tests/chg011-release.test.ts`。

## 2026-09-01（CHG-014 S2：REQ-025/AC-10 安装器版本提示）

- 进度：`gate status` 第五行 `keel: <项目 keel_version> (installer <版本>)`，安装器较新时追加 `— run keel update`。安装器位置：`KEEL_INSTALLER_ROOT`（`none` 跳过）或 `npm root -g` 下的 `keel/package.json`（4 s 超时，失败只打印项目版本）。zhaoxi 在 0.9.0 上给上游当天已删除的机制加固两天，这行字就是为它加的。
- 证据：`tests/chg014-status.test.ts` `REQ-025/AC-10 …`（较新 / 相等 / 更旧 / 找不到四种）；本仓打印 `keel: 0.9.1 (installer 0.9.1)`。

## 2026-09-01（CHG-014 S8：0.9.2 发布收口）

- 进度：`package.json` / `keel/config.json` 0.9.1 → 0.9.2；`RELEASE-0.9.2.md`（破坏点：门禁对漂移与无 APR 基线变红、树哈希排除 approvals / review/raw、ingest 形状校验与复发熔断、白名单形状、尾注成段、harness 探测；消费项目要做的事 5 条）；OVERVIEW 在途节改写为 v6 / APR-006 待点头与 CHG-014 八切片已落地；handoff 6 行。
- 证据（提交前脏树）：`npx tsc --noEmit` exit 0；`node --test` **263 / 263 / 0 fail**；`gate verify` PASS（tree `7588ebc3…`，passed=263）；`gate check` 8 条中 G-done / G-merge / X-evidence 仅因工作树脏（S8 文件未提交）FAIL，X-apr WARN（已 waiver），其余 PASS；`gate status` 打印 `keel: 0.9.2 (installer 0.9.2)`。提交后在干净树重跑 verify + check 的结果记在下一行。

## 2026-09-01（ISS-069：`keel update --yes`；0.9.3）

- 试点清理时 `echo y | keel update` 在两个仓库都被当成取消：`confirmUpdate` 只认 TTY。加 `--yes`（预览照常、结果行标 `(--yes)`），非 TTY 又无 `--yes` 的取消提示点名该开关；管道里的 y 仍不算（REQ-025/AC-7 防误触不变）。
- 探针（DEC-182）：修复前树 8878174e8b47… 上注入非 TTY 确认、无开关 → cancelled、退出 0；修复后同一探针加 `--yes` 应用、退出 1。
- 证据：`tests/chg010-update.test.ts` ISS-069 ×2；真实使用：zhaoxi / fmea-v3 用 `keel update --yes` 升到 0.9.3。
- 版本 0.9.3：`package.json`、`keel/config.json`、`RELEASE-0.9.3.md`。

## 2026-09-02（0.10.0：checklist.md 进管理清单）

- `keel/review/checklist.md` 加入 `keel init`（layout INIT_COPY）与 `keel update`（MANAGED_FILES）；版本 0.10.0，`RELEASE-0.10.0.md`。两个试点与 zhaoxi F6 工作树用 `keel update --yes` 升级。

## 2026-09-04（0.11.0：更新器管 AGENTS.md 段落与本地补丁）

- `update.js`：AGENTS.md 只替换 `<!-- keel:begin/end -->` 之间；写 `keel/installed.json`；覆盖前标 LOCAL PATCH；`init.js` 去掉平台备注、人类身份为空时提示；keel 自身 AGENTS.md 加标记；tsconfig 开 `exactOptionalPropertyTypes`。版本 0.11.0，`RELEASE-0.11.0.md`。证据：REQ-025/AC-11、AC-12。
