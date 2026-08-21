# worklog — F24 f24-cross-platform

## 2026-08-21

- 进度：W1 重做。Python 实现已回滚；按 CHG-001 / DEC-143~148 落地规范化哈希、启动器、版本门。
- 实现决定：哈希实现放在 gate 包内供 F6/F18 后续引用，不另起库（零运行时依赖）。
- 问题链接：无

## 2026-08-21（W3）

- 进度：CI 矩阵 ubuntu/windows/macos × Node 22/24（DEC-148/150）。

## 2026-08-21（W5）

- 进度：`tests/fixtures/dec148-lf.txt` 规范化哈希夹具，三 OS CI 应得到同一 digest。
