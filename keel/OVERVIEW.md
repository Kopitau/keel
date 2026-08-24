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

独立评审 P0–R3 已修。CHG-002～006 **approved**（kopit）。**CHG-007 全局安装器已实施**（`keel init` 等），变更单仍 proposed，requirements current 仍是 v2，待批准后切 v3。

远端、APR-001（仍 draft）、CODEOWNERS 真人仍开着（ISS-016）。

## 风险与暂定

- 暂定决策计数：0（DEC-155/156 已 confirmed）
- 人类身份已配 kopit <wwillmee@gmail.com>；APR-001 仍 draft（本次只批 CHG）
- 远端未配
- DEC-148 夹具已入仓；macOS/Linux digest 由 CI 矩阵对账
- §8/9 未进 C 记录

## 主要外部依赖

gate **运行时**零第三方依赖（DEC-154）。开发/CI 唯一白名单 devDependency：typescript（OSS-002）。pytest 曾用于第一次 W1，已退役（OSS-001）。映射表引用 Trellis（AGPL-3.0-only，不复制代码）与 Superpowers（MIT，不复制技能正文）。
