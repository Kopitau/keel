# keel 本地合并与 GitHub 交付范围

## 授权与目标

用户原话、日期及合并/推送范围只在 APR-012 记录。本次交付已完成的 keel 更新，包括源分支上此前安全升级、0.13.0 优化、研究与 0.14.0 / F25 实现及验证记录，不启动新的产品功能。

- 仓库：Kopitau/keel，既有 origin 为 https://github.com/Kopitau/keel.git。
- 源分支：codex/safe-framework-update；授权时 HEAD 为 bb490b3f7727857e76211d2a464a0a0cde6af927，本次范围内交付记录可追加。
- 合并目标：GitHub 当前默认分支 codex/astra-instructions，查询到的远端基线为 f45dcc90cd84a3883da8deb5e9d93ab5d686f003。目标是源分支祖先；本地旧 master 不是远端默认分支，不改默认分支。
- 仓库当前为公开；未归档，当前身份有推送权限，目标分支 protected=false，适用 rules 查询为空。本次不改变这些设置。

## 交付方式与证据

本地建立保留两侧历史的合并提交，正常运行提交/推送钩子；不强推、不跳过检查。更新既有源分支和实际默认分支，保留源分支，不删除分支。本地派生的 keel/evidence/atlas.html 保留在工作目录，不将它加入版本库；源码可以重新导出。

合并前代码树为 1873f7c22b207295004479753a10b3aee954c488；最近正式 verify 338 过 / 0 失败 / 0 skipped，类型检查通过，现已重新对账有效。完整 check 退出 0、保留原 4 项提醒；只要相关树不变，就复用该证据。若合并引入新代码或冲突，先解决并重验，再推送。

本地合并、远端 refs 到达与 GitHub Actions 分别核对。原 REQ-017/AC-4 和旧 APR 提醒不伪造清零；推送成功不等于 CI 通过。实际提交哈希、推送结果与 CI 状态进入 worklog/handoff，不原地改本授权说明。

## 非范围

不发布 GitHub Release/npm 包、不修改仓库可见性或保护规则、不强推、不修改 taotie 或其他项目，不将本次推送授权扩展为未来任意外部操作。
