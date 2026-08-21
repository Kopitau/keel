# W6 初值校准（C-26 / C-118 / 附录 B）

- date: 2026-08-21
- 试点功能：F17（本仓自举，不是 samples/greet）
- 测量命令：`node tools/gate/gate.ts review --quick`
- 原则：改数字 = 改已确认初值，须 CHG + 用户点头（C-03/C-123）。本轮证据支持 **KEEP**，不改 config 数字。

## 测量

| 项 | 初值 | 本仓实测 | 结论 |
|---|---|---|---|
| 常驻装载（AGENTS + CLAUDE + 技能名录 description） | 10240 字节（10KB） | **6427**（agents 3176 + claude 11 + catalog 3240） | **KEEP** 余量约 37% |
| AGENTS.md 行 | 150 软 | 59 | **KEEP** |
| AGENTS.md 链 | 32768 硬（Codex） | 3176 字节 | **KEEP**（平台硬限，不是 keel 拍的） |
| 技能数 | 16 | 16 | **KEEP** 已顶格；新增须下沉或 DEC |
| 技能正文 | 500 行 | 远低于 | **KEEP** |
| 技能 description | 1024 字符 | 均远低于 | **KEEP** |
| OSS 复查 | 28 天 | OSS-002 next_review 2026-09-18，未到期 | **KEEP** |
| 知识库 | ~100 | `~/.keel/knowledge` 不存在或由机检 skip/计数 | **KEEP** 提醒级 |
| 规则区条数 | null | 本仓无独立规则目录（指令在 AGENTS + skills） | **KEEP null** 不编造封顶 |

## 为什么不调 10KB

实测 6.4KB。再涨一倍技能描述才接近初值。Trellis SessionStart ~29KB 截断教训（R3a）仍成立。收紧没有收益；放宽没有证据。

## 机检

`X-budget` 把常驻装载超 10KB 定为**软警告**（不是 Codex 32KiB 那种硬失败）。超限处理仍是下沉内容，提预算走 DEC（C-123）。
