---
id: DEC-168
title: 测试分黑盒验收与白盒回归：只有黑盒可挂 AC 名，X-trace 只数黑盒
status: confirmed
date: 2026-08-26
features: [F6, F17]
research: []
research_exemption: "本仓 179 条与 zhaoxi F0 104 条测试逐条审读（2026-08-26 本会话），证据表见正文；无外部候选需调研"
adr: true
source_id: "REQ-006"
---

# DEC-168 测试分黑盒验收与白盒回归：只有黑盒可挂 AC 名，X-trace 只数黑盒

## 问题

标准（REQ-006 / C-31~C-38）是为保功能写的：逐 AC 对账（C-32）、禁同义反复（C-34）、
修 bug 先红后绿（C-35）、每 AC ≥1 可运行验收测试（C-37）、每接口 ≥1 契约测试（C-38）。
但机器判据只认字符串：

| 门禁 | 判据（`tools/gate/trace.ts` / `check.ts`） | 看测试正文吗 |
|---|---|---|
| X-trace | `tests/` **全文**（含注释）里出现 `REQ-nnn/AC-i` | 否 |
| X-tests | 基线名单：删 / skip 须引用 ISS、DEC | 否 |
| X-full | 测试源码里出现 `runCheck(ctx, [])` 与各 quick-skipped id | 否 |

`k-impl` 对测试只有一句「Mark tests with `REQ-nnn` in the test name」，不分种类。
于是任何测试都往 AC 名字上挂，**白盒测试挂了黑盒的名字**，覆盖矩阵随之说谎。实证：

**本仓**：`tests/r2-rework.test.ts` 的 `REQ-017/AC-1..4` 四条一行测试。f17-gate 是本仓唯一有
summary.md 的功能（X-trace 唯一生效处），ISS-020 把判据升到逐 AC 后它们就出现了：

| 测试名 | AC 原文 | 实际断言 |
|---|---|---|
| REQ-017/AC-1 | Node ≥22.18 直跑 .ts，仅内置模块 | `isAllowedTestCommand("node --test") === true` |
| REQ-017/AC-2 | 六门禁输出 通过/警告/不通过 + 原因 + 修复指引 | `match(/PASS G-req/)` |
| REQ-017/AC-3 | L3 CI 同一脚本全量重算 | yml 里 grep 到两个字符串 |
| REQ-017/AC-4 | 改 hooksPath / --no-verify / 测试目录 → 拦截 | `isAllowedTestCommand("…/x.test.ts") === false` |

真测试在 w6 / p0（Keel-Precommit skipped、tests-dir gap、ISS-005 hooksPath），但 AC 名挂在了空壳上。

**zhaoxi F0**（104 条全带 REQ 名，overview-v2 §4 要求「测试名含 `REQ-nnn/AC-i`」）：

| 测试名 | AC 原文 | 实际验的 |
|---|---|---|
| REQ-002/AC-2 | Win + mac 跑同一套验收 | 源码无盘符/反斜杠字面量；CRLF 规范化 |
| REQ-002/AC-3 | 主文案中文 | 一条报错含 CJK；`cjk.test("chunk_fts")` 测的是测试自己的字面量 |
| REQ-005/AC-1 | 关开关后不再外发；未登记外发 = 0 | Registry 单元测试 + FakeHost 计数（plan 写的 mock fetch 未做） |
| REQ-006/AC-1 | 注入样例走问答/漏斗/抽取…不触发工具调用 | `autoActionAllowed()` 返回 false |
| REQ-007/AC-1 | 目标规模跑基准，结果入 evidence | 2000 块 p95 < 1 s；`TARGETS` 常量 == 需求数字 |
| REQ-004/AC-1 | 向导走完后 入库→检索→问答 可用 | `wizard.isCoreReady()` 布尔 |

`gate trace` 把这六条 AC 全标为已覆盖。它们在 F0 阶段多数是**合理的白盒原语测试**，
错在名字宣称了 AC 级黑盒覆盖；等 F2/F6 把管道建起来，没有任何东西提醒「REQ-006/AC-1 其实还没验过」。
同一项目的三轮评审抓到的 4 条假绿（`assert.fail` 被 catch 吞、取消的是 queued 作业、
把丢内容的缺陷固化成期望、文档核对单向）也都是「黑盒名字、白盒都不算」。

另外两边 C-38 接口契约测试都是零（本仓 `I-01` 全是 fixture 字符串；zhaoxi I-06/I-12/I-13 只出现在注释）。
X-trace 还会把注释里的 REQ 编号算成覆盖（zhaoxi `principles.test.ts` 的追溯表让 REQ-008/011/026 多出一个「覆盖文件」）。

要拍板的取舍：**测试种类要不要进判据。**

## 选项对比

