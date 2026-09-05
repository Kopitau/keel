// CHG-015 / DEC-191: the reviewer answers three questions (standards & maintainability,
// implemented, functional tests written and passing); a blocking finding's evidence is a
// failing test or a criterion with no black-box test — never a hand-made probe.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { readEvidence } from "../tools/gate/evidence.ts";
import { acCoverage, fileFindings, looksLikeTestFailure, recordClear, validateFindings, emptyLoop, writeLoopState, readLoopState } from "../tools/gate/reviewloop.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { scrubHookGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function project(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg015-${tag}-`));
  const w = (rel: string, text: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text, "utf8");
  };
  w("keel/config.json", JSON.stringify({ records_dir: "keel", enforcement_tier: "local", profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test" } } }) + "\n");
  w("AGENTS.md", "# k\n");
  w("CLAUDE.md", "@AGENTS.md\n");
  w("keel/templates/ISS.md", readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"));
  w("keel/requirements/INDEX.md", "- current: v1.md\n");
  w("keel/requirements/v1.md", "# r\n\n## REQ-001 登录\n\n- **acceptance**:\n  - Given a When b Then c\n  - Given d When e Then f\n  - Given g When h Then i\n");
  w("keel/features/f01-login/plan/v1.md", "---\nfeature: F1\nreq: [REQ-001]\nblocked_by: []\n---\n# F1\n");
  w("keel/features/f01-login/worklog.md", "# F1\n");
  w("keel/review/.gitkeep", "");
  w("keel/issues/.gitkeep", "");
  // AC-1 has a black-box test; AC-2 has none.
  w("tests/login.test.js", "const { test } = require('node:test');\ntest('REQ-001/AC-1 login works', () => {});\n");
  w(".gitignore", "keel/evidence/*.json\nkeel/evidence/*.xml\nkeel/review/pack.json\n");
  const g = (args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: { ...scrubHookGitEnv(process.env), KEEL_ANCESTRY: "0" } });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  };
  g(["init", "-q"]);
  g(["config", "user.name", "h"]);
  g(["config", "user.email", "h@x"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "base"]);
  return root;
}

function issues(root: string): string[] {
  return readdirSync(join(root, "keel", "issues")).filter((n) => n.startsWith("ISS-")).sort();
}

test("REQ-027/AC-4 a blocking finding opens an ISS only when its check command fails as a test on this tree", () => {
  const root = project("failing");
  const ctx = makeCtx(root);
  writeFileSync(join(root, "tests", "gap.test.js"), "const { test } = require('node:test');\ntest('REQ-001/AC-2 second login path', () => { throw new Error('gap'); });\n", "utf8");
  const out = fileFindings(ctx, [
    { title: "AC-2 not implemented", blocking: true, repro: "node --test tests/gap.test.js", impact: "second path missing", ac: "REQ-001/AC-2", kind: "test-failing" },
  ]);
  assert.equal(out.iss.length, 1, JSON.stringify(out));
  const body = readFileSync(join(root, "keel", "issues", issues(root)[0] ?? ""), "utf8");
  assert.match(body, /probe_result: failing-test/);
  assert.match(body, /probe_exit_code: 1/);
  assert.match(body, /ac: "REQ-001\/AC-2"/);
  assert.match(body, /node --test tests\/gap\.test\.js/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-4 a check that passes, or fails without a test failure, is 待核实 — no ISS", () => {
  const root = project("deferred");
  const ctx = makeCtx(root);
  const out = fileFindings(ctx, [
    { title: "passes already", blocking: true, repro: "node --test tests/login.test.js", impact: "x" },
    { title: "script exit only", blocking: true, repro: "node -e \"process.exit(3)\"", impact: "x" },
  ]);
  assert.deepEqual(out.iss, []);
  assert.equal(out.deferred.length, 2, JSON.stringify(out));
  assert.ok(out.notes.some((n) => /检查命令在本树上通过/.test(n)), out.notes.join("\n"));
  assert.ok(out.notes.some((n) => /没有测试失败/.test(n)), out.notes.join("\n"));
  assert.deepEqual(issues(root), []);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-4 a criterion with no black-box test is evidence by itself; a covered one is not", () => {
  const root = project("ac-only");
  const ctx = makeCtx(root);
  assert.equal(acCoverage(ctx, "REQ-001/AC-1"), "covered");
  assert.equal(acCoverage(ctx, "REQ-001/AC-2"), "missing");
  assert.equal(acCoverage(ctx, "REQ-009/AC-1"), "unknown");
  const out = fileFindings(ctx, [
    { title: "AC-2 has no test", blocking: true, repro: "", impact: "untested path", ac: "REQ-001/AC-2", kind: "test-missing" },
    { title: "AC-1 claimed untested", blocking: true, repro: "", impact: "x", ac: "REQ-001/AC-1" },
  ]);
  assert.equal(out.iss.length, 1, JSON.stringify(out));
  assert.equal(out.deferred.length, 1);
  assert.ok(out.notes.some((n) => /已有黑盒测试/.test(n)), out.notes.join("\n"));
  const body = readFileSync(join(root, "keel", "issues", issues(root)[0] ?? ""), "utf8");
  assert.match(body, /probe_result: test-missing/);
  assert.match(body, /probe_check: ac=REQ-001\/AC-2/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-5 clear passes when the failing test now passes and the untested criterion gained a black-box test", () => {
  const root = project("clear");
  const ctx = makeCtx(root);
  writeFileSync(join(root, "tests", "gap.test.js"), "const { test } = require('node:test');\ntest('REQ-001/AC-2 second login path', () => { throw new Error('gap'); });\n", "utf8");
  const out = fileFindings(ctx, [
    { title: "failing", blocking: true, repro: "node --test tests/gap.test.js", impact: "x" },
    { title: "untested", blocking: true, repro: "", impact: "x", ac: "REQ-001/AC-3" },
  ]);
  assert.equal(out.iss.length, 2, JSON.stringify(out));
  writeLoopState(ctx, { ...emptyLoop("codex", "claude-code"), status: "repairing", blocking_iss: out.iss, pack_hash: "p", iss_fp: out.fps });
  const still = recordClear(ctx, "codex", "claude-code");
  assert.equal(still.code, 1, still.stdout + still.stderr);
  assert.match(readFileSync(join(root, "keel", "review", "disposition.md"), "utf8"), /still failing/);
  // repair: the failing test passes, and AC-3 gains a black-box test
  writeFileSync(join(root, "tests", "gap.test.js"), "const { test } = require('node:test');\ntest('REQ-001/AC-2 second login path', () => {});\n", "utf8");
  writeFileSync(join(root, "tests", "third.test.js"), "const { test } = require('node:test');\ntest('REQ-001/AC-3 third path', () => {});\n", "utf8");
  const cleared = recordClear(ctx, "codex", "claude-code");
  assert.equal(cleared.code, 0, cleared.stdout + cleared.stderr);
  assert.equal(readLoopState(ctx)?.status, "passed");
  const disposition = readFileSync(join(root, "keel", "review", "disposition.md"), "utf8");
  assert.match(disposition, /exit=0 passed/);
  assert.match(disposition, /trace REQ-001\/AC-3` exit=0 passed/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-12 findings may carry ac and kind; a malformed ac is a shape gap", () => {
  const ok = validateFindings([{ title: "t", blocking: true, repro: "x", impact: "i", ac: "REQ-001/AC-2", kind: "unimplemented" }]);
  assert.ok(ok.ok);
  if (ok.ok) assert.equal(ok.findings[0]?.ac, "REQ-001/AC-2");
  const bad = validateFindings([{ title: "t", blocking: true, ac: "AC-2" }]);
  assert.ok(!bad.ok);
  if (!bad.ok) assert.ok(bad.errors.some((e) => /ac must look like REQ-nnn\/AC-i/.test(e)), bad.errors.join("\n"));
});

test("DEC-191 test-failure detection recognises node:test, pytest, vitest, jest and go output, not a bare exit", () => {
  for (const out of ["not ok 1 - x", "# fail 2", "ℹ fail 1", "FAILED tests/t.py::a\n1 failed, 2 passed", "FAIL tests/a.test.ts > b\nTests  1 failed | 3 passed", "Tests:       1 failed, 2 total", "--- FAIL: TestX"]) {
    assert.equal(looksLikeTestFailure(out), true, out);
  }
  for (const out of ["", "done", "exit code 3", "ok 1 - x\n# pass 1\n# fail 0", "3 passed"]) {
    assert.equal(looksLikeTestFailure(out), false, out);
  }
});

test("REQ-006/AC-10 verify.json carries the per-feature coverage lines the reviewer reads", () => {
  const root = project("evidence");
  const ctx = makeCtx(root);
  const r = runVerify(ctx);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const ev = readEvidence(ctx);
  assert.ok(Array.isArray(ev?.feature_coverage), JSON.stringify(ev));
  assert.ok((ev?.feature_coverage ?? []).some((l) => /REQ-001/.test(l) && /缺 2（AC-2 AC-3）/.test(l)), (ev?.feature_coverage ?? []).join("\n"));
  rmSync(root, { recursive: true, force: true });
});

test("REQ-028/AC-3 the checklist lists what the reviewer does not do, and the old lists are gone", () => {
  const checklist = readFileSync(join(repo, "keel", "review", "checklist.md"), "utf8");
  for (const item of ["只检查与需求及实际风险相关", "不写攻击探针", "不做突变验证", "不改代码"]) assert.ok(checklist.includes(item), item);
  assert.equal(existsSync(join(repo, "keel", "review", "robustness.md")), false);
  assert.equal(existsSync(join(repo, "keel", "review", "requirements.md")), false);
});
