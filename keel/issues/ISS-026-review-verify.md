---
id: ISS-026
status: open
defense_kind: "契约测试"
defense_pointer: ""
feature: f07-review
fingerprint: "review-field-wiped-by-verify"
date: 2026-08-25
source: 第四轮独立复审（C-42）；证据见 docs/review/A4-review-loop-compliance.md
severity: 阻断级
requirements: [REQ-027]
---

# ISS-026 证据里的 review 字段被 gate verify 抹掉，熔断计数永不触发

## 现象

**两个状态持久化缺陷：**

① `verify.ts:146-161` 从零构造 Evidence 对象，**不含 `review` 字段**。而清零动作会改 `state.json`、使证据 stale、必须重跑 verify——重跑之后 `'review' in evidence === false`，`G-done` 却照样 PASS。结果：`check.ts:201-206` 与 `evidence.ts:105-118` 里那段 review 校验**在真实流程中永不执行**。

② 熔断计数 `bumpRounds` 只被不可达的 `recordClear` 调用（见 ISS-025），`rounds_on` 生产恒为空。即便接上，计数以 ISS 编号为键，而 `fileFindings` 每轮都用 `runNew` 拿**新编号**——三轮会变成三个键各计 1，**永远到不了阈值 3**。删掉 `state.json` 即可重置。

复现命令：

```bash
# ① review 字段被抹
# 走一遍 clear（或直接构造带 review 的证据）→ 跑 gate verify → 检查证据
python -c "import json;d=json.load(open('keel/evidence/verify.json',encoding='utf-8'));print('review' in d)"
# → False；而 G-done 仍 PASS

# ② 熔断
grep -rn "bumpRounds" tools/gate/    # 唯一调用方是不可达的 recordClear
# 且键为 ISS 编号，每轮 runNew 产生新编号 → 计数永远分散
```

## 根因

`verify` 重建证据时丢字段（两个模块各写各的，无共享构造器）；熔断计数选错了键（用每轮会变的 ISS 编号，而不是稳定的问题指纹）。

## 修复

1. `verify` 重建证据时**保留已有的 `review` 段**（或由单一构造器统一产出，避免两处各写各的）；
2. 熔断计数改用**稳定指纹**（问题指纹 / 首次 ISS 编号）为键，不用每轮新生成的编号；
3. 计数不得因删除状态文件而静默重置——至少在删除后要求重新走一轮完整评审。

## 为何未被更早发现

变更单 CHG-008 点名要求「清零判定的执行结果须写进证据 JSON，字段扩展需与 `evidenceGaps` 的校验同步改，**两侧配契约测试**」。**契约测试没写**——缺的正是「verify 之后 review 段仍在」这一条。

## 闭环选择与理由

**契约测试**：断言「写入 review 段 → 跑 verify → review 段仍存在且内容一致」；熔断用稳定键的单元测试 + 三轮不清零必然触发的端到端测试。
