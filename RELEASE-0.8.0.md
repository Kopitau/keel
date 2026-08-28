# keel 0.8.0 release notes

发布日期：2026-08-28。

这是一次带迁移边界的本地框架升级。升级前先提交或备份自己的改动；运行 `keel update` 后阅读完整预览，只有明确输入单字母 `y` 才会执行。

## 破坏点

### 目录协议

- 新增 `<records_dir>/migrations/res-citation-legacy.json`。它只在项目由 `keel_version < 0.8.0` 升到 `>= 0.8.0` 时生成，用于绑定升级前零 URL 的标准/深度 RES；旧 RES 本身不改写。
- updater 会把框架完全管理目录中的旧文件列为 `DELETE`，包括 `tools/gate/`、`.githooks/`、`keel/templates/` 以及名称以 `k-` 开头的技能和 Claude 镜像。非 `k-` 的个人技能不属于删除范围。

### 字段协议

- 项目 `config.json` 的 `keel_version` 更新为 `0.8.0`。
- `platforms` 明确加入 `os_matrix`、`development`、`ci`：支持矩阵为 Windows/macOS/Linux，开发机为 Windows/macOS，Linux 是 CI 权威环境。
- legacy 清单顶层固定为 `schema_version`、`source_keel_version`、`target_keel_version`、`generated_at`、`entries`；每个 entry 固定为 `id`、仓库相对 `path`、DEC-144 规范化全文 `sha256`。重复 ID 或路径非法。
- 缺失或非法的升级前 `keel_version` 不再被猜成 `0.0.0`；update 会在确认前拒绝且零写入。

### 门禁与 CLI 语义

- G-research 对标准/深度 RES 的 URL 子检查改为三态：正文有 URL 为 PASS；仅当 legacy 清单的 ID、路径、规范化全文哈希完全一致时为 WARN；缺清单、重复、版本/路径/ID/哈希不符或迁移后零 URL 新记录为 FAIL。legacy 不豁免报告结构、重大 DEC 的 RES 或 OSS 义务。
- `keel update` 先打印所有 `ADD`、`OVERWRITE`、`DELETE` 和 legacy entry 变化，再询问 `y/N`。默认 N、非单字母 y、EOF 与非交互 stdin 全部取消，确认前不创建目录、临时文件、备份，也不改 Git index。
- 明确 `y` 后只操作预览内的框架管理路径；updater 不再用 `git add -A` 暗中暂存用户改动。
- `gate worktree add` 不再覆盖其他身份的 claim，git worktree 创建失败也不会留下 claim；先由当前 owner 运行 `gate worktree rm Fn` 释放，再允许重新认领。计划路径的目录/通配范围会与其中文件判为重叠。
- github/gitee tier 的 X-owners 只接受同一条有效 CODEOWNERS 规则上的审批路径和 owner；注释、占位符与配置中的 agent 身份不算人类审批人。local tier 仍仅作说明性检查。
- `k-migrate` 使用迁移报告模板保留已映射、未映射、冲突、存疑、无法归类和待确认；来源树前后按字节核对，迁移初稿不自动成为确认基线。

## 升级后检查

运行：

```text
node tools/gate/gate.ts check --quick
node tools/gate/gate.ts verify
```

未改写的 legacy RES 出现 G-research WARN 是预期迁移状态，不是 PASS。下一次实质修改该报告时必须补上带日期的来源 URL。
