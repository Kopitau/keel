---
id: RES-901
title: 跨平台支持与 gate 运行时选型（Python vs Node+TS）
date: 2026-08-21
level: standard
features: [F17, F24]
decisions: [DEC-143, DEC-144, DEC-145, DEC-146, DEC-147, DEC-148, DEC-149]
---

# RES-901 跨平台支持与 gate 运行时选型

## 调研问题

1. gate 用 Python 还是 Node+TS，在**运行 bug 与流畅程度**上有没有实质区别？
2. 若改用 TS，如何避免构建步骤或 tsx 带来的启动延迟？
3. 支持 macOS/Linux 需要处理哪些跨平台差异？

## 检索范围与方法

- **本机实测**（Windows 10，Python 3.12.10 / Node v22.19.0）：PowerShell `Measure-Command` 各 12–15 次，取平均与最快值；
- 本机已安装包清单核对（npm 全局包、各 harness 安装形态）；
- 前序调研 R2（六平台能力矩阵）、R5（强制层）的结论复用。

## 证据

### 1. 启动开销实测（Windows，15 次）

| 命令 | 平均 | 最快 |
|---|---|---|
| `python -X utf8 -c pass` | 224 ms | 142 ms |
| `node -e ""` | 191 ms | 140 ms |
| `gate.py status`（W1 桩） | 229 ms | 182 ms |
| **`git status`（对照）** | **368 ms** | 235 ms |

**读法**：最快值 142 vs 140 ms——解释器启动差异≈0；平均值的差主要是 Windows 进程创建与杀软扫描噪声。**一次 `git status` 的开销就大于语言选择的差异一个数量级**，故语言对"流畅度"的影响可忽略。

`gate.py status` 比空跑 Python 仅多约 5 ms → 零依赖标准库路线本身没有额外开销（此结论对 Node 内置模块同样成立）。

### 2. Node 原生 TypeScript 支持实测

Node v22.19.0 直接执行 `.ts` 文件成功（原生类型剥离，无 tsconfig、无构建、无依赖）：

```
node probe.ts  →  {"verdict":"pass","node":"v22.19.0"}
```

| 命令 | 平均 | 最快 |
|---|---|---|
| `node -e`（JS） | 245 ms | 148 ms |
| `node probe.ts`（TS 剥离） | 231 ms | 182 ms |

类型剥离的净开销约 30 ms（最快值差），在噪声范围内。**这排除了改用 TS 的最大顾虑**：不必编译，也不必用 tsx（tsx 通常 300–500 ms 启动，会让钩子场景的延迟翻倍）。

### 3. 目标 harness 的运行时分布

| harness | 分发形态 | 必然带 Node？ |
|---|---|---|
| Claude Code | npm `@anthropic-ai/claude-code` | 是 |
| Codex | npm `@openai/codex` | 是 |
| OpenCode | npm `opencode-ai` | 是 |
| DeepSeek Harness | npm `@deepseek-ai/dsh` | 是 |
| Pi | npm | 是 |
| Grok Build | 独立二进制（curl 安装） | 否 |

**六家中五家经 npm 分发** → 能跑 keel 目标平台的机器**必然有 Node**；Python 3.11+ 则不保证（macOS 自带的是 python3 但版本随系统、Windows 需另装）。这是跨 harness 框架选 Node 的最强论据。

### 4. bug 面对比（定性）

| | Python 特有风险 | Node/TS 特有风险 |
|---|---|---|
| 编码 | Windows GBK 控制台 → UnicodeEncodeError（需 `-X utf8`） | 默认 UTF-8，无此问题 |
| 运行时定位 | `python` / `python3` / Store 别名桩 / venv 混淆 | `node` 单一，较少歧义 |
| 类型 | 无编译期检查，代码量增长后 `None` 类错误易漏 | 有类型检查（原生剥离**不做**类型校验，需另跑 `tsc --noEmit`） |
| 构建 | 无 | 若不用原生剥离则需构建；用 tsx 则启动变慢 |

**共同风险（与语言无关，且是本工具的主要 bug 来源）**：Windows 路径处理、子进程引号转义、文件编码、并发写入、CRLF/LF 差异。

### 5. 跨平台差异清单（macOS/Linux 纳入后）

- **换行符**：CRLF/LF 会使同一文件在不同平台哈希不同 → 击穿审批哈希（DEC-106）与证据哈希（DEC-033）。对策见 DEC-144。
- **大小写**：macOS/Windows 文件系统大小写不敏感、Linux 敏感 → 同名不同大小写文件跨平台行为不一致。对策见 DEC-145。
- **解释器名**：macOS 通常只有 `python3`；Node 无此问题（统一 `node`）。
- **符号链接**：macOS/Linux 原生支持，Git for Windows 处理有坑 → 镜像统一用复制（DEC-147）。
- **平台可用性利好**：macOS 上 OpenCode 原生可用（Windows 官方推荐 WSL）、DeepSeek Harness 完整可用（Windows 不支持其 Python SDK/PTY）。

## 结论（决定／理由／备选）

- **决定**：gate 运行时改为 **Node + TypeScript**，直接运行 `.ts`（原生类型剥离），保持零运行时依赖（仅 Node 内置模块）；正式支持 Windows / macOS / Linux 三平台。
- **理由**：性能上两者无实质差异（被 git 调用开销淹没）；决定性因素是**目标机器必然有 Node 而不必然有 Python**；Node 原生类型剥离消除了 TS 的构建与启动代价。
- **备选**：维持 Python stdlib（团队语言匹配度更高，但目标机器运行时不保证）——已由用户在了解权衡后否决（DEC-149）。

### 6. node:test 能力核实（2026-08-21 本机实测）

- `node --test probe.test.ts` **直接运行 .ts 测试通过**（`# pass 1`），无需构建、无需依赖；
- `node --test --test-reporter=junit` **输出标准 JUnit XML**（`<testsuites>`）——正是证据协议（DEC-033/C-33）所需格式，无需适配层。

→ gate 自身测试选用内置 `node:test`（DEC-152）。

## 剩余不确定性

- 实测仅在 **Windows 一台机器**上完成；macOS/Linux 的相对开销未测（预期两者都更快，因无 Windows 进程创建与杀软成本）——**[未核实]**，W5 跨平台实测时补。
- Node 原生类型剥离**不做类型校验**，仅剥离；已决定 `tsc --noEmit` 纳入门禁并定义「零依赖=运行时零依赖」（DEC-154）。
- ~~Node 版本基线精确下限~~ **已核实（2026-08-21）**：Node **22.18.0**（2025-07-31 发布）起类型剥离免标记，commit `8d1f5df313` "module: unflag --experimental-strip-types"；官方仍标注 experimental，可用 `--no-experimental-strip-types` 关闭。来源：https://nodejs.org/en/blog/release/v22.18.0 （accessed 2026-08-21）。→ 基线定为 ≥22.18.0（DEC-150）。
- `gate.py status` 与未来 TS 版 gate 的实测对比待 W2 完成后补。
