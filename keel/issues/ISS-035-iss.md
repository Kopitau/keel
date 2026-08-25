---
id: ISS-035
status: wontfix
defense_kind: "显式不修"
defense_pointer: "本条目本身（记录已知边界）"
feature: f07-review
fingerprint: "repro-read-from-writable-iss"
date: 2026-08-25
source: 第六轮独立复审（C-42），复现命令由复审者实跑
severity: 重要（已知自述天花板）
requirements: [REQ-027]
---

# ISS-035 复现命令读自实施方可写的 ISS 文件，改写即可假清零

## 现象

`recordClear` 的注释写明「Does not trust caller-supplied refused flags (ISS-025)」——它确实不信调用方传入的 `refused` 标志，但它**信 ISS markdown 里的复现命令**，而那个文件实施方可以随意编辑。

实测：一条未修复的 blocking ISS（复现命令 `exit 0`，即问题仍在），把文件里的 `exit 0` 改成 `exit 1`，再跑 `gate loop clear` → `review loop passed`。**问题一行没改，回路认为已修复。**

复现命令：

```bash
# 有一条未修的 blocking ISS，其复现命令仍会成功（exit 0）
node tools/gate/gate.ts loop clear     # 正确地拒绝：still_open=ISS-nnn
# 编辑该 ISS 文件，把复现命令改成必然失败的（如 exit 1）
node tools/gate/gate.ts loop clear     # → review loop passed（假清零）
```

## 根因

ISS-025 的修复把「信任边界」从 CLI 参数推到了 ISS 文件，但没往下推到「不可篡改的记录」。复现命令的权威副本存在实施方可写的 markdown 里。

## 修复

方向：**复现命令在 ingest 时固化进 `state.json`（或证据）并记录内容指纹**，`clear` 只执行固化的那份；若 ISS 文件里的命令与固化版不一致，报错而非静默采用新版。

附带好处：顺带解决 ISS-036（重复 clear 抹掉 repro_runs），因为执行记录也一并固化。

## 为何未被更早发现

ISS-025 的 guard 测试验证的是「调用方传 refused=true 不被采信」，未覆盖「命令来源本身可被篡改」。防线只测了自己设想的那条攻击路径。

## 闭环选择与理由

**显式不修 + 理由**：同 ISS-034，用户 2026-08-25 决定停止返工循环，本条作为已知边界留档。

**重估触发条件**：同 ISS-034；另加——若将来把 `clear` 接入 CI 自动执行（届时篡改面从人工操作变成可脚本化）。
