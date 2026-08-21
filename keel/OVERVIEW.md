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
| F17 | W1–W6 已实现（本地档） | `features/f17-gate/summary.md` |
| F1–F16, F18–F23 | 规范已确认；记录已迁入 | 尚未有 `summary.md` |
| F24 | 规范已确认（CHG-001）；哈希/启动器/CI 矩阵 | 尚未有 `summary.md` |

## 在途功能

W6 刚落地：F17 试点全流程（C-105 反绕过 + 年检）；常驻装载实测 6427/10240，初值全部 KEEP。§8 建议波次结束。

未做：远端、人类 APR、dsh/pi live、消费项目接入。

## 风险与暂定

- 暂定决策计数：0
- 人类身份未配 → APR 停在 draft
- 远端未配
- DEC-148 夹具已入仓；macOS/Linux digest 由 CI 矩阵对账
- §8/9 未进 C 记录

## 主要外部依赖

gate **运行时**零第三方依赖（DEC-154）。开发/CI 唯一白名单 devDependency：typescript（OSS-002）。pytest 曾用于第一次 W1，已退役（OSS-001）。映射表引用 Trellis（AGPL-3.0-only，不复制代码）与 Superpowers（MIT，不复制技能正文）。
