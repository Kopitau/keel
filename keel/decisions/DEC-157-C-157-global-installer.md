---
id: DEC-157
title: 全局安装器 + 项目内运行（Trellis 式「在项目文件夹激活」）
status: confirmed
date: 2026-08-24
features: [F16, F23]
research: [RES-902]
adr: true
source_id: C-157
change: CHG-007
requirements: [REQ-025]
---

# DEC-157 全局安装器 + 项目内运行

## 问题

用户要求「类似 Trellis，在项目文件夹激活，就相当于在这个文件夹部署了这个框架」。现状是手工复制 8 个路径 + 改配置 + 手写测试基线（复审者实测走通但踩到三个坑）。需要定：命令入口形态、命令面、init 行为、分发渠道。

## 选项对比

见 RES-902。核心洞察：**Trellis 的 init 本质也是把文件复制进项目**，装完后项目里有自己的一套。因此**只有 init 类命令需要感知当前目录**，其余仍由项目内副本执行 —— 全局分发与 vendored 运行可以共存，现有 root 解析（`gate.ts:40` 用 `import.meta.url`）一行不用改。

实测证据（Windows / Node 22.19）：npm bin 指向 `.ts` 可行，`.cmd`/`.ps1` shim 正常生成，`process.cwd()` 与 `import.meta.url` 正确分离。

## 推荐理由

四点分别的理由见「影响」各条。关键取舍：**bin 必须是纯 JS 薄壳而非直接指向 .ts** —— 虽然两者都能跑，但旧版 Node 解析 `.ts` 时会抛 SyntaxError，破坏 DEC-150 要求的「明确报错、不静默降级」。Trellis 的 `bin/trellis.js` 正是三行薄壳，佐证此模式。

## 用户决定原话

- 决策 1（bin 形态）：「A」= 纯 JS 薄壳，先查 Node 版本再动态 import `.ts`
- 决策 2（命令面）：「同意就做这四个」= init / update / uninstall / doctor；CLI 自升级用 npm 原生，不自造 upgrade
- 决策 3（init 行为）：「测试画像 根据技术方案实施的代码决定选择什么」→ 画像移出 init 提问，init 减到 4 问，画像在 F4 统一实施规划时确认
- 决策 4（分发渠道）：「git URL 为正式方式，本地路径为过渡。不公开发布」
- 边界（用户 2026-08-24 确认「其他都可以」）：uninstall 永不删记录 / 版本不一致只告知不强制 / init 遇旧框架不阻止不迁移只提示 / 五条验收标准 / 五项非目标

## 影响

1. **bin 入口**：`package.json` 加 `"bin": {"keel": "./bin/keel.js"}`；`bin/keel.js` 为**纯 JavaScript**（不含 TS 语法），先做 Node ≥22.18.0 检查并给出人话错误，通过后 `import()` `.ts` 主体。保住 DEC-150 与 DEC-151。
2. **命令面**：`init` / `update` / `uninstall` / `doctor`，均作用于当前目录；其余命令仍由项目内 `tools/gate/` 执行。不做 `upgrade`（用 `npm i -g` 原生，避免自行处理 npm 权限/缓存/镜像源的边界情况）。
3. **init 行为**（详见 REQ-025 验收标准）：前置检查 → 复制 8 路径 → 4 问 → 写干净 config（不带 keel 自身状态）→ **自动生成测试基线**（补上 C-34 默认关闭的坑）→ 设 hooks 与可执行位 → 跑自检。`profiles.active` 写 `unset`，gate 须优雅降级。
4. **分发**：git URL 全局安装为正式方式；远端就绪前用 `npm i -g file:<路径>` 过渡；不公开发布。
5. **取代 DEC-153 的措辞**（走 CHG-007）：分发是全局的、运行是本地的；原决策的离线可用与版本锁定两条理由全部保留。

## 后果与复审条款（adr）

**后果**：keel 获得全局命令入口，团队成员需各自装一次；项目内副本与全局 CLI 版本可能不一致（由 `keel update` 的版本检查兜底）。

**复审触发条件**：① npm bin 对 `.ts` 的支持发生变化；② 出现外部用户需要公开发布；③ 团队反馈 git URL 安装在某平台不可用。
