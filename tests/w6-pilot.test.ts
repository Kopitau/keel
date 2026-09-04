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
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  ciWorkflowGaps,
  collectBypassFindings,
  isForceUpdate,
  parsePrePushLine,
} from "../tools/gate/bypass.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { CHECK_IDS, formatReview, reviewMentionsAllIds } from "../tools/gate/review.ts";
import { runHook } from "../tools/gate/hook.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

test("REQ-017 C-105 force-update is when remote is not an ancestor", () => {
  const zero = "0".repeat(40);
  const a = "a".repeat(40);
  const b = "b".repeat(40);
  assert.equal(isForceUpdate(zero, a, false), false);
  assert.equal(isForceUpdate(a, zero, false), false);
  assert.equal(isForceUpdate(a, b, true), false);
  assert.equal(isForceUpdate(a, b, false), true);
  const parsed = parsePrePushLine(`refs/heads/master ${b} refs/heads/master ${a}`);
  assert.equal(parsed?.localSha, b);
  assert.equal(parsed?.remoteSha, a);
});

test("REQ-017/AC-5 C-105 Keel-Precommit skipped is a bypass finding", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-w6-bypass-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(dir, "AGENTS.md"), "# x\n", "utf8");
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "w6@example.com"]);
  git(dir, ["config", "user.name", "w6"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "first\n\nKeel-Precommit: skipped\n"]);
  const ctx = makeCtx(dir);
  const findings = collectBypassFindings(ctx);
  assert.ok(findings.some((f) => f.code === "no-verify"), JSON.stringify(findings));
  const chk = runCheck(ctx, ["--quick"]);
  assert.match(chk.stdout, /X-bypass/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017/AC-4 [proxy:F24 GitHub Actions six-grid run evidence not yet recorded] local workflow dropped verify is a gap", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-w6-ci-"));
  mkdirSync(join(dir, ".github", "workflows"), { recursive: true });
  writeFileSync(join(dir, ".github", "workflows", "gate.yml"), "name: x\nrun: echo hi\n", "utf8");
  const gaps = ciWorkflowGaps(dir);
  assert.ok(gaps.some((g) => /verify/.test(g)), gaps.join(";"));
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017/AC-5 C-105 tests/ missing alongside a test script is a gap", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-w6-tests-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }), "utf8");
  writeFileSync(join(dir, "AGENTS.md"), "# x\n", "utf8");
  const findings = collectBypassFindings(makeCtx(dir));
  assert.ok(findings.some((f) => f.code === "tests-dir"), JSON.stringify(findings));
  rmSync(dir, { recursive: true, force: true });
});

// DEC-175 / requirements v4 split the locally testable workflow contract (AC-3)
// from the real six-grid GitHub run (AC-4). The negative test above remains an
// explicit proxy for AC-4 until the required run evidence exists.
test("REQ-017/AC-3 this repo CI workflow declares check, verify and the OS matrix", () => {
  assert.deepEqual(ciWorkflowGaps(repo), []);
});

test("REQ-017 C-105 review inventory lists every check id", () => {
  const text = formatReview(makeCtx(repo));
  assert.deepEqual(reviewMentionsAllIds(text), []);
  // CHG-011 (DEC-183): eight checks. Adding one needs a DEC.
  assert.equal(CHECK_IDS.length, 8);
});

test("REQ-017 W6 annual review and F17 summary exist", () => {
  const review = readFileSync(join(repo, "keel", "features", "f17-gate", "gate-review-2026.md"), "utf8");
  assert.deepEqual(reviewMentionsAllIds(review), []);
  assert.match(review, /C-105/);
  const summary = readFileSync(join(repo, "keel", "features", "f17-gate", "summary.md"), "utf8");
  for (const h of ["做了什么 / 为什么", "技术路线说明", "关键决策与被否方案", "测试与证据指针", "遗留债务与已知限制"]) {
    assert.ok(summary.includes(`## ${h}`), h);
  }
  const cal = readFileSync(
    join(repo, "keel", "features", "f20-context-budget", "calibration-w6.md"),
    "utf8",
  );
  assert.match(cal, /KEEP/);
  assert.match(cal, /10240|10KB|10 KiB|10KiB/);
});

test("REQ-017 pre-push hook reminder is non-blocking", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-w6-push-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const refs = join(dir, "refs.txt");
  writeFileSync(
    refs,
    `refs/heads/master ${"b".repeat(40)} refs/heads/master ${"a".repeat(40)}\n`,
    "utf8",
  );
  const ctx = makeCtx(dir);
  const r = runHook(ctx, ["pre-push", refs]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /force-push reminder|no force-push/);
  rmSync(dir, { recursive: true, force: true });
});
