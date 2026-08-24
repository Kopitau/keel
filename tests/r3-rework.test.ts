import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { EXEC_REQUIRED } from "../tools/gate/execmode.ts";
import {
  formatBaseline,
  parseTestInventory,
} from "../tools/gate/testbase.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

function skeleton(dir: string): void {
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "keel", "features", "f17-gate"), { recursive: true });
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      identities: { agents: [{ name: "keel-agent", email: "a@a.a" }], humans: [] },
      profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test" } },
      budget: { agents_md_max_lines: 150, agents_md_chain_max_bytes: 32768 },
    }),
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "v1.md"), "# r\n\n## 未决问题\n", "utf8");
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "issues", "ISS-001.md"),
    "---\nid: ISS-001\nstatus: open\n---\n# ISS-001 fixture\n",
    "utf8",
  );
}

function writeJsTests(dir: string, body: string): void {
  writeFileSync(join(dir, "tests", "ok.test.js"), body, "utf8");
}

function commitArmed(dir: string, names: string[]): void {
  writeFileSync(join(dir, "keel", "test-baseline.json"), formatBaseline(names), "utf8");
  writeFileSync(
    join(dir, ".gitignore"),
    "keel/evidence/*.json\nkeel/evidence/*.xml\n",
    "utf8",
  );
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
  cpSync(join(repo, ".githooks"), join(dir, ".githooks"), { recursive: true });
  cpSync(join(repo, "tools", "gate", "gate.sh"), join(dir, "tools", "gate", "gate.sh"));
  cpSync(join(repo, "tools", "gate", "ci-trunk.sh"), join(dir, "tools", "gate", "ci-trunk.sh"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "r3@example.com"]);
  git(dir, ["config", "user.name", "r3"]);
  git(dir, ["add", "-A"]);
  git(dir, ["update-index", "--chmod=+x", "--", ...EXEC_REQUIRED]);
  git(dir, ["commit", "--no-verify", "-m", "init"]);
  git(dir, ["config", "core.hooksPath", ".githooks"]);
}

test("REQ-006/AC-5 parseTestInventory ignores commented-out tests and counts skip", () => {
  const inv = parseTestInventory(
    readFileSync(join(repo, "tests", "fixtures", "inventory-sample.txt"), "utf8"),
  );
  assert.deepEqual(inv.names.sort(), ["live", "optional", "parked"]);
  assert.equal(inv.skipped, 2);
  assert.ok(!inv.names.includes("gone"));
});

test("REQ-006/AC-5 ISS-021 deleting a test fails full check without a C-34 citation", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r3-021-del-"));
  skeleton(dir);
  writeJsTests(
    dir,
    "const { test } = require('node:test');\ntest('keep', () => {});\ntest('drop', () => {});\n",
  );
  commitArmed(dir, ["drop", "keep"]);
  const ctx = makeCtx(dir);
  const v0 = runVerify(ctx);
  assert.equal(v0.code, 0, v0.stdout + v0.stderr);
  const ok0 = runCheck(ctx, []);
  assert.equal(ok0.code, 0, ok0.stdout);
  writeJsTests(dir, "const { test } = require('node:test');\ntest('keep', () => {});\n");
  git(dir, ["config", "core.hooksPath", ""]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "delete drop"]);
  git(dir, ["config", "core.hooksPath", ".githooks"]);
  const v1 = runVerify(ctx);
  assert.equal(v1.code, 0, v1.stdout + v1.stderr);
  const chk = runCheck(ctx, []);
  assert.equal(chk.code, 1, chk.stdout);
  assert.match(chk.stdout, /FAIL X-tests/);
  assert.match(chk.stdout, /drop|removed|C-34|baseline/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006/AC-5 ISS-021 test.skip fails check without depending on tsc", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r3-021-skip-"));
  skeleton(dir);
  writeJsTests(
    dir,
    "const { test } = require('node:test');\ntest('ok', () => {});\ntest.skip('parked', () => {});\n",
  );
  const chk = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(chk.code, 1, chk.stdout);
  assert.match(chk.stdout, /FAIL X-tests/);
  assert.match(chk.stdout, /skipped/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006/AC-5 ISS-021 deleting a test is allowed when a new worklog cites a real ISS", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r3-021-cite-"));
  skeleton(dir);
  writeJsTests(
    dir,
    "const { test } = require('node:test');\ntest('keep', () => {});\ntest('drop', () => {});\n",
  );
  commitArmed(dir, ["drop", "keep"]);
  writeJsTests(dir, "const { test } = require('node:test');\ntest('keep', () => {});\n");
  writeFileSync(join(dir, "keel", "test-baseline.json"), formatBaseline(["keep"]), "utf8");
  writeFileSync(
    join(dir, "keel", "features", "f17-gate", "worklog.md"),
    "C-34: ref=ISS-001 drop golden that duplicated keep\n",
    "utf8",
  );
  git(dir, ["add", "keel/features/f17-gate/worklog.md", "keel/test-baseline.json", "tests"]);
  const chk = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(chk.code, 0, chk.stdout);
  assert.match(chk.stdout, /PASS X-tests/);
  rmSync(dir, { recursive: true, force: true });
});
