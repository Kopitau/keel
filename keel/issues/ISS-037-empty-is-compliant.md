---
id: ISS-037
status: closed
defense_kind: 回归测试
defense_pointer: tests/r6-field-guards.test.ts
feature: F1
fingerprint: gate-skips-when-nothing-exists
date: 2026-08-26
---

# ISS-037 门禁「空即合规」：项目越早期，绿灯越廉价

## 现象

zhaoxi（本框架第一个真实业务项目，2026-08-25）在只有 3 份调研记录、需求还停留在对话里的状态下，`gate check` 报 `result: PASS fail=0 warn=0`。

当时 `G-req` 的判据是：没有需求书 **且** 没有实施活动 → `SKIP 尚未开始`。而"实施活动"只认 `keel/features/` 下的目录，**调研不算活动**。于是"已经开始调研、但一条需求都没落盘"这个状态，在门禁眼里等同于"还没开工"。

复现命令（改动前的判据）：

```
mkdir -p t/keel/{requirements,research,features}
echo '{"records_dir":"keel"}' > t/keel/config.json
printf -- '---\nid: RES-001\n---\n' > t/keel/research/RES-001-x.md
node tools/gate/gate.ts check --quick   # 改动前：SKIP G-req；改动后：FAIL
```

## 根因

同一个模式贯穿多项检查：**没有对象就跳过**。

| 检查 | 空时行为 | 后果 |
|---|---|---|
| G-req | 无需求 + 无 features/ → SKIP | 顺序倒置不可见 |
| X-oss | 无 package.json → SKIP | 调研期选定的依赖不可见（ISS-039） |
| G-plan / G-done / G-retro / X-owners / X-full | 无对象 → SKIP | 早期阶段几乎全部静默 |

SKIP 本身没错——门禁不该对不存在的东西下判断。错在**判据用"文件存在"代理"阶段已开始"**，而这个代理在项目最早期恰好失效，偏偏那正是本框架要管的阶段（F1 需求先行是第一个功能）。

## 修复

`G-req` 增加两条判据（`tools/gate/check.ts`）：

1. `keel/research/` 有 RES 文件而当前需求书不存在 → FAIL
2. 当前需求书存在但 `## REQ-` 条目为 0 → FAIL

即：**调研记录的存在本身就是"已开工"的证据**，不再只认 `features/`。

## 为何未被更早发现

六轮复审全部在 keel 自举的仓库上进行，而 keel 自己从第一天就有 28 条需求。**"需求为空"这个状态在自举仓库里从未出现过**，所以没有任何一轮复审能踩到它。这是自举验证的结构性盲区：框架只在自己已经走完的路径上被测过。

## 闭环选择与理由

选**回归测试**（最高一级）：`tests/r6-field-guards.test.ts` 里三条负向守卫用临时 fixture 造出"只有调研没有需求"的状态，断言 FAIL。选它而不是止于门禁改动，是因为门禁判据本身可能在后续重构中被改回 SKIP——只有测试能钉住。

相关：[[ISS-039]] 同根因在 X-oss 的表现。
