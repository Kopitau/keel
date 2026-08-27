// DEC-169 frontier: feature plans declare `blocked_by:`; `gate status` prints what
// can start now (frontier) and what is blocked; G-plan rejects dangling ids and
// cycles; `gate worktree add` warns on a blocked feature but does not refuse
// (DEC-155: worktree is a recommendation). Borrowed from wayfinder (RES-904 §1).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { computeFrontier } from "../tools/gate/frontier.ts";
import { runStatus } from "../tools/gate/status.ts";
import { runWorktree } from "../tools/gate/worktree.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split(/\n/).find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

function project(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-dec169-${tag}-`));
  for (const d of ["requirements", "plan", "features", "issues", "decisions"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n",
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

function feature(
  dir: string,
  n: number,
  opts: { blockedBy?: string[]; done?: boolean; claimed?: boolean; noBlockedByLine?: boolean } = {},
): void {
  const name = `f${String(n).padStart(2, "0")}-x${n}`;
  const fdir = join(dir, "keel", "features", name);
  mkdirSync(join(fdir, "plan"), { recursive: true });
  const blocked = opts.noBlockedByLine ? "" : `blocked_by: [${(opts.blockedBy ?? []).join(", ")}]\n`;
  writeFileSync(
    join(fdir, "plan", "v1.md"),
    `---\nfeature: F${n}\nslug: ${name}\nreq: [REQ-001]\n${blocked}---\n# p\n`,
    "utf8",
  );
  if (opts.done) writeFileSync(join(fdir, "summary.md"), "# done\n", "utf8");
  if (opts.claimed) writeFileSync(join(fdir, "claim.json"), JSON.stringify({ feature: `F${n}` }), "utf8");
}

function fiveFeatures(dir: string): void {
  feature(dir, 1, { done: true });
  feature(dir, 2, { blockedBy: ["F1"] });
  feature(dir, 3, { blockedBy: ["F2"] });
  feature(dir, 4, { claimed: true });
  feature(dir, 5, { noBlockedByLine: true });
}

test("DEC-169 computeFrontier: on the frontier only when every blocker has a summary and the feature is unclaimed", () => {
  const dir = project("compute");
  fiveFeatures(dir);
  const f = computeFrontier(makeCtx(dir));
  assert.deepEqual(f.frontier, ["F2", "F5"]);
  assert.deepEqual(f.blocked, [{ id: "F3", by: ["F2"] }]);
  assert.deepEqual(f.claimed, ["F4"]);
  assert.deepEqual(f.done, ["F1"]);
  assert.deepEqual(f.problems, []);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-169 gate status prints frontier and blocked lines", () => {
  const dir = project("status");
  fiveFeatures(dir);
  const st = runStatus(makeCtx(dir));
  assert.equal(st.code, 0, st.stderr);
  assert.match(st.stdout, /^frontier: F2 F5$/m, st.stdout);
  assert.match(st.stdout, /^blocked: F3 \(by F2\)$/m, st.stdout);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-169 gate status prints the proxy AC count so the DEC-168 review threshold has a reader", () => {
  const dir = project("proxy");
  writeFileSync(join(dir, "tests", "a.test.js"), "test('REQ-001/AC-1 [proxy:F2] stand-in', () => {});\n", "utf8");
  assert.match(runStatus(makeCtx(dir)).stdout, /^proxy_acs: 1$/m);
  writeFileSync(join(dir, "tests", "a.test.js"), "test('REQ-001/AC-1 real', () => {});\n", "utf8");
  assert.match(runStatus(makeCtx(dir)).stdout, /^proxy_acs: 0$/m);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-169 G-plan fails on a blocked_by that names no feature", () => {
  const dir = project("dangling");
  feature(dir, 1, { blockedBy: ["F9"] });
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(line(r.stdout, "G-plan"), /^FAIL.*F9/);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-169 G-plan fails on a blocked_by cycle or self-reference", () => {
  const dir = project("cycle");
  feature(dir, 1, { blockedBy: ["F2"] });
  feature(dir, 2, { blockedBy: ["F1"] });
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.match(line(r.stdout, "G-plan"), /^FAIL.*cycle/i);
  const self = project("self");
  feature(self, 1, { blockedBy: ["F1"] });
  assert.match(line(runCheck(makeCtx(self), ["--quick"]).stdout, "G-plan"), /^FAIL.*(cycle|itself)/i);
  rmSync(dir, { recursive: true, force: true });
  rmSync(self, { recursive: true, force: true });
});

test("DEC-169 a plan without a blocked_by line is simply unblocked, so older plans keep working", () => {
  const dir = project("legacy");
  feature(dir, 1, { noBlockedByLine: true });
  assert.deepEqual(computeFrontier(makeCtx(dir)).frontier, ["F1"]);
  assert.match(line(runCheck(makeCtx(dir), ["--quick"]).stdout, "G-plan"), /^PASS/);
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-169 worktree add on a blocked feature warns but still claims (DEC-155: worktree is advice)", () => {
  const dir = project("wt");
  feature(dir, 1, {});
  feature(dir, 2, { blockedBy: ["F1"] });
  const g = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  };
  g(["init", "-q"]);
  g(["config", "user.name", "fixture"]);
  g(["config", "user.email", "fixture@example.com"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "base"]);
  const ctx = makeCtx(dir);
  const r = runWorktree(ctx, ["add", "F2"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout + r.stderr, /WARN.*blocked by F1/, r.stdout + r.stderr);
  assert.match(r.stdout, /claimed F2/);
  runWorktree(ctx, ["rm", "F2"]);
  rmSync(dir, { recursive: true, force: true });
});

// Positive control (ISS-038 lesson): this repo's 24 plans have no blocked_by yet and must stay green.
test("DEC-169 this repo: status prints a frontier line and G-plan stays green", () => {
  const st = runStatus(makeCtx(repo));
  assert.match(st.stdout, /^frontier: /m, st.stdout);
  assert.match(st.stdout, /^proxy_acs: \d+$/m, st.stdout);
  assert.match(line(runCheck(makeCtx(repo), ["--quick"]).stdout, "G-plan"), /^PASS/);
});
