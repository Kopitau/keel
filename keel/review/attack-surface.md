# 攻击面清单（门禁 / 证据 / 审批）

DEC-160：只用于执法机制。每条须在临时副本里实际尝试，并留下复现命令。新发现追加到文末。

## 已知攻击（已有 ISS 闭环的也保留，防同类）

- 改 `test_command` 为无关命令（ISS-001）
- 把测试范围缩到单个必过文件（ISS-018）
- 删除证据使检查 SKIP（ISS-002）
- 追溯不到验收标准仍全绿（ISS-003 / ISS-020）
- hooks 无可执行位被静默跳过（ISS-004）
- `gate-warn:` 口令消警告（ISS-005）
- verify 与 check 自相矛盾（ISS-019）
- 删除或 skip 测试使核心机制失守（ISS-021）
- `--no-verify` / 改 hooksPath / 改 CI / 挪走 tests/（C-105）

## 门禁依赖的输入（改这些即改裁决依据，一律攻击面）

- `keel/evidence/`、`keel/config.json`、`keel/test-baseline.json`、`package.json`
- `keel/review/`（清单与回路状态本身）
- `.agents/skills/`、`.claude/skills/`

## 每轮必做

- 改配置、伪造证据、缩范围、删测试、消警告、绕 hooks：在副本里跑一遍，记录命令与退出码
