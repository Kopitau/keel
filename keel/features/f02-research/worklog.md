# worklog — F2 f02-research

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W4，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-27（RES-904）

- 进度：RES-904 调研 mattpocock/skills 的 wayfinder（标准档，22 条一手/二手引用带访问日期），结论"逐条借鉴不整套采用"，七条清单详述在文内。
- k-research 加两节：并行研究（互不依赖的问题各起空白子代理，各写 RES 只回编号，主上下文读 INDEX）；一手源优先（二手只作日期与旁证并标明）。
- 问题链接：DEC-172（spike 记录种类，deferred，触发 = zhaoxi F6 壳 spike）。

## 2026-08-28（CHG-010 / P3）

- 进度：把标准/深度 RES 的 URL 判据从通用结构检查拆成独立三态读取端：正文有 URL 为 PASS；外置清单 ID/路径/规范化全文哈希完全一致为 WARN；清单缺失/非法/重复、版本分界错误、ID/路径/哈希不符、迁移后新建或实质修改仍零 URL 为 FAIL。
- 严重度：G-research 先检查重大 DEC 的 RES 指针与报告结构，再检查 URL；legacy 只能降低 URL 子检查，不能覆盖结构缺失。X-oss 仍独立执行，fixture 已证明 legacy WARN 与缺 OSS 声明同时出现时总门禁仍 FAIL。
- 本仓结果：RES-001..008 是升级前 bootstrap 标准/深度包装记录，清单绑定八份文件；`gate check --quick` 稳定显示 G-research WARN，清单不把它们伪装成 PASS。其余 6 份标准/深度 RES 正文已有 URL。
- 绿灯：`node --test tests/chg010-legacy-res.test.ts` → 7/7；CRLF/LF/BOM 以 DEC-144 规范化文本得到相同清单哈希。
- C-34: ref=DEC-181 新增引用 URL 子检查和 legacy 外置清单的正反向测试；没有删除或 skip 既有测试。
- 补充：SemVer prerelease 也按客观 precedence 进入 cutoff；`0.8.0-rc.1→0.8.0` 的 gate fixture 为 WARN。最新 legacy 专项 8/8（前述 7/7 是增加 prerelease 守卫前的中间结果）。
