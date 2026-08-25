---
id: ISS-022
status: closed
defense_kind: "设计修订+回归测试"
defense_pointer: "tests/chg007-installer.test.ts (ISS-022 npm pack); bin/keel.js; tools/cli/*.js"
feature: f16-platforms
fingerprint: "global-install-unusable"
date: 2026-08-25
source: 第四轮独立复审（C-42）；复现命令由复审者实跑
severity: 阻断级
requirements: [REQ-025]
---

# ISS-022 全局安装完全不可用：两条安装路径都是坏的

## 现象

REQ-025 的核心承诺「在项目文件夹激活」目前**一次都实现不了**。README 第 15 行教的两种安装方式都不工作：

| 安装方式 | 结果 |
|---|---|
| `npm i -g file:<repo>`（Windows 建 junction） | **静默什么都不做，exit 0**。`bin/keel.js` 用「自身路径 == argv[1]」判定 `isMain`；junction 路径与 Node 解析出的真实路径不等，判定为假，整个 CLI 被跳过 |
| tarball / git URL（真副本） | **崩溃**：`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` —— Node 明确不对 `node_modules` 下的文件做类型剥离 |

安装器**逻辑本身是好的**：绕开 node_modules 直接从仓库路径调用时，REQ-025 的 8 条验收标准中 6 条实测达成。坏的只有分发这一层。

复现命令：

```bash
# 路径一：junction 安装 → 静默无操作
npm i -g --prefix <临时前缀> E:/program/en
cd <一个空 git 仓库> && <临时前缀>/keel.cmd init   # 无任何输出，exit 0，目录里什么都没建

# 路径二：真副本安装 → 崩溃
npm pack --pack-destination <tmp>
npm i -g --prefix <另一前缀> <tmp>/keel-0.7.0.tgz
cd <空仓库> && <另一前缀>/keel.cmd
# ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: Stripping types is currently unsupported
# for files under node_modules, for ".../node_modules/keel/tools/cli/main.ts"

# 对照：绕开 node_modules 直接跑，一切正常
cd <空仓库> && node E:/program/en/bin/keel.js init   # 正常安装，check 全绿
```

## 根因

**DEC-151（免构建直接跑 `.ts`）与 DEC-157（npm 全局分发）在架构上不兼容**：npm 安装会把代码放进 `node_modules`，而 Node 的类型剥离在该目录下被禁用。

`isMain` 守卫是第二个独立缺陷：它假设 `import.meta.url` 与 `argv[1]` 指向同一路径，这在链接/junction 安装下不成立，导致**失败模式是静默而非报错**（比崩溃更难发现）。

**调研责任在复审者**：RES-902 结论「npm bin 指向 .ts 在 Windows 可行」只测了本地路径安装（建链接、文件不在 node_modules 真实路径下），未覆盖真副本安装。DEC-157 部分建立在这个不完整证据上。RES-902 需补记更正。

## 修复

**分层**：安装器那一层必须是纯 JS 或打包成单文件 JS；它复制进项目的载荷仍是 `.ts`。

依据：装完后 `<项目>/tools/gate/gate.ts` 不在 `node_modules` 下，类型剥离照常工作——复审者已实测验证。因此 **DEC-151「框架本体免构建」不受影响**，只有 `bin/` + `tools/cli/` 需要 JS 化（手写 JS 或加一个只打包 CLI 的构建步骤，二选一需走决策）。

同时修 `isMain`：改用 `realpathSync` 比较，或直接去掉该守卫（bin 入口本就只有被执行一种用途）。**失败必须是显式报错，不得静默 exit 0。**

附带确认（复审者已代做）：`private: true` **不阻止**全局安装，可保留它防误发布——CHG-007 点名的技术未知，答案是好的。

## 为何未被更早发现

CHG-007 明文要求「实现前需实测：`private: true` 是否阻止 `npm i -g git+https://...`，这是本单唯一需要先验证的技术未知」。**该实测全程未做**（trace 中 npm 命令 0 次）。任何一次真实安装尝试都会立刻暴露这两个缺陷。

## 闭环选择与理由

**回归测试**：`tests/chg007-installer.test.ts` 断言 `bin/` 与 `tools/cli/` 为纯 JS（从不 `import .ts`）、去掉 `isMain` 静默跳过；`npm pack` → prefix 安装 → `keel init` 成功且无 `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`。安装器只跑 JS；复制进项目的 `tools/gate/*.ts` 在项目目录执行，DEC-151 仍成立。

**为何选手写 JS 而不是加构建步骤**（R5 指出应显式写出）：加打包器会新增 runtime/devDependency，超出 DEC-154 白名单（只允许 `typescript`）。手写 `bin/` + `tools/cli/` 的纯 JS 是保守选项，不扩依赖、不改 DEC-151 的「项目内 `.ts` 免构建」。未另立 DEC——约束已在 DEC-154/151/157，这是实现侧的保守取舍。
