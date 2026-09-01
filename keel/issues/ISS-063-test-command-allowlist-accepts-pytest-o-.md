---
id: ISS-063
schema: iss-v2
status: closed
defense_kind: "regression-test"
defense_pointer: "tools/gate/testcmd.ts (PYTHON_VALUE_SHAPE / NODE_VALUE_SHAPE); tests/chg014-review-fixes.test.ts"
feature: "F21"
fingerprint: "testcmd-allowlist-pytest-o-override-narrows"
source: review-loop
recurrence_of: ""
prior_defense_failure: ""
defense_escalation: ""
date: 2026-09-01
---

# ISS-063 Test-command allowlist accepts pytest -o (ini override), which narrows the suite: -o addopts=--lf, -o testpaths=unit, -o addopts=-k_smoke all pass

## 现象

Test-command allowlist accepts pytest -o (ini override), which narrows the suite: -o addopts=--lf, -o testpaths=unit, -o addopts=-k_smoke all pass

## 影响

DEC-188 / ISS-018 keep 'no -k, no paths, no name patterns', but -o is an accepted value flag whose value is only refused when it looks like a path. `python -m pytest -q -o addopts=--lf` runs only the last-failed tests, `-o testpaths=unit` only one directory, `-o addopts=-k_smoke` only matching names, each producing a green verify.json that G-done / G-merge / X-evidence trust. The same shape also admits `-p <module>` (a local plugin that can deselect tests) and `--reporter=./x.js` / `--test-reporter=./x.js` (a custom reporter that writes the junit.xml the evidence is reconciled against); none of these are among DEC-188's allowed argument classes (-q -v -x -m --tb= --maxfail= --reporter --junitxml= --outputFile).

复现命令：

```
node --input-type=module -e "const m=await import('./tools/gate/testcmd.ts');const bad=['python -m pytest -q -o addopts=--lf','python -m pytest -q -o testpaths=unit','uv run pytest -q -o addopts=-k_smoke'].filter(c=>m.isAllowedTestCommand(c,'python-cli'));console.log('allowed although they narrow the suite:',JSON.stringify(bad));process.exit(bad.length>0?0:1)"
```

## 待诊断防线

Remove -o and bare -p <module> from PYTHON_FLAGS (keep -p no:<plugin>), refuse reporter values that name a module path for --reporter / --test-reporter, and list the closed set in DEC-188. Regression test: the three commands above must be refused with a narrowing reason.

打开态只写“待诊断”，未知根因和修复不得编造。

## 根因

`-o` 被当作普通取值参数放行，而 pytest 的 `-o` 可以改写 `addopts` / `testpaths`，等于把 `-k` `--lf` 藏进 ini 覆盖；`-p` 与 `--reporter` 的值只查「像不像路径」，模块名照样放过。

## 修复

删掉 `-o`；取值参数按形状核：`-p` 只许 `no:<plugin>`、`-m` 只许标记表达式、`-W` 只许警告过滤器、`--reporter` / `--test-reporter` 只许内置名字；有形状的值不再套路径规则（`-W error::DeprecationWarning` 合法）。

## 为何未被更早发现

DEC-188 的放行清单是按「常见命令」写的，没有逐个问「这个参数能不能改变套件范围」。

## 闭环选择与理由

回归测试 `ISS-063 …`（tests/chg014-review-fixes.test.ts）。

## 打开态复现探针

- probe_exit_code: 0
- probe_recorded_at: 2026-09-01T08:15:47.284Z
- probe_tree_hash: 72240280fd123d441c9bf869408a3b4a434a4ed0
- probe_result: vulnerable


Probe exit 0: allowedTestCommandReason returns null for all three commands under profile python-cli. Also observed accepted: 'python -m pytest -q -p myplugin', 'npx vitest run --reporter=./fake-reporter.js', 'node --test --test-reporter=./fake.js --test-reporter-destination=keel/evidence/junit.xml'. Code: tools/gate/testcmd.ts PYTHON_FLAGS (line 37), PYTHON_VALUE_FLAGS (line 60), checkArgs (line 115).
