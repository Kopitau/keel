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
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { isAllowedTestCommand } from "../tools/gate/testcmd.ts";
import { acCoveredIn, claimedReqs } from "../tools/gate/trace.ts";
import { EXEC_REQUIRED } from "../tools/gate/execmode.ts";
import { formatBaseline } from "../tools/gate/testbase.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

// The four one-line REQ-017/AC-1..4 placeholders that used to sit here were
// removed under DEC-168 (C-34: ref=DEC-168, worklog f06-evidence 2026-08-26):
// their bodies did not test what the AC names promised. The black-box tests
// for those ACs live in tests/dec168-test-kinds.test.ts, w6-pilot and p0-rework.

test("REQ-017 ISS-018 narrowing test_command to one file is refused", () => {
  assert.equal(isAllowedTestCommand("node --test tests/ok.test.js", "keel-gate"), false);
  const dir = mkdtempSync(join(tmpdir(), "keel-r2-018-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  mkdirSync(join(dir, "tests", "fake"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test tests/fake/x.test.ts" } },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "tests", "fake", "x.test.ts"),
    'import { test } from "node:test";\ntest("always green", () => {});\n',
    "utf8",
  );
  const r = runVerify(makeCtx(dir));
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /allowlisted|ISS-018|full suite/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 ISS-019 hermetic verify then full check both exit 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r2-019-"));
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
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
    join(dir, "tests", "ok.test.js"),
    "const { test } = require('node:test');\ntest('ok', () => {});\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "test-baseline.json"), formatBaseline(["ok"]), "utf8");
  writeFileSync(
    join(dir, ".gitignore"),
    "keel/evidence/*.json\nkeel/evidence/*.xml\n",
    "utf8",
  );
  cpSync(join(repo, ".githooks"), join(dir, ".githooks"), { recursive: true });
  cpSync(join(repo, "tools", "gate", "gate.sh"), join(dir, "tools", "gate", "gate.sh"));
  cpSync(join(repo, "tools", "gate", "ci-trunk.sh"), join(dir, "tools", "gate", "ci-trunk.sh"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "r2@example.com"]);
  git(dir, ["config", "user.name", "r2"]);
  git(dir, ["add", "-A"]);
  git(dir, ["update-index", "--chmod=+x", "--", ...EXEC_REQUIRED]);
  git(dir, ["commit", "--no-verify", "-m", "init"]);
  git(dir, ["config", "core.hooksPath", ".githooks"]);
  const ctx = makeCtx(dir);
  const v = runVerify(ctx);
  assert.equal(v.code, 0, v.stdout + v.stderr);
  assert.match(readFileSync(join(dir, "keel", "evidence", "verify.json"), "utf8"), /"passed":/);
  const chk = runCheck(ctx, []);
  assert.equal(chk.code, 0, chk.stdout);
  assert.doesNotMatch(chk.stdout, /empty stdout_tail/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 ISS-020 one of two ACs uncovered fails X-trace", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r2-020-"));
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "features", "f01-x", "plan"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n  - Given d When e Then f\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(dir, "keel", "features", "f01-x", "summary.md"), "# done\n", "utf8");
  writeFileSync(
    join(dir, "keel", "features", "f01-x", "plan", "v1.md"),
    "---\nreq: REQ-001\n---\n# p\n",
    "utf8",
  );
  writeFileSync(
    join(dir, "tests", "one.test.js"),
    "test('REQ-001/AC-1 only', () => {});\n",
    "utf8",
  );
  const ctx = makeCtx(dir);
  assert.deepEqual(claimedReqs(ctx), ["REQ-001"]);
  assert.equal(acCoveredIn("REQ-001/AC-1 only", "REQ-001", 1), true);
  assert.equal(acCoveredIn("REQ-001/AC-1 only", "REQ-001", 2), false);
  const r = runCheck(ctx, ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL X-trace/);
  assert.match(r.stdout, /AC-2/);
  rmSync(dir, { recursive: true, force: true });
});
