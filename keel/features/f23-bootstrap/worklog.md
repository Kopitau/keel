# worklog — F23 f23-bootstrap

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
