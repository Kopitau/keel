# 统一实施规划总览 v2

- date: 2026-08-21
- status: 工作规划
- replaces: overview-v1.md
- change: CHG-001
- why: v1 按 Python gate 规划，与已批准的 DEC-149/F24 冲突。本版按完整确认重排 W1。

确认即冻结。再改接口/运行时走 CHG 出 v3（C-24）。§8/9 仍非 C 记录。

## 功能清单

| F | 目录 | 主波次 | 测试义务（摘要） |
|---|---|---|---|
| F1 | f01-requirements-interview | W4 | 访谈协议无歧义测试 |
| F2 | f02-research | W4 | RES 格式与引用存在性 |
| F3 | f03-decisions | W1 迁入 / W2 new | 状态机合法 |
| F4 | f04-unified-plan | W1 | INDEX 唯一；总览+小规划 |
| F5 | f05-overhead | W1 地图 | AGENTS 行数/字节 |
| F6 | f06-evidence | W3 | 证据 JSON；哈希走 DEC-144 规范化 |
| F7 | f07-review | W4 | 材料五样 |
| F8 | f08-merge | W3–W4 | 合并前置四条件 |
| F9 | f09-retro | W1 总览 / W4 | summary 固定节 |
| F10 | f10-issues | W2/W4 | 防线指针存在 |
| F11 | f11-change | W4 | 改当前需求版=失败 |
| F12 | f12-handoff | W1 | handoff 五段；status 路径 |
| F13 | f13-lessons | W4 | 候选标签 |
| F14 | f14-knowledge | W1 空库 / W4 | 不入仓 |
| F15 | f15-oss | W2/W4 | 直接依赖对账 |
| F16 | f16-platforms | W1 布局 / W4–W5 | AGENTS+镜像复制 |
| F17 | f17-gate | **W1 stub TS** / W2 真身 | node:test；tsc --noEmit |
| F18 | f18-approvals | W1 草稿 / W2 | 人类身份提交 |
| F19 | f19-parallel | W2 | 重叠检测 |
| F20 | f20-context-budget | W1 初值 / W2 | 超硬限不通过 |
| F21 | f21-config | W1 | config 合法；keel-gate 画像 |
| F22 | f22-migrate | W1 表 / W4 | 映射表+报告 |
| F23 | f23-bootstrap | W1 | 编号映射；Python 自举归档 |
| F24 | f24-cross-platform | **W1** | 规范化哈希、启动器、版本门 |

## 接口与耦合（C-38）

v1 的 I-01..I-15 仍有效。CHG-001 增补：

| ID | 从 → 到 | 契约 |
|---|---|---|
| I-16 | F24 → F17/F6/F18 | 哈希 API=`sha256Normalized`；启动器探测 Node≥22.18.0 |
| I-17 | F17 → F21 | config.profiles.keel-gate 为 gate 自身测试命令 |
| I-18 | F24 → F16 | 镜像三平台复制（DEC-147） |

## 实施顺序

1. **W1（本波，重做）**：目录骨架、AGENTS、模板、config、F22 映射表、F23 记录（已迁入保留）、**Node+TS gate 桩**、双启动器、规范化哈希、node:test、typescript 为唯一 devDependency。
2. **W2**：gate check/new/index/trace/sync/worktree/approve + 真 hooks + 大小写冲突检查。
3. **W3**：verify 证据、GitHub workflow、三平台 CI 矩阵（Node 22+24 × Win/macOS/Linux）。
4. **W4**：16 个 k-* 技能 + 镜像复制。
5. **W5**：冒烟 + 五主力触发 + DEC-148 fixture。
6. **W6**：试点校准。

## 本波（W1 重做）触碰范围

`AGENTS.md` `CONTEXT.md` `package.json` `tsconfig.json` `tools/gate/*` `tests/*.test.ts` `.githooks/` `.gitattributes` `keel/config.json` `keel/plan/overview-v2.md` `keel/requirements/v2.md` `keel/features/f24-cross-platform/` `keel/handoff.md`。

**回滚（不再演进）**：`tools/gate/gate.py`、`pytest.ini`、`tests/test_w1_skeleton.py`；`tools/archive/w1-python-bootstrap.py` 归档。

不实现六门禁、不写技能正文、不配远端。