| 选项 | 优点 | 缺点 |
|---|---|---|
| **A. 判据区分两类**：黑盒验收才可带 `REQ-nnn/AC-i`；白盒回归带 `ISS-/DEC-/fp:`；接口契约带 `I-nn`；暂时黑不了的 AC 显式标 `[proxy:…]` 记 WARN；X-trace 只数**测试名**上的黑盒标记，不扫注释；白盒修复类测试须突变验证（吸收 zhaoxi DEC-013） | 覆盖矩阵重新可信；「代理覆盖」有读取端，不会被遗忘；与 C-36「不设覆盖率门以免凑数」同向——数的是黑盒条数不是行覆盖 | 改 `trace.ts` 判据 + 守卫测试；存量测试要改名（本仓 4 条、zhaoxi 6 条）；多一个命名约定要学 |
| B. 只改技能文字：`k-impl` 写清两类命名，门禁不动 | 零代码改动 | 本仓 REQ-017/AC-1..4 正是技能文字管不住的例子——命名规则没有机器读取端就会漂 |
| C. 维持现状：名字即覆盖 | 无 | `gate trace` 已在第一个真实项目里报出 6 条虚假覆盖；C-32「零引用=门禁不过」实际只能挡「没写名字」 |

## 推荐理由

A。三条理由：

1. 标准里两类测试本来就分开写着（C-37/C-38 是黑盒，C-34/C-35/DEC-013 是白盒），只是没命名、门禁没区分；A 只是把已有的分层落到判据上，不引入新原则。
2. 两个仓库同一形态各自出现，说明是机制问题不是个人问题。
3. 黑盒与白盒缺一不可：zhaoxi 锁的 TOCTOU 是先读 `storage.ts` 才想到怎么打（白盒找路径），再用多进程真打（黑盒验证）。A 不贬低白盒，只是不让白盒顶验收的名。

B 便宜但已被证伪；C 等于承认覆盖矩阵是装饰。

## 用户决定原话

（未确认前留空）

前情：2026-08-26 用户对测试审读报告答复「应该按照黑白盒原理来进行测试吧」；对「起草 DEC，推荐 A 备选 B」答复「可以」。

## 影响

若确认 A，按以下形状落地（全部需守卫测试，C-33）：

1. **命名约定**（写进 `k-impl` 第 4 条、DESIGN §5 F6、CONTEXT.md 术语表）：
   - 黑盒验收：`REQ-nnn/AC-i <行为>`。输入只用需求里说的东西，断言只看需求里说的结果。按 C-31 先于实现写；推荐由未看过实现的空白上下文写，实现者只许补不许改断言。
   - 白盒回归 / 守卫：`ISS-nnn <行为>`、`DEC-nnn <行为>` 或 `fp:<指纹> <行为>`；**不得**带 `REQ-nnn/AC-i`。提交前突变验证（改回缺陷 → 变红 → 还原），worklog 记一行——C-35 据此扩写。
   - 接口契约：`I-nn <行为>`，从耦合表的签名与语义写，不看实现（C-38 落地）。
   - 代理覆盖：`REQ-nnn/AC-i [proxy:<解除条件>] <行为>`，例如 `[proxy:F2 管道]`。
2. **X-trace**（`trace.ts`）：从测试名清单取标记（复用 `testbase.ts` 的 `parseTestInventory`），不再全文正则；`[proxy]` 的 AC 记 WARN「代理覆盖」而非 PASS；白盒名（ISS/DEC/fp 前缀）若同时带 AC 标记 → WARN（本版）→ FAIL（下一版，另出 DEC）。
3. **`gate trace` 矩阵**加一列「代理」。
4. **存量整改**（本仓，同 PR）：`r2-rework.test.ts` 的 REQ-017/AC-1..4 删除（C-34: ref=DEC-168），w6/p0 对应真测试改名挂 AC 标记；三条 `I-nn` 契约测试补齐。
5. **zhaoxi**：消费项目自行处理；本仓只提供判据与技能文字。六条代理测试预期改法：REQ-002/AC-2、REQ-005/AC-1、REQ-006/AC-1、REQ-004/AC-1 加 `[proxy:…]`；REQ-002/AC-3、REQ-007/AC-1 改为真验收或降为白盒名。
6. **前置缺陷，不属本决定**：`keel/templates/feature-plan.md` 与 `gate new feature` 不生成 `req:`，`claimedReqs()` 对消费项目永远为空，X-trace 从不绑定——另立 ISS 修；不修则本决定对消费项目无效。
7. 守卫测试（新增于 `tests/`，攻击镜头）：注释里的 REQ 编号不算覆盖；白盒名挂 AC 标记 → WARN；`[proxy]` → WARN 且 `gate trace` 列出；本仓自身在新判据下全绿（正样本，ISS-038 教训）。

## 后果与复审条款

- **难逆转**：所有消费项目的测试命名约定；已命名测试改名要过 C-34 基线并引用记录。
- **无上下文会意外**：为什么回归测试不许挂 AC 名——因为 AC 名是黑盒覆盖的凭证，白盒一旦可挂，覆盖矩阵就说谎（本仓 REQ-017、zhaoxi F0 六条实证）。
- **真权衡**：门禁更严 ⇄ 摩擦增加。选严，因为覆盖矩阵是验收材料五样之一（C-43），它不可信则验收不可信。
- **复审触发**：
  - 某功能的 AC 长期停在 `[proxy]` WARN（说明 AC 本身写得不可验收，应回 k-grill 改 AC，而非放宽判据）；
  - `[proxy]` 占比超过该功能 AC 数的 1/3；
  - 白盒名挂 AC 标记的 WARN 升 FAIL 时另出 DEC。
