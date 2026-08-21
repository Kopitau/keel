---
id: CHG-001
status: approved
date: 2026-08-21
requirements_from: v1.md
requirements_to: v2.md
---

# CHG-001 跨平台支持（macOS/Linux）与 gate 运行时改为 Node+TS

## 动机

用户于 2026-08-21 设计终审后追加两项要求：

1. **「同时这个项目也要兼容 mac」** —— 原设计只把 Windows 写进实测要求；追问中同时确认 Linux（CI 运行环境）一并纳入正式矩阵。
2. **「同时改为 node+ts」** —— gate 运行时由 Python 改为 Node + TypeScript。

提出时 W1 已完成（骨架、记录迁移、gate 桩、2 个提交），故按 F11 走变更单，不直接改已确认基线。

## 新增

- 功能 **F24 跨平台支持（Windows + macOS + Linux）**，见 `docs/features.md`。
- 决策 **DEC-143 ~ DEC-148**（F24 六点：支持矩阵／哈希一致性／路径与大小写／启动器与 hooks／镜像统一复制／跨平台一致性测试）。
- 决策 **DEC-149**（adr）gate 运行时改为 Node + TypeScript。

## 修改

| 原决策 | 变化 |
|---|---|
| DEC-101（gate 运行时=Python stdlib） | **superseded → DEC-149** |
| DEC-094（技能镜像 Windows 用复制） | 扩展为三平台一律复制（DEC-147） |
| DEC-096（平台档位） | 备注补充：macOS 上 OpenCode 原生可用、DeepSeek Harness 完整可用（Windows 需 WSL／受限），Mac 无需降级说明 |
| DEC-126（测试画像） | gate 自身测试画像由 pytest 改为 Node 侧方案（具体待确认） |
| DEC-139（框架自验收） | 同上；并加入跨平台一致性测试（DEC-148） |
| DEC-033 / DEC-106（证据哈希／审批哈希） | 实现改为在规范化内容（LF、UTF-8 无 BOM）上计算（DEC-144） |

## 删除

无。

## 影响评估

**W1 已产出物需联动**

- `tools/gate/gate.py`（54 行桩）→ 以 TS 重写；
- `tools/bootstrap/w1_bootstrap.py`（1011 行一次性自举工具，已完成使命）→ 归档保留，不再演进；
- `tests/test_w1_skeleton.py` + `pytest.ini` → 改为 Node 侧测试；
- `keel/config.json` → `profiles.active` 与 gate 自身测试命令；
- `.gitattributes` → 强制 `* text=auto eol=lf`（DEC-144）；
- `keel/decisions/INDEX.md` → 本次手工追加 DEC-143~149 并登记欠账，由 W2 `gate index` 接管生成。

**W2 及以后**

- gate 全部子命令以 TS 实现，保持零运行时依赖（仅 Node 内置模块）；
- CI 矩阵加 macOS runner；三平台一致性 fixture（DEC-148）；
- 哈希规范化贯穿证据与审批两处实现。

**未决子项**（本变更派生，须按 F3 逐条确认后方可实施）

1. Node 版本基线（原生类型剥离需 Node ≥22.18；是否要求 24 LTS）；
2. 免构建直接跑 `.ts`（实测可行）还是编译为 JS 分发；
3. 测试运行器（内置 `node:test` 零依赖 vs Vitest 生态更好但引入依赖）；
4. 分发方式（npm 包 `npx keel` vs 仓库内随项目走）；
5. 类型检查是否作为门禁项（`tsc --noEmit` 需 devDependency，与「零依赖」边界如何定义）。

## 批准

用户 2026-08-21 对话确认，原话：**「全部同意 2 进行更新。同时改为node+ts」**（「2」= 确认 Linux 纳入正式支持矩阵）。

重确认（APR 哈希、人类身份提交）在 W2 补办：提出时 `gate approve` 尚未实现，属已知欠账。
