# worklog — F24 f24-cross-platform

## 2026-08-21

- 进度：W1 重做。Python 实现已回滚；按 CHG-001 / DEC-143~148 落地规范化哈希、启动器、版本门。
- 实现决定：哈希实现放在 gate 包内供 F6/F18 后续引用，不另起库（零运行时依赖）。
- 问题链接：无

## 2026-08-21（W3）

- 进度：CI 矩阵 ubuntu/windows/macos × Node 22/24（DEC-148/150）。

## 2026-08-21（W5）

- 进度：`tests/fixtures/dec148-lf.txt` 规范化哈希夹具，三 OS CI 应得到同一 digest。

## 2026-08-28（P4 / OS 角色契约）

- 进度：live config、clean installer config 与 config 模板统一写明 `os_matrix=[windows,macos,linux]`、`development=[windows,macos]`、`ci=[linux]`；保留 DeepSeek Harness 在 Windows 需 WSL 的已确认限制。
- 边界：本轮 Windows 本机规范化 fixture 通过；真实 macOS 同 fixture 证据尚未取得，`REQ-024/AC-6` 保留 proxy，不能用静态 workflow 冒充跨 OS 运行。
- 证据：`tests/chg010-gates.test.ts` 的配置契约与 DEC-148 digest 代理测试通过。

## 2026-08-28（P6 Windows 本地全量）

- 证据：Windows / Node 22.19.0 下 `gate verify` 320/320，提交钩子又独立复算 320/320；npm pack、安装与消费项目 update 均在 Windows 本地通过。
- 边界：没有运行 macOS/Linux runner；REQ-024/AC-6 继续 proxy，静态 workflow 与 Windows 结果均不冒充跨 OS 实跑。
