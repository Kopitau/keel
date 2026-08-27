import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { isAllowedTestCommand } from "../tools/gate/testcmd.ts";
import { EXEC_REQUIRED, execModeGaps, gitIndexMode } from "../tools/gate/execmode.ts";
import { ciWorkflowGaps } from "../tools/gate/bypass.ts";
import { claimedReqs } from "../tools/gate/trace.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

function skeleton(dir: string): void {
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "features"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n|---|---|\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
}

test("REQ-017 ISS-001 git --version is not an allowlisted test_command", () => {
  assert.equal(isAllowedTestCommand("git --version", "keel-gate"), false);
  assert.equal(isAllowedTestCommand("node --test", "keel-gate"), true);
  assert.equal(isAllowedTestCommand("node --test tests/ok.test.js", "keel-gate"), false);
  assert.equal(isAllowedTestCommand("node --test tests/fake/x.test.ts", "keel-gate"), false);
  assert.equal(isAllowedTestCommand("node --test tests", "keel-gate"), false);
});

test("REQ-017 ISS-001 tampered test_command makes verify FAIL", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p0-001-"));
  skeleton(dir);
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      profiles: { active: ["keel-gate"], "keel-gate": { test_command: "git --version" } },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "tests", "ok.test.js"),
    "const { test } = require('node:test');\ntest('ok', () => { throw new Error('red'); });\n",
    "utf8",
  );
  const r = runVerify(makeCtx(dir));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /allowlisted|ISS-001/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 ISS-002 missing evidence with summary is FAIL not skip", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p0-002-"));
  skeleton(dir);
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  mkdirSync(join(dir, "keel", "features", "f17-gate", "plan"), { recursive: true });
  writeFileSync(join(dir, "keel", "features", "f17-gate", "summary.md"), "# s\n", "utf8");
  writeFileSync(
    join(dir, "keel", "features", "f17-gate", "plan", "v1.md"),
    "---\nreq: REQ-001\n---\n# p\n",
    "utf8",
  );
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p0@example.com"]);
  git(dir, ["config", "user.name", "p0"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "s"]);
  const r = runCheck(makeCtx(dir), []);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL G-done/);
  assert.match(r.stdout, /FAIL X-evidence/);
  assert.doesNotMatch(r.stdout, /SKIP G-done/);
  assert.doesNotMatch(r.stdout, /SKIP X-evidence/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 ISS-003 claimed REQ with no tests/ hit fails X-trace", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p0-003-"));
  skeleton(dir);
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  mkdirSync(join(dir, "keel", "features", "f01-x", "plan"), { recursive: true });
  writeFileSync(join(dir, "keel", "features", "f01-x", "summary.md"), "# done\n", "utf8");
  writeFileSync(
    join(dir, "keel", "features", "f01-x", "plan", "v1.md"),
    "---\nreq: REQ-001\n---\n# p\n",
    "utf8",
  );
  writeFileSync(join(dir, "tests", "ok.test.js"), "test('no req id', () => {});\n", "utf8");
  const ctx = makeCtx(dir);
  assert.deepEqual(claimedReqs(ctx), ["REQ-001"]);
  const r = runCheck(ctx, ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL X-trace/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 ISS-004 index mode 100644 on a hook fails X-hooks", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p0-004-"));
  skeleton(dir);
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  mkdirSync(join(dir, ".githooks"), { recursive: true });
  writeFileSync(join(dir, ".githooks", "pre-commit"), "#!/bin/sh\nexit 0\n", "utf8");
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p0@example.com"]);
  git(dir, ["config", "user.name", "p0"]);
  git(dir, ["config", "core.hooksPath", ".githooks"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "hooks"]);
  const ctx = makeCtx(dir);
  assert.equal(gitIndexMode(ctx, ".githooks/pre-commit"), "100644");
  const r = runCheck(ctx, []);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL X-hooks/);
  assert.match(r.stdout, /100644/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 ISS-004 this repo required scripts are 100755", () => {
  const ctx = makeCtx(repo);
  assert.deepEqual(execModeGaps(ctx), []);
  for (const rel of EXEC_REQUIRED) {
    assert.equal(gitIndexMode(ctx, rel), "100755", rel);
  }
});

test("REQ-017/AC-5 ISS-005 bare gate-warn password still FAILs", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p0-005-"));
  skeleton(dir);
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  mkdirSync(join(dir, "keel", "features", "f17-gate"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "features", "f17-gate", "worklog.md"),
    "gate-warn: X-hooks\n",
    "utf8",
  );
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p0@example.com"]);
  git(dir, ["config", "user.name", "p0"]);
  git(dir, ["config", "core.hooksPath", ""]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "w"]);
  const r = runCheck(makeCtx(dir), []);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL X-hooks/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 ISS-001 CI has independent node --test and verify before check", () => {
  assert.deepEqual(ciWorkflowGaps(repo), []);
  const yml = readFileSync(join(repo, ".github", "workflows", "gate.yml"), "utf8");
  assert.match(yml, /run:\s*node --test/);
  assert.ok(yml.indexOf("gate.ts verify") < yml.indexOf("name: check"));
});
