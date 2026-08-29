// R6 field guards, after CHG-011: only the approval-identity guards survive
// (C-107 / DEC-166 — X-apr, pre-commit-apr, approve). The G-req order, gap-hunt,
// X-oss, G-research, candidates and DEC-162 guards left with their gates.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { runApprove } from "../tools/gate/approve.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { commitLooksAgentMade, detectHarness } from "../tools/gate/harness.ts";
import { precommitAprGaps } from "../tools/gate/hook.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

// Never trust the git environment a hook exports (KLES-002 / ISS-045).
scrubProcessGitEnv(process.env);

function fixture(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-r6-${tag}-`));
  for (const d of ["requirements", "features", "decisions", "issues"]) {
    mkdirSync(join(dir, "keel", d), { recursive: true });
  }
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  return dir;
}

function line(stdout: string, id: string): string {
  const hit = stdout.split(/\n/).find((l) => l.includes(` ${id}  `));
  return hit ?? `<no ${id} line>`;
}

test("R6c harness: claude-code env is detected, bare env is not", () => {
  assert.deepEqual(detectHarness({ CLAUDECODE: "1", CLAUDE_CODE_SESSION_ID: "s-123" }), {
    agent: "claude-code",
    session: "s-123",
  });
  assert.equal(detectHarness({ PATH: "/usr/bin" }), null);
  assert.equal(detectHarness({ KEEL_AGENT: "grok-build" })?.agent, "grok-build");
});

test("R6c harness: the zhaoxi trailer shape reads as agent-made", () => {
  // Exactly what APR-001's commit carried: keel said unknown, the harness told the truth.
  const zhaoxi =
    "keel: requirements v1 baseline (APR-001)\n\nKeel-Precommit: ok\nDeveloper: kopitau\nAgent: unknown\nSession: unknown\nClaude-Session: https://claude.ai/code/session_x\n";
  assert.equal(commitLooksAgentMade(zhaoxi), true);
  assert.equal(commitLooksAgentMade("fix: typo\n\nDeveloper: kopit\nAgent: unknown\n"), false);
  assert.equal(commitLooksAgentMade("msg\n\nAgent: claude-code\n"), true);
});

function fixtureGit(dir: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
}

function gitRepo(tag: string): string {
  const dir = fixture(tag);
  fixtureGit(dir, ["init", "-q"]);
  fixtureGit(dir, ["config", "user.name", "kopit"]);
  fixtureGit(dir, ["config", "user.email", "wwillmee@gmail.com"]);
  return dir;
}

function aprFile(dir: string, delegated: string): void {
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001-x.md"),
    `---\nid: APR-001\nstatus: approved\napprover: "kopit"\ndelegated: ${delegated}\n---\n\n# APR-001\n`,
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      identities: {
        humans: [{ name: "kopit", email: "wwillmee@gmail.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
}

test("R6c pre-commit-apr: agent env + no delegation record blocks the commit", () => {
  const dir = gitRepo("apr1");
  aprFile(dir, '""');
  fixtureGit(dir, ["add", "-A"]);
  const gaps = precommitAprGaps(makeCtx(dir), { CLAUDECODE: "1" });
  assert.equal(gaps.length, 1, JSON.stringify(gaps));
  assert.match(gaps[0] ?? "", /records no delegation/);
});

test("R6c pre-commit-apr: a recorded delegation clears the agent path", () => {
  const dir = gitRepo("apr2");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  fixtureGit(dir, ["add", "-A"]);
  assert.deepEqual(precommitAprGaps(makeCtx(dir), { CLAUDECODE: "1" }), []);
});

test("R6c pre-commit-apr: a human outside any harness needs nothing", () => {
  const dir = gitRepo("apr3");
  aprFile(dir, '""');
  fixtureGit(dir, ["add", "-A"]);
  assert.deepEqual(precommitAprGaps(makeCtx(dir), { PATH: "/usr/bin" }), []);
});

test("R6c pre-commit-apr: an agent git identity is refused regardless of delegation", () => {
  const dir = gitRepo("apr4");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["config", "user.name", "keel-agent"]);
  g(["config", "user.email", "agent@keel.local"]);
  g(["add", "-A"]);
  const gaps = precommitAprGaps(makeCtx(dir), {});
  assert.equal(gaps.length, 1, JSON.stringify(gaps));
  assert.match(gaps[0] ?? "", /agent git identity/);
});

test("R6c X-apr: an agent-trailer APR commit without delegation fails post-hoc", () => {
  const dir = gitRepo("apr5");
  aprFile(dir, '""');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "apr\n\nAgent: claude-code\nSession: s-1"]);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.match(line(out, "X-apr"), /^FAIL/, out);
  assert.match(line(out, "X-apr"), /records no delegation/);
});

test("R6c X-apr: the same commit with a recorded delegation passes", () => {
  const dir = gitRepo("apr6");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "apr\n\nAgent: claude-code\nSession: s-1"]);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.doesNotMatch(line(out, "X-apr"), /^FAIL/, out);
});

test("ISS-053 X-apr: an approved APR whose artifact hash is still pending fails", () => {
  const dir = gitRepo("apr8");
  aprFile(dir, '"「由你提交」(2026-08-29)"');
  const apr = join(dir, "keel", "approvals", "APR-001-x.md");
  writeFileSync(
    apr,
    readFileSync(apr, "utf8").replace("---\n\n# APR-001", 'artifacts:\n  - path: "keel/config.json"\n    content_sha256: pending\n---\n\n# APR-001'),
    "utf8",
  );
  const g = (args: string[]) => fixtureGit(dir, args);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "apr\n\nAgent: claude-code\nSession: s-1"]);
  const out = runCheck(makeCtx(dir), []).stdout;
  assert.match(line(out, "X-apr"), /^FAIL.*pending/, out);
});

test("R6c pre-commit hook wires the approvals guard (DEC-166)", () => {
  const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
  assert.match(hook, /keel\/approvals\//);
  assert.match(hook, /pre-commit-apr/);
});

test("R6c approve resolves the scaffold's APR-nnn-<slug>.md naming", () => {
  // gate new apr writes slugged names; approve only matched the bare name and
  // refused its own scaffold's output (first live approval, 2026-08-26).
  const dir = gitRepo("apr7");
  aprFile(dir, '"「由你提交」(2026-08-26)"');
  const renamed = join(dir, "keel", "approvals", "APR-001-some-slug.md");
  writeFileSync(
    renamed,
    readFileSync(join(dir, "keel", "approvals", "APR-001-x.md"), "utf8").replace(
      "status: approved",
      "status: draft",
    ) + "\n- path: keel/config.json\n  content_sha256: pending\n",
    "utf8",
  );
  rmSync(join(dir, "keel", "approvals", "APR-001-x.md"));
  const r = runApprove(makeCtx(dir, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(readFileSync(renamed, "utf8"), /status: approved/);
});
