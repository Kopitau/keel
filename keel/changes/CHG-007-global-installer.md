---
id: CHG-007
status: proposed
date: 2026-08-24
requirements_from: v2.md
requirements_to: v3.md
decisions: [DEC-157, DEC-158]
supersedes_wording: DEC-153
---

# CHG-007 全局安装器（Trellis 式激活）+ 空项目门禁语义

## 动机

1. 用户 2026-08-24：「应该类似 trellis，在项目文件夹激活，就相当于在这个文件夹部署了这个框架」。现状无 `gate init`，部署靠手工复制 8 个路径 + 改配置 + 手写测试基线；复审者实测走通但踩到三个坑，其中「测试基线无生成命令」会**静默丢掉整层 C-34 防护**。
2. 用户追问「G-req / G-plan 为什么会 fail」时暴露门禁语义不一致（其他门禁无事可查时 SKIP，唯独这两个 FAIL），确认「纳入」本次一并修正。

## 新增

- **REQ-025 全局安装器**（requirements v3.md）：`keel init/update/uninstall/doctor` 作用于当前目录；8 条验收标准。
- **REQ-026 空项目的门禁语义**（v3.md）：G-req/G-plan 条件判定；4 条验收标准。
- **DEC-157**（adr）全局安装器 + 项目内运行：bin 纯 JS 薄壳、四命令、init 行为、git URL 分发。
- **DEC-158** G-req/G-plan 条件判定。

## 修改

| 原决策 | 变化 |
|---|---|
| **DEC-153**（v1 分发 = 仓库内随项目走，npm 留 v2） | **精确改写措辞，不推翻**：分发 = 全局安装的安装器；运行 = 项目内副本。原决策的两条实质理由（离线可用、版本随项目锁定）全部保留，变的只是「安装器怎么送到你手上」。**不改为「npm 运行时分发」**——那样会让后来人误以为运行时依赖 npm，从而丢掉这两条约束 |
| C-05 / C-24 的**判定方式** | 由「缺失即 FAIL」改为条件判定（DEC-158）。判定门槛本身不放宽 |
| `k-init` 技能 | 提问从 5 问减到 4 问（测试画像移出）；补充「画像在 F4 统一实施规划时确认」 |

## 删除

无。

## 影响评估

**需要实现的**

- `package.json`：加 `bin`，去掉 `"private": true`（否则无法全局安装）；
- 新增 `bin/keel.js`（纯 JS，版本检查 + 动态 import）与 `tools/cli/`（init/update/uninstall/doctor）；
- `tools/gate/check.ts`：`gReq` / `gPlan` 改条件判定，新增「实施活动」客观判据（features 子目录内容 / worklog / summary）；
- `tools/gate/testbase.ts`：暴露可被 init 复用的基线生成入口（目前只有读取与比对，无写入路径）；
- `.agents/skills/k-init/SKILL.md`：改 4 问 + 画像时点说明；
- `keel/config.json` schema：新增 `keel_version`；`profiles.active` 允许 `unset` 且 gate 须优雅降级。

**批准时联动**

- `keel/requirements/INDEX.md` 的 `current:` 由 v2.md 切到 **v3.md**（当前 v3 已生成、已列入 versions，但指针未切——待批准后切换，C-63）；
- 规划补充见下节（C-23：中途新增功能的实施规划随变更单确认，不重开整份规划）。

**风险**

- 去掉 `private: true` 后有误发布到公开 registry 的可能 → 建议同时加 `"publishConfig": {"access": "restricted"}` 或保留 `private` 并只用 git URL 安装（**实现前需实测：`private: true` 是否阻止 `npm i -g git+https://...`**，这是本单唯一需要先验证的技术未知）。
- `profiles.active: unset` 触及 verify 的既有假设，需确认不会让 X-tests / G-done 静默通过。

## 实施规划补充（C-23）

**功能切分与顺序**

| 序 | 切片 | 依赖 | 测试义务 |
|---|---|---|---|
| 1 | `bin/keel.js` 薄壳 + 版本检查 | 无 | 负面测试：模拟低版本 Node 时输出人话错误而非语法错误 |
| 2 | `keel init` | 1；复用 testbase 的基线生成 | REQ-025 前 5 条验收标准，各配一条测试；空目录端到端冒烟 |
| 3 | `keel doctor` | 1 | 检出「配置带别的项目状态」「缺可执行位」「Node 版本不足」三种情形 |
| 4 | `keel update` / `uninstall` | 2 | update 版本倒退需 `--force`；uninstall 后 `keel/` 完整存在（REQ-025 第 5、6 条） |
| 5 | G-req/G-plan 条件判定 | 独立，可并行 | DEC-158 的三条负面测试 |

**接口与耦合**

- `init` ↔ `testbase.ts`：需要一个写入基线的导出函数（当前只有读取）——**这是本次唯一的新增跨模块接口**，两侧须有契约测试；
- `init` ↔ `config` schema：`keel_version`、`profiles.active: unset` 两个新字段，读侧（verify / check）必须容忍；
- 切片 5 与切片 2 有验收耦合：REQ-025 第 1 条验收标准（装完只有 G-req/G-plan 未通过）在切片 5 落地后应改为「二者为 SKIP」——**两片必须一起验收**，不可只合其一。

**测试画像**：本变更实现的是 keel 自身的代码，沿用现有 `keel-gate` 画像（`node --test` 全量），不新增画像。

## 批准

**status: proposed** —— 需求内容与四条技术决策已由用户在对话中逐条确认（DEC-157/158 载有原话），但本单尚未取得人类 git 身份的哈希审批（C-107）。与 CHG-002~006 一并待批。

**建议批准顺序**：先清 R3 复审（ISS-021 已修待复审），再一次性批准 CHG-002~007。
