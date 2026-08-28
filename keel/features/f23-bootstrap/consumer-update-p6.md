# P6 Windows 本地消费项目升级证据

- **date**: 2026-08-28
- **source_commit**: `eb4e2323bb6506938c345731cd31a108b207559d`
- **platform**: Windows
- **runtime**: Node 22.19.0 / npm 10.9.3
- **scope**: 本地全量、npm pack 安装、隔离消费项目 0.7.0→0.8.0 update
- **external_ci**: 未触发；REQ-017/AC-4 保持 proxy

## Windows 全量

- `node tools/gate/gate.ts verify`：320 passed / 0 failed / 0 skipped。
- commit pre-commit 独立复算：320 passed / 0 failed / 0 skipped，`Keel-Precommit: ok`。
- P5 commit：`eb4e2323bb6506938c345731cd31a108b207559d`。

## npm pack 与隔离安装

- 包：`keel-0.8.0.tgz`，129 files，123.9 kB（unpacked 374.6 kB）。
- SHA-256：`790515ae20e36b46be9269b1ec825cce955e105b820b52a1226450a289efa686`。
- `npm install --prefix <temp> --ignore-scripts <tgz>`：added 1 package；安装后 package version = `0.8.0`。
- 没有发布到公共 npm。

## 消费项目真实 update

隔离路径：`C:\Users\NF3317\AppData\Local\Temp\keel-p6-consumer-eb4e232`（本地临时证据，不纳入仓库）。先用打包产物执行 `keel init --name p6-consumer --tier local`，再把 fixture 源版本设为 0.7.0，并放入一份升级前 standard RES。

交互式 `keel update` 的写前预览只有：

```text
OVERWRITE keel/config.json
ADD keel/migrations/
ADD keel/migrations/res-citation-legacy.json
LEGACY ADD RES-001 keel/research/RES-001-legacy-consumer.md b8d8b61feff53b67fff225bdeddf7fabd4f5e3275ba3492ecc0a1ed3f98e3cf6
Proceed? [y/N]
```

输入单字母 `y` 后输出 `keel update applied 0.8.0`。结果：

- project `keel_version`: `0.8.0`；manifest source/target = `0.7.0` / `0.8.0`。
- manifest 的唯一 entry id/path/hash 与预览一致。
- RES 规范化 hash 升级前后均为 `b8d8b61feff53b67fff225bdeddf7fabd4f5e3275ba3492ecc0a1ed3f98e3cf6`，旧正文未改写。
- `keel doctor`：ok。
- `keel check --quick`：PASS_WITH_WARN，fail=0 / warn=1；唯一 WARN 是外置清单保护下的未改写 legacy RES，符合迁移三态。

## 未取得的外部证据

没有触发 GitHub Actions，也没有取得 macOS/Linux runner 结果、真实 run URL/ID、六个 job 与工件 hash。因此 REQ-017/AC-4、REQ-024/AC-6 仍是 proxy；本文件不能解除它们。
