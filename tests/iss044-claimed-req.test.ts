// ISS-044: X-trace decides "claimed done" from `req:` in a feature plan's front
// matter, but neither the feature-plan template nor `gate new feature` ever wrote
// that line. A consumer project could claim a feature done and X-trace answered
// "no claimed-done features" — C-32 never bound. These are the regression guards.
import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runNew } from "../tools/gate/new.ts";
import { claimedReqs, claimedWithoutReq } from "../tools/gate/trace.ts";
import { scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split(/\n/).find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

/** Minimal project: requirements with REQ-001 (one AC) and a plan; no features yet. */
function project(tag: string, opts: { templates?: boolean } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-iss044-${tag}-`));
  for (const d of ["requirements", "plan", "features", "issues", "decisions"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  mkdirSync(join(dir, "tests"), { recursive: true });
  if (opts.templates) cpSync(join(repo, "keel", "templates"), join(dir, "keel", "templates"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n\n## REQ-002 Y\n\n- **acceptance**:\n  - Given d When e Then f\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  return dir;
}

function feature(dir: string, name: string, plan: string | null, summary: boolean): void {
  const fdir = join(dir, "keel", "features", name);
  mkdirSync(fdir, { recursive: true });
  if (plan !== null) {
    mkdirSync(join(fdir, "plan"), { recursive: true });
    writeFileSync(join(fdir, "plan", "v1.md"), plan, "utf8");
  }
  if (summary) writeFileSync(join(fdir, "summary.md"), "# done\n", "utf8");
}

test("ISS-044 gate new feature scaffolds a plan whose front matter carries req:", () => {
  const dir = project("scaffold", { templates: true });
  const r = runNew(makeCtx(dir), ["feature", "demo"]);
  assert.equal(r.code, 0, r.stderr);
  const plan = readFileSync(join(dir, "keel", "features", "f01-demo", "plan", "v1.md"), "utf8");
  assert.match(plan, /^req:\s*\[?REQ-\d{3}/m, plan.slice(0, 200));
  // the template itself must carry it too — consumer projects copy the template, not new.ts
  const tpl = readFileSync(join(repo, "keel", "templates", "feature-plan.md"), "utf8");
  assert.match(tpl, /^req:\s*\[?REQ-000/m);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 gate new feature writes req: even when the template is missing", () => {
  const dir = project("no-template");
  const r = runNew(makeCtx(dir), ["feature", "demo"]);
  assert.equal(r.code, 0, r.stderr);
  const plan = readFileSync(join(dir, "keel", "features", "f01-demo", "plan", "v1.md"), "utf8");
  assert.match(plan, /^req:/m, plan);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 a claimed feature whose plan has no req: fails X-trace instead of passing as no-claimed-features", () => {
  const dir = project("noreq");
  feature(dir, "f01-x", "---\nfeature: F1\nslug: f01-x\n---\n# p\n", true);
  assert.deepEqual(claimedWithoutReq(makeCtx(dir)), ["f01-x"]);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  const l = line(r.stdout, "X-trace");
  assert.match(l, /^FAIL/, l);
  assert.match(l, /f01-x/);
  assert.match(l, /req:/);
  assert.doesNotMatch(l, /no claimed-done features/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 a claimed feature with no plan directory at all is the same failure", () => {
  const dir = project("noplan");
  feature(dir, "f02-y", null, true);
  assert.deepEqual(claimedWithoutReq(makeCtx(dir)), ["f02-y"]);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.match(line(r.stdout, "X-trace"), /^FAIL.*f02-y/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 an unclaimed feature without req: is left alone", () => {
  const dir = project("inflight");
  feature(dir, "f01-x", "---\nfeature: F1\n---\n# p\n", false);
  assert.deepEqual(claimedWithoutReq(makeCtx(dir)), []);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.match(line(r.stdout, "X-trace"), /^PASS/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 claimedReqs reads a list, a single value, and every plan version", () => {
  const dir = project("list");
  feature(dir, "f01-x", "---\nreq: [REQ-001, REQ-002]\n---\n# p\n", true);
  feature(dir, "f02-y", "---\nreq: REQ-001\n---\n# p\n", true);
  assert.deepEqual(claimedReqs(makeCtx(dir)), ["REQ-001", "REQ-002"]);
  assert.deepEqual(claimedWithoutReq(makeCtx(dir)), []);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-044 the template placeholder req: [REQ-000] left in a claimed plan is an uncovered REQ, not a pass", () => {
  const dir = project("placeholder");
  feature(dir, "f01-x", "---\nreq: [REQ-000]\n---\n# p\n", true);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  const l = line(r.stdout, "X-trace");
  assert.match(l, /^FAIL/, l);
  assert.match(l, /REQ-000/);
  rmSync(dir, { recursive: true, force: true });
});

// Positive control: this repo's 24 hand-written plans all carry req:.
test("ISS-044 this repo has no claimed feature without req:", () => {
  assert.deepEqual(claimedWithoutReq(makeCtx(repo)), []);
});
