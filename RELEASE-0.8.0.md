# keel 0.8.0 release notes

发布日期：2026-08-28。

这是一次带迁移边界的本地框架升级。升级前先提交或备份自己的改动；运行 `keel update` 后阅读完整预览，只有明确输入单字母 `y` 才会执行。

## 破坏点

### 目录协议

- 新增 `<records_dir>/migrations/res-citation-legacy.json`。它只在项目由 `keel_version < 0.8.0` 升到 `>= 0.8.0` 时生成，用于绑定升级前零 URL 的标准/深度 RES；旧 RES 本身不改写。
- updater 会把框架完全管理目录中的旧文件列为 `DELETE`，包括 `tools/gate/`、`.githooks/`、`keel/templates/` 以及名称以 `k-` 开头的技能和 Claude 镜像。非 `k-` 的个人技能不属于删除范围。

### 字段协议

- 项目 `config.json` 的 `keel_version` 更新为 `0.8.0`。
- legacy 清单顶层固定为 `schema_version`、`source_keel_version`、`target_keel_version`、`generated_at`、`entries`；每个 entry 固定为 `id`、仓库相对 `path`、DEC-144 规范化全文 `sha256`。重复 ID 或路径非法。
- 缺失或非法的升级前 `keel_version` 不再被猜成 `0.0.0`；update 会在确认前拒绝且零写入。

### 门禁与 CLI 语义

- G-research 对标准/深度 RES 的 URL 子检查改为三态：正文有 URL 为 PASS；仅当 legacy 清单的 ID、路径、规范化全文哈希完全一致时为 WARN；缺清单、重复、版本/路径/ID/哈希不符或迁移后零 URL 新记录为 FAIL。legacy 不豁免报告结构、重大 DEC 的 RES 或 OSS 义务。
- `keel update` 先打印所有 `ADD`、`OVERWRITE`、`DELETE` 和 legacy entry 变化，再询问 `y/N`。默认 N、非单字母 y、EOF 与非交互 stdin 全部取消，确认前不创建目录、临时文件、备份，也不改 Git index。
- 明确 `y` 后只操作预览内的框架管理路径；updater 不再用 `git add -A` 暗中暂存用户改动。

## 升级后检查

运行：

```text
node tools/gate/gate.ts check --quick
node tools/gate/gate.ts verify
```

未改写的 legacy RES 出现 G-research WARN 是预期迁移状态，不是 PASS。下一次实质修改该报告时必须补上带日期的来源 URL。
