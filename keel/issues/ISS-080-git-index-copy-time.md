---
id: ISS-080
schema: iss-v2
status: closed
defense_kind: regression
defense_pointer: tests/w3-verify.test.ts
feature: F6
fingerprint: git-index-copy-time
ac: REQ-006/AC-4
source: self-check
recurrence_of: ""
date: 2026-09-05
---

# ISS-080 临时索引时间戳导致源码变化漏检

## 现象与影响

完整 verify 多次在 w3-verify 的源码变化/证据过期断言失败；单独执行往往通过。同长度快速修改可能仍得到旧哈希，既导致测试不稳定，也会错误地把旧验证当作新鲜证据。

## 复现与证据

命令：`node --test --test-reporter=spec tests/w3-verify.test.ts`。

新增确定性样例：临时仓库设置 coarse stat 对比，固定文件与索引时间，保持字节长度再改内容，检查新树不同且旧证据过期、用户暂存区字节不变。无需 sleep 或改变原断言。

- 修前：退出 1，6 过 / 1 失败，ISS-080 样例报 changed content must invalidate evidence。
- 修后：退出 0，7 过；原来的树哈希/证据测试全部保留。tsc --noEmit 退出 0。

## 根因与修复

gitWriteTree 用 copyFileSync 复制真实索引到临时索引，却赋予副本当前时间。Git 的 racy-clean 内容核验依赖索引时间；更新了这个时间可能把需要核验的同 stat 文件误判为旧的干净文件。

最小修复：副本时间设为源索引时间向下取整的秒，确保不比原索引更新；只修改临时文件，不改用户暂存区或证据协议。

依据：[Git 官方 racy-git 文档](https://git-scm.com/docs/racy-git)，访问 2026-09-05。文档解释索引时间与 stat 缓存的条件；本仓故障由上述确定性红绿测试验证。

## 为何未被更早发现与防复发

旧样例依赖执行时序，隔离运行常常碰不到。加入固定时间的同长度变更回归，保留既有功能断言；无需更高级的 gate、hook 或新永久行为规则。
