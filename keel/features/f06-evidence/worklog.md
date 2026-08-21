# worklog — F6 f06-evidence

## 2026-08-21

- 进度：规划 v1 已落盘，本功能主波次 W3，W1 未实施切片以外的部分。
- 内部分解：见 plan/v1.md

## 2026-08-21（W3）

- 进度：`gate verify` 写 `keel/evidence/verify.json`（gitignore）。树哈希用临时 index 的 `git write-tree`，排除 `keel/evidence/`。过期证据使 X-evidence / G-done / G-merge 失败。
- 实现决定：JUnit reporter 写入相对路径；解析失败则回退 TAP `# pass`。不把证据打进树哈希，避免 JSON 自污染。
