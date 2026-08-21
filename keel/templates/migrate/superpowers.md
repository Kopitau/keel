# Superpowers → keel 映射表（F22 初稿）

> 状态：W1 初稿。v1 支持 Superpowers（C-130）。源只读；产物=未确认初稿。

## 源树（obra/superpowers 6.x 常见落点）

`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`、`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`、brainstorm 过程（常只在会话里）、可选 `.superpowers/sdd/<plan>/progress.md`（默认 gitignore，完工即删）。

## 映射

| 源 | keel 目标 | 规则 |
|---|---|---|
| `docs/superpowers/specs/*-design.md` | 需求素材 + DEC 初稿 + 可选 RES | spec 里的目标/非目标 → REQ 素材；拍板项 → DEC（无理由标「暂定·需补理由」）；对比过的方案若有引用可补 RES |
| `docs/superpowers/plans/*.md` | `keel/features/<slug>/plan/vN.md` 与/或 `summary.md` 初稿 | 已勾完的计划 → 总结初稿；未勾完 → 规划初稿。Files/Interfaces/Run-Expected 写入触碰文件与测试义务 |
| brainstorm 产物（设计文档或会话纪要） | 需求素材 | 未成文的会话内容**不编造**；只迁落盘文件 |
| SDD `progress.md` / review-package（若还在） | worklog 线索 + 评审缺口清单 | ledger 不是验收证据；keel 完成仍要 F6 证据 |
| 根 `CLAUDE.md` / `AGENTS.md` 里 Superpowers 注入（含 1% 规则） | 双框架互斥 + 规则候选 | 有价值规则合并进 keel AGENTS.md（守预算）；1% 强制触发与 keel「技能按需、记录不注入」冲突，列入用户裁决 |
| `hooks/hooks.json` SessionStart 注入 using-superpowers | 停用清单 | 确认后移除，避免双框架同时塑造行为 |

## 不映射

| 源 | 原因 |
|---|---|
| `skills/using-superpowers` 及 14 个技能正文 | 换框架，不把 Superpowers 技能复制进 keel |
| gitignored SDD 工作区（已 rm -rf） | 源已不在；不在报告里假装迁到了 |
| 碎提交本身 | 过程在 git history；keel worklog 不重放每条 commit |

## 冲突预置（须用户裁决）

- Superpowers「一次一问」 ↔ keel 默认按轮批量（可切换一次一问，C-02）。
- Superpowers 无调研技能 ↔ keel F2 强制调研。
- Superpowers 计划即交接、无 ADR/问题日志 ↔ keel 要 DEC/ISS/总结。
- Superpowers Iron Law 全软门 ↔ keel L3 硬门。
- 1% 规则强制灌技能 ↔ keel 常驻只名录（C-26/C-121）。
