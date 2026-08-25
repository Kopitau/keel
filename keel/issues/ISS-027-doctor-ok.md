---
id: ISS-027
status: open
defense_kind: "回归测试"
defense_pointer: ""
feature: f16-platforms
fingerprint: "doctor-false-ok"
date: 2026-08-25
source: 第四轮独立复审（C-42）
severity: 重要
requirements: [REQ-025]
---

# ISS-027 doctor 对已卸载/半装的项目报 ok

## 现象

`doctor` 的存在意义是排查「装了但不工作」。但它只检查：Node 版本、`keel/config.json` 是否存在且可解析、config 是否带 keel 自身状态、可执行位。

**它不检查最该检查的东西**：`tools/gate/gate.ts` 在不在、`.githooks/` 在不在、`core.hooksPath` 有没有设、技能镜像在不在、`test-baseline.json` 在不在。

实测：对一个刚跑完 `keel uninstall` 的项目（gate 已删、hooks 已删、records 保留），`doctor` 报 **`keel doctor: ok`，exit 0**。

复现命令：

```bash
cd <一个已装 keel 的项目>
node <keel>/bin/keel.js uninstall     # 机器件被移除，keel/ 记录保留
node <keel>/bin/keel.js doctor        # 输出 "keel doctor: ok"，exit 0
ls tools/gate/gate.ts                 # 不存在
```

## 根因

`runDoctor` 用 `keel/config.json` 是否存在来判断「已安装」，而 config 位于被刻意保留的 `keel/` 记录目录下（ISS-004 之后的正确设计）。判据选错了对象：应当检查机器件，而不是记录。附带：`execModeGaps` 在文件根本不存在时返回空数组，属同族的 fail-open。

## 修复

doctor 增加机器件完整性检查：`tools/gate/gate.ts`、`.githooks/{pre-commit,pre-push,prepare-commit-msg}`、`core.hooksPath` 指向、`.claude/skills` 镜像、`keel/test-baseline.json`。缺任一项即报告具体缺失并 exit 非零。`execModeGaps` 在目标文件缺失时应报「缺失」而非「无问题」。

## 为何未被更早发现

doctor 的测试只覆盖了它已实现的三类判据；没有一条测试问「一个坏掉的安装，doctor 会不会说 ok」。

## 闭环选择与理由

**回归测试（负面用例）**：对一个删掉 `tools/gate/` 的项目跑 doctor → 必须 FAIL 并指出缺失项；对删掉 hooks 的项目同理。
