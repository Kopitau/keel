// CHG-011 / REQ-027: one plan-level review loop per plan, two markdown products,
// G-done reads the disposition. Black-box through gate loop / gate check.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { gitWriteTree } from "../tools/gate/git.ts";
import {
  completionReviewGaps,
  completionReviewWarnings,
  emptyLoop,
  packBodyHash,
  readLoopState,
  recordLoopEvent,
  runLoop,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

function fixture(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg011-review-${tag}-`));
  for (const d of ["features", "review", "plan", "requirements", "issues", "templates"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel", enforcement_tier: "local" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "v1.md"), "# r\n\n## 未决问题\n", "utf8");
  writeFileSync(
    join(root, "keel", "templates", "ISS.md"),
    readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"),
    "utf8",
  );
  writeFileSync(join(root, ".gitignore"), "keel/review/pack.json\nkeel/evidence/*.json\n", "utf8");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "t"]);
  git(root, ["config", "user.email", "t@t.t"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

/** A loop state the way gate loop leaves it: front matter plus the history rows G-done reads back (ISS-056). */
function loopState(root: string, extra: { [k: string]: unknown }): void {
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(root, "keel", "review", "pack.json"), body, "utf8");
  const ctx = makeCtx(root);
  const st = {
    ...emptyLoop("codex", "claude-code"),
    plan: "overview-v1.md",
    pack_hash: hash,
    tree_hash: gitWriteTree(ctx),
    ...extra,
  } as ReturnType<typeof emptyLoop>;
  writeLoopState(ctx, st);
  recordLoopEvent(ctx, { ...st, round: 0 }, "pack", `plan=overview-v1.md base=HEAD lens=requirements files=1 pack=${hash.slice(0, 12)}`);
  if (st.status === "passed") recordLoopEvent(ctx, st, "verdict", "reviewer=claude-code still_open=- → passed");
}

test("REQ-027/AC-10 G-done reads the disposition: passed → PASS, repairing → WARN, fused → FAIL", () => {
  const root = fixture("verdicts");
  const ctx = makeCtx(root);
  loopState(root, { status: "passed", round: 1 });
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^PASS/);
  loopState(root, { status: "repairing", round: 1, blocking_iss: ["ISS-001"] });
  const amber = runCheck(ctx, []);
  assert.match(line(amber.stdout, "G-done"), /^WARN.*repairing/);
  assert.equal(amber.code, 0, amber.stdout);
  loopState(root, { status: "fused", round: 3, blocking_iss: ["ISS-001"] });
  const red = runCheck(ctx, []);
  assert.match(line(red.stdout, "G-done"), /^FAIL.*fused/);
  assert.equal(red.code, 1);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-10 without a disposition G-done passes while a feature is still in progress and fails once every active feature has a summary", () => {
  const root = fixture("progress");
  const ctx = makeCtx(root);
  mkdirSync(join(root, "keel", "features", "f01-x"), { recursive: true });
  writeFileSync(join(root, "keel", "features", "f01-x", "worklog.md"), "# w\n", "utf8");
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^PASS.*in progress/);
  assert.deepEqual(completionReviewGaps(ctx), []);
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# done\n", "utf8");
  const gaps = completionReviewGaps(ctx);
  assert.ok(gaps.some((g) => /review has not run/.test(g)), gaps.join("; "));
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-1 a single finished feature does not make the review due; the whole plan does", () => {
  const root = fixture("trigger");
  const ctx = makeCtx(root);
  for (const f of ["f01-x", "f02-y"]) {
    mkdirSync(join(root, "keel", "features", f, "plan"), { recursive: true });
    writeFileSync(join(root, "keel", "features", f, "plan", "v1.md"), "---\nreq: [REQ-001]\n---\n# p\n", "utf8");
  }
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# a\n", "utf8");
  assert.deepEqual(completionReviewGaps(ctx), [], "one finished feature must not demand a review");
  writeFileSync(join(root, "keel", "features", "f02-y", "summary.md"), "# b\n", "utf8");
  assert.ok(completionReviewGaps(ctx).some((g) => /REQ-027/.test(g)));
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-10 a full loop leaves only findings.md and disposition.md as review records, plus the hashed pack input", () => {
  const root = fixture("loop");
  const ctx = makeCtx(root);
  writeFileSync(
    join(root, "probe.js"),
    "const { existsSync } = require('node:fs');\nprocess.exit(existsSync('fixed.flag') ? 1 : 0);\n",
    "utf8",
  );
  writeFileSync(join(root, "src.txt"), "changed\n", "utf8");
  const findings = join(root, "findings.json");
  writeFileSync(
    findings,
    JSON.stringify([
      { title: "hole", blocking: true, repro: "node probe.js", impact: "gate bypass" },
      { title: "nit", blocking: false, repro: "" },
    ]),
    "utf8",
  );
  const packed = runLoop(ctx, ["pack", "--base", "HEAD", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  const ingested = runLoop(ctx, ["ingest", findings, "--reviewer", "claude-code"]);
  assert.equal(ingested.code, 0, ingested.stdout + ingested.stderr);
  assert.match(ingested.stdout, /filed iss=ISS-\d+.*status=repairing/);
  const found = readFileSync(join(root, "keel", "review", "findings.md"), "utf8");
  assert.match(found, /blocking → ISS-\d+：hole/);
  assert.match(found, /待办（advisory）：nit/);
  assert.equal(readLoopState(ctx)?.status, "repairing");
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^WARN/);

  writeFileSync(join(root, "fixed.flag"), "fixed\n", "utf8");
  const cleared = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(cleared.code, 0, cleared.stdout + cleared.stderr);
  assert.equal(readLoopState(ctx)?.status, "passed");
  const disposition = readFileSync(join(root, "keel", "review", "disposition.md"), "utf8");
  for (const event of ["| pack |", "| ingest |", "| clear |", "| verdict |"]) assert.ok(disposition.includes(event), event);
  assert.match(disposition, /exit=1 refused/);
  assert.match(runLoop(ctx, ["status"]).stdout, /review loop: passed plan=overview-v1\.md/);

  const files = readdirSync(join(root, "keel", "review")).sort();
  assert.deepEqual(files, ["disposition.md", "findings.md", "pack.json"]);
  for (const stale of ["state.json", "rounds.json", "fuse-report.md"]) {
    assert.equal(existsSync(join(root, "keel", "review", stale)), false, stale);
  }
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-6 the third uncleared round fuses; the report lands in disposition.md and G-done fails", () => {
  const root = fixture("fuse");
  const ctx = makeCtx(root);
  writeFileSync(
    join(root, "keel", "issues", "ISS-001.md"),
    "---\nid: ISS-001\nstatus: open\nfingerprint: x\n---\n# t\n\n复现命令：\n\n```\nexit 0\n```\n",
    "utf8",
  );
  loopState(root, { status: "repairing", blocking_iss: ["ISS-001"], iss_fp: { "ISS-001": "x" } });
  let last = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
  last = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
  last = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(last.code, 1);
  assert.match(last.stdout + last.stderr, /fused/);
  assert.match(readFileSync(join(root, "keel", "review", "disposition.md"), "utf8"), /## 熔断/);
  assert.equal(existsSync(join(root, "keel", "review", "fuse-report.md")), false);
  assert.match(line(runCheck(ctx, []).stdout, "G-done"), /^FAIL.*fused/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-10 a passed review whose tree moved is a WARN, never silently green", () => {
  const root = fixture("moved");
  const ctx = makeCtx(root);
  loopState(root, { status: "passed", round: 1 });
  assert.deepEqual(completionReviewWarnings(ctx), []);
  writeFileSync(join(root, "later.txt"), "edit after review\n", "utf8");
  const warnings = completionReviewWarnings(ctx);
  assert.ok(warnings.some((w) => /tree is now/.test(w)), warnings.join("; "));
  const chk = runCheck(ctx, []);
  assert.match(line(chk.stdout, "G-done"), /^WARN.*tree is now/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-007/AC-6 k-impl and k-review say a finished feature moves on; the review loop runs once per plan", () => {
  const impl = readFileSync(join(repo, ".agents", "skills", "k-impl", "SKILL.md"), "utf8");
  assert.match(impl, /once per plan/);
  assert.doesNotMatch(impl, /Claiming done starts the review loop/);
  const review = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(review, /disposition\.md/);
  assert.match(review, /findings\.md/);
  assert.match(review, /finished feature does not trigger a review/);
});

test("REQ-027/AC-2 a pack taken since a base lists deleted files by name only and keeps the five keys", () => {
  const root = fixture("basediff");
  const ctx = makeCtx(root);
  writeFileSync(join(root, "gone.txt"), "secret body that must not travel\n", "utf8");
  writeFileSync(join(root, "kept.txt"), "one\n", "utf8");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const base = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
  rmSync(join(root, "gone.txt"));
  writeFileSync(join(root, "kept.txt"), "one\ntwo\n", "utf8");
  const packed = runLoop(ctx, ["pack", "--base", base, "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  const pack = JSON.parse(readFileSync(join(root, "keel", "review", "pack.json"), "utf8")) as { [k: string]: string };
  assert.deepEqual(Object.keys(pack).sort(), ["diff", "evidence", "plan", "reqs", "worklog_summary"]);
  assert.match(pack.diff ?? "", /\+two/);
  assert.match(pack.diff ?? "", /# deleted files \(bodies omitted\):\n- gone\.txt/);
  assert.doesNotMatch(pack.diff ?? "", /secret body/);
  assert.match(pack.plan ?? "", /接口与耦合/);
  assert.equal(readLoopState(ctx)?.base, base);
  rmSync(root, { recursive: true, force: true });
});
