---
id: ISS-039
status: closed
defense_kind: 回归测试
defense_pointer: tests/r6-field-guards.test.ts
feature: F2
fingerprint: gate-skips-when-nothing-exists
date: 2026-08-26
---

# ISS-039 调研阶段选定的开源依赖，OSS 账本看不见

## 现象

zhaoxi 的 `RES-001`（深度档）结论是把 deepseek-harness 作为**锁定依赖**——整个项目的技术底座。但：

- `keel/oss/` 空
- 三份 RES 的 frontmatter 全是 `oss: []`
- `gate check` 报 `SKIP X-oss  no package.json`

复现命令：

```
node tools/gate/gate.ts check --quick    # 在 zhaoxi 上：SKIP X-oss
```

C-11 明写「调研中直接复用了某个开源项目，应该做记录」（用户原话）。规则在，执法不在。

## 根因

`X-oss` 的判据链是 `package.json → 直接依赖 → 找 OSS 条目`。这条链有两个断点：

1. **时序断点**：调研在写 `package.json` 之前发生。依赖决定诞生于 RES 的结论段，而不是清单文件。
2. **形态断点**：不是所有复用都进 npm 清单——git submodule、vendored 源码、外部二进制、平台 SDK 全都绕过。

而 `oss: []` 是 RES 模板的默认值，**沉默和"没选用"在数据上无法区分**。

## 修复

`tools/gate/osscheck.ts` 新增 `inspectResOss()`，`X-oss` 接线（`tools/gate/check.ts`）：

- 每份 RES 必须表态：`oss: [OSS-00N]`（选用了）或 `oss_none: <理由>`（没选用）
- 两个字段都空 → FAIL（**沉默不算表态**）
- `oss:` 指向不存在的 OSS 条目 → FAIL（悬空引用）
- **该检查不再因为缺 package.json 而 SKIP**，与 npm 依赖检查各自独立

`keel/templates/RES.md` 同步更新：脚手架的 `oss_none:` 留空，**默认就是不合规状态**，逼使用者表态。填占位理由就能过的模板等于没有检查。

## 为何未被更早发现

keel 自己是零运行时依赖项目，`package.json` 里只有一个 `typescript`，而它早就有 OSS-002 登记。**自举仓库恰好是这条判据唯一能正常工作的场景**：清单存在、依赖已登记、调研阶段早已结束。同 [[ISS-037]] 的自举盲区。

## 闭环选择与理由

选**回归测试**：`tests/r6-field-guards.test.ts` 有五条，其中最关键的一条是「无 package.json 时沉默的 RES 仍然 FAIL」——精确复刻 zhaoxi 那个漏过去的形状。

代价说明：本仓 10 份历史 RES 全部需要补表态，已逐份按实际结论填写（其中 RES-008 评估过 no-mistakes 但未采用，写明了重估触发条件；RES-901 选用 TypeScript，指向 OSS-002）。一刀切写"未选用"会让这条防线从第一天就变成走过场。
