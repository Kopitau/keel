# samples/greet

keel 框架的 W5 冒烟样例：一个会打招呼的小模块（v2：空名抛错）。全流程由 `tests/w5-smoke.test.ts` 在临时目录走通（实现 → 修 bug → 变更 → 交接），不在本目录再放 `*.test.js`，以免被仓库根上的 `node --test` 误收。

手动走一遍（在临时克隆里）：

1. `k-new`：需求 + 规划确认
2. `k-impl`：实现 `greet`
3. `k-bugfix`：ISS + 回归测试
4. `k-change`：CHG + 需求 v2
5. `k-handoff`：写 `keel/handoff.md`，下一会话只读 status
