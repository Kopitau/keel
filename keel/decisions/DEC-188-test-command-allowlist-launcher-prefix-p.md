---
id: DEC-188
title: 测试命令白名单改为"启动器前缀 + 测试程序 + 允许的参数类"，仍禁 -k 与路径参数
status: confirmed
date: 2026-09-01
features: [F21, F6]
research: []
research_exemption: "对 ISS-018 白名单形态的放宽；候选来自两个试点项目实际使用的命令（node --test / uv run python -m pytest -q -m unit / npx vitest run），无外部选型。"
adr: false
source_id: "REQ-021"
change: CHG-014
---

# DEC-188 测试命令白名单改为启动器前缀 + 测试程序 + 允许的参数类

## 问题

`testcmd.ts` 是三条逐字相等的字符串（`python -m pytest -q` / `npx vitest run` / `node --test`）。zhaoxi 因 Windows 上 `npx` 起不来把整个测试栈换成 `node --test`（CHG-001，等了 15 小时）；fmea-v3 为了 `uv run python -m pytest -q -m unit` 本地改了 keel 的 `testcmd.ts` / `verify.ts`。白名单的初衷（ISS-018：不能只跑一部分）与"逐字相等"不是一回事。

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A 每个画像允许：启动器前缀（`python -m` / `python3 -m` / `uv run python -m` / `uv run` / `poetry run` / `npx` / `pnpm exec` / `pnpm` / `yarn` / `node`）+ 测试程序（pytest / vitest run / jest / node --test）+ 允许的参数类（`-q`、`-v`、`-x`、`-m <marker>`、`--tb=`、`--maxfail=`、`--reporter`、`--junitxml=`、`--outputFile`）；拒绝 `-k`、`-t`、`--test-name-pattern`、`--testPathPattern`、路径参数（含 `/`、`\`、`::`、`.py`、`.ts`）；`verify` 自动补 junit 输出参数** | 两个试点的命令都能过；ISS-018 的"不得缩小范围"保留 | 允许 `-m <marker>`意味着项目可以把 unit 门设窄——这是项目声明的门，由评审看 |
| B 白名单不动，config 里显式声明"本项目认可的测试命令"并由 APR 绑定 | 更严格 | 多一次审批；Windows 上 `npx` 起不来的问题没解决 |

## 推荐理由

选 A。用户对"仍禁 `-k` 和路径参数"表示同意。

## 用户决定原话

2026-09-01：「1 可以 2 行 3 也要提交，不然有断点 4 你帮我跑一次 5 A 同意」（第 5 项后半 = 同意第 7 条限制）。

## 影响

- `testcmd.ts` 重写 `isAllowedTestCommand` / `isAllowedTestArgv`；`verify.ts` 对 pytest 自动补 `--junitxml=keel/evidence/junit.xml`、对 vitest 补 `--reporter=default --reporter=junit --outputFile=keel/evidence/junit.xml`。
- REQ-021 增 AC-6（需求 v6 / CHG-014）；`keel/templates/config.json` 的画像示例更新。
- 消费项目：fmea-v3 可撤掉本地补丁；zhaoxi 的 `node --test` 不受影响。

## 后果与复审条款

（adr: false）复审触发：某项目用允许的参数把套件缩到只剩一个 marker 且方案级评审没看出来，则把 `-m` 改为需在计划测试义务里声明。
