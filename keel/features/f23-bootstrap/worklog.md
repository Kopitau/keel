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

## 2026-08-24（CHG-007）

- 进度：全局安装器 `bin/keel.js` + `keel init/update/uninstall/doctor`。init 写干净 config（`profiles.active=unset`、`keel_version`）、自动 `writeTestBaseline`、hooks 可执行位。private 仍保留，分发用 git URL / `npm i -g file:<path>`（DEC-157）。
- 实现决定：其余命令转发到项目内 `tools/gate/gate.ts`，不改 `repoRootFromGateFile`。
- 问题链接：CHG-007 DEC-157 REQ-025

## 2026-08-24（P2）

- 进度：ISS-014 补记 W1 回滚；LES-001。C-139 v1 见 DEC-156。

