# 执法三档落地指引（C-48 / C-104）

诚实标注：完整档才能把「CI 复算」做成不可绕过的权威；其余两档防呆不防恶。

## GitHub = 完整档

1. 随仓库提供 `.github/workflows/gate.yml`：Node **22 + 24** × **ubuntu / windows / macos**（DEC-148/150）；存在配置不代表远端已经运行。
2. 将 job **`gate-ok`** 设为 required status check。
3. 保护 `main`：禁直推、要求 PR、要求 review、squash 合并（C-46）。
4. `.github/CODEOWNERS` 把 `keel/approvals/` 配成真实用户后，在规则集里要求 code owner review（C-108）。
5. PR 改 `tools/gate/` 时，workflow 先用 **主干** 的 gate 跑 `check --quick`（DEC-138），再跑本分支 `verify`。

## Gitee = 降级档

Gitee 无 GitHub Actions 同款矩阵，也没有 no-mistakes 的 PR/CI 步（C-47）。

- 尽量配 Gitee Go / 自建 runner 跑同一条命令：`npm ci && node tools/gate/gate.ts verify && node tools/gate/gate.ts check`。
- 保护分支 + 哈希 APR 文件。
- 配不上 CI 时按本地档执行，并在项目 OVERVIEW 写明「Gitee 降级档，权威在人工跑 gate」。

## 本地档（没有远程 CI 时）

实际档位见 config；本仓配置 github，远端是否可用要另行核实。本地档使用合并前的本地证据：

```
node tools/gate/gate.ts verify
node tools/gate/gate.ts check
```

hooks：pre-commit = `check --quick` 然后写 `.git/keel-precommit-stamp`；prepare-commit-msg 据此写入 `Keel-Precommit: ok|skipped`（`--no-verify` 跳过 pre-commit 会留下 skipped，门禁 FAIL）。pre-push 复用同树新鲜的通过证据，必要时 verify，然后 check。

`git push --no-verify` 会跳过 L2。**推送后的权威是 L3 CI**（C-104）；本地档在合并前检查有效的 verify 与 check 证据。APR 用用户原话和授权范围，由 `gate approve` 绑定哈希；提交身份不证明审批（DEC-190）。防呆不防恶。
本地合并说明须存档，并引用 APR id、证据 tree hash 与两条命令结果；这仍是降级证据，不冒充远端保护或 CI。
