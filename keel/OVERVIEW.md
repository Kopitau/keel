# keel — 项目总览

活文档，复盘时原地更新（C-54）。开场必读。

## 项目是什么

keel 是装进仓库的跨 Agent 开发流程层：带稳定编号的中文记录 + 英文技能 + 零运行时依赖的门禁 + 平台薄桥。不是 CLI 产品，不接管编排，不绑定厂商。

本仓库是框架自身（F23 自举）。消费项目稍后用 tag + 复制文件接入。

## 整体技术路线图

确认规范在 `DESIGN.md` §5（C-01~C-154，含 CHG-001）。实施按 `keel/plan/overview-v2.md`：W1 骨架（Node+TS）→ W2 gate → W3 证据/CI 三平台矩阵 → W4 技能 → W5 五平台实测 → W6 试点校准。

权威执法在 CI 复算；本仓目前是 **本地档**。OS 矩阵：Windows + macOS + Linux（DEC-143）。

## 能力清单

| 功能 | 状态 | 总结 |
|---|---|---|
| F1–F23 | 规范已确认；记录已迁入 | 尚未有 `summary.md` |
| F24 | 规范已确认（CHG-001）；W1 哈希/启动器 | 尚未有 `summary.md` |

## 在途功能

W1 重做（进行中）：Python gate 已回滚；Node+TS 桩、F24 规范化哈希、双启动器。

下一波 W2：F17 六门禁真身。

## 风险与暂定

- 暂定决策计数：0
- 人类身份未配 → APR 停在 draft
- 远端未配
- DEC-148 三平台一致性尚未在 macOS/Linux 实测（W3/W5）
- §8/9 未进 C 记录

## 主要外部依赖

gate **运行时**零第三方依赖（DEC-154）。开发/CI 唯一白名单 devDependency：typescript（OSS 待登记）。pytest 曾用于第一次 W1，已退役（OSS-001）。映射表引用 Trellis（AGPL-3.0-only，不复制代码）与 Superpowers（MIT，不复制技能正文）。
