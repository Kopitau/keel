# 功能总结 — F17 门禁强制层

W6 试点功能。本地档尚未合并到远端；本总结对照 REQ-017 写清已经落地的部分（C-52）。

## 做了什么 / 为什么

一份 Node+TS 的 `tools/gate` 给五处调用：命令行、pre-commit、pre-push、CI、（将来）平台钩子。W1 桩 → W2 六门禁 → W3 verify/CI → W6 补上 C-105 反绕过提醒和第一次年检。权威仍是 CI 复算，不是钩子（C-100）。

## 技术路线说明

- 运行时：Node ≥22.18.0 直接跑 `.ts`，仅内置模块（DEC-149~154）。实证 RES-901。
- 入口：`gate.ts` 分发；启动器 `gate.sh` / `gate.ps1` 拒低于基线的 Node。
- 哈希：`sha256Normalized`（DEC-144）；证据树哈希排除 `keel/evidence`。
- 反绕过：HEAD 无 `Feature:` 尾注（hooksPath 已指向 `.githooks` 时）提醒可能用了 `--no-verify`；CI workflow 缺 check/verify/三 OS 矩阵则提醒；有 `test` 脚本却没有 `tests/` 则提醒；强推在 pre-push 打印提醒但不拦截。
- 年检：`gate review` 打印检查项库存；叙事年检见 `gate-review-2026.md`。

## 关键决策与被否方案

- 提醒级不阻断（C-105 原文）。未改成 fail-closed 强推拦截。
- 无证据时 G-done skip 而不是 fail，避免一写 summary 就让日常 `gate check` 红灯。
- 不把 28 天 OSS 复查做成每次 check 拉 GitHub（离线友好，C-12）；check 只做到期日与 lock 版本。

## 测试与证据指针

- `tests/w2-gate.test.ts` 六门禁与 new/index/approve
- `tests/w3-verify.test.ts` 证据与树哈希
- `tests/w6-pilot.test.ts` C-105 / 装载预算 / OSS 对账 / 年检文件
- 命令：`npx tsc --noEmit`；`node --test`；`node tools/gate/gate.ts check`

## 遗留债务与已知限制

- 执法档仍是 **local**：无远端，无分支保护，CODEOWNERS 占位。
- APR-001 仍 draft，人类身份未配（C-107）。
- dsh / pi 未装；付费对话技能实点未做（W5 账本）。
- 平台 L1 钩子仍薄；Grok hooks fail-open，不能当权威。
