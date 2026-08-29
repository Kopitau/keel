// CHG-011 (DEC-183): the gate is eight checks, quick is four of them, the hook is
// seconds, freezing binds semantics (body hash), evidence is judged only in full.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runApprove } from "../tools/gate/approve.ts";
import { QUICK_SKIPPED_IDS, runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { writeEvidence } from "../tools/gate/evidence.ts";
import { sha256Body, sha256Normalized } from "../tools/gate/hash.ts";
import { CHECK_IDS } from "../tools/gate/review.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const QUICK = ["G-req", "G-plan", "X-trace", "X-bypass"];

// Never trust the git environment a hook exports (ISS-045).
scrubProcessGitEnv(process.env);

function gate(args: string[], cwd = repo) {
  return spawnSync(process.execPath, [join(repo, "tools", "gate", "gate.ts"), ...args], {
    cwd,
    encoding: "utf8",
    env: scrubHookGitEnv(process.env),
  });
}

function ids(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((l) => l.match(/^(?:PASS|WARN|FAIL|SKIP)\s+(\S+)/)?.[1] ?? "")
    .filter(Boolean);
}

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>`;
}

function chainFixture(tag: string): { root: string; change: string } {
  const root = mkdtempSync(join(tmpdir(), `keel-chg011-${tag}-`));
  for (const d of ["requirements", "changes", "approvals", "plan"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      identities: {
        humans: [{ name: "kopit", email: "wwillmee@gmail.com" }],
        agents: [{ name: "keel-agent", email: "agent@keel.local" }],
      },
    }),
    "utf8",
  );
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    "# 需求书 v1\n\n- status: confirmed\n- source: CHG-001\n- replaces: null\n- change: CHG-001\n\n## 未决问题\n\n无\n\n## REQ-001 X\n\n- **status**: confirmed\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(
    join(root, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  const change = join(root, "keel", "changes", "CHG-001-demo.md");
  writeFileSync(
    change,
    "---\nid: CHG-001\nstatus: approved\ndate: 2026-08-29\n---\n\n# CHG-001 demo\n\n正文。\n",
    "utf8",
  );
  return { root, change };
}

function aprFile(root: string, digest: string, status = "approved"): string {
  const path = join(root, "keel", "approvals", "APR-001-demo.md");
  writeFileSync(
    path,
    "---\n" +
      "id: APR-001\n" +
      `status: ${status}\n` +
      "date: 2026-08-29\n" +
      'approver: "kopit"\n' +
      'delegated: "「由你提交」(2026-08-29)"\n' +
      "artifacts:\n" +
      "  - path: keel/changes/CHG-001-demo.md\n" +
      "    version: v1\n" +
      `    content_sha256: ${digest}\n` +
      "---\n\n# APR-001\n",
    "utf8",
  );
  return path;
}

test("REQ-017/AC-6 the pre-commit hook runs only check --quick and the approval guard; tests and tsc stay in verify and CI", () => {
  const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
  assert.match(hook, /gate\.sh" check --quick/);
  assert.match(hook, /keel\/approvals\/[\s\S]*hook pre-commit-apr/);
  assert.doesNotMatch(hook, /node --test|tsc|check --all|gate\.sh" verify|npm test/);
  const quick = runCheck(makeCtx(repo), ["--quick"]);
  assert.deepEqual(ids(quick.stdout), QUICK, quick.stdout);
  assert.match(quick.stdout, /checks=4/);
});

test("REQ-005/AC-6 the gate has eight checks and quick is the four-check subset of them", () => {
  const all = CHECK_IDS as readonly string[];
  assert.equal(all.length, 8);
  assert.deepEqual([...QUICK_SKIPPED_IDS].sort(), ["G-done", "G-merge", "X-apr", "X-evidence"]);
  for (const id of [...QUICK_SKIPPED_IDS, ...QUICK]) assert.ok(all.includes(id), id);
});

test("REQ-005/AC-7 gate status opens with three human lines and gate check prints only non-PASS rows plus one result line", () => {
  const st = gate(["status"]);
  assert.equal(st.status, 0, st.stderr);
  const lines = st.stdout.split("\n");
  assert.equal(lines[0], "keel status");
  assert.match(lines[1] ?? "", /^commit: (yes|no)/);
  assert.match(lines[2] ?? "", /^missing: /);
  assert.match(lines[3] ?? "", /^next: /);
  const chk = gate(["check", "--quick"]);
  assert.doesNotMatch(chk.stdout, /^PASS /m);
  const tail = chk.stdout.trim().split("\n").pop() ?? "";
  assert.match(tail, /^result: \S+\s+fail=\d+ warn=\d+ checks=4$/);
  const all = gate(["check", "--quick", "--all"]);
  assert.equal(ids(all.stdout).length, 4, all.stdout);
});

test("REQ-011/AC-4 after approval a front-matter edit keeps G-req green; a body edit is a WARN that stands only with a worklog line citing the APR", () => {
  const { root, change } = chainFixture("meta");
  aprFile(root, sha256Body(readFileSync(change)));
  const ctx = makeCtx(root);
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^PASS/);
  // metadata: status/date lines move, the body does not
  writeFileSync(
    change,
    readFileSync(change, "utf8").replace("date: 2026-08-29", "date: 2026-08-30\nreviewed: 2026-08-30"),
    "utf8",
  );
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^PASS/);
  // body: a typo fix moves the hash → WARN, escalated until the worklog cites the APR
  writeFileSync(change, readFileSync(change, "utf8").replace("正文。", "正文（错字已改）。"), "utf8");
  const red = runCheck(ctx, ["--quick"]);
  assert.match(line(red.stdout, "G-req"), /^FAIL.*body changed after approval.*warn not acknowledged/);
  mkdirSync(join(root, "keel", "features", "f01-x"), { recursive: true });
  writeFileSync(
    join(root, "keel", "features", "f01-x", "worklog.md"),
    "- 2026-08-30 错字修正，语义未变。gate-warn: G-req ref=APR-001\n",
    "utf8",
  );
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-req"), /^WARN.*body changed after approval/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-018/AC-1 gate approve binds the body hash, and an older APR bound to the whole-file hash is still accepted", () => {
  const { root, change } = chainFixture("approve");
  // legacy: whole-file hash, file untouched → bound
  const apr = aprFile(root, sha256Normalized(readFileSync(change)));
  assert.match(line(runCheck(makeCtx(root), ["--quick"]).stdout, "G-req"), /^PASS/);
  // a fresh approval writes the body hash
  aprFile(root, "pending", "draft");
  const r = runApprove(makeCtx(root, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  const bound = readFileSync(apr, "utf8").match(/content_sha256: (\S+)/)?.[1];
  assert.equal(bound, sha256Body(readFileSync(change)));
  assert.notEqual(bound, sha256Normalized(readFileSync(change)));
  assert.match(line(runCheck(makeCtx(root), ["--quick"]).stdout, "G-req"), /^PASS/);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-006/AC-4 stale evidence never reddens --quick; the full check fails it", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-chg011-evidence-"));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  const g = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  };
  g(["init", "-q"]);
  g(["config", "user.name", "t"]);
  g(["config", "user.email", "t@t.t"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "init"]);
  const ctx = makeCtx(root);
  writeEvidence(ctx, {
    command: "x",
    exit_code: 0,
    started: "",
    finished: "",
    git_commit: "x",
    tree_hash: "0".repeat(40),
    dirty: false,
    report_hash: "",
    counts: { passed: 1, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "",
    actor: { harness: "", model: "", session: "" },
  });
  const quick = runCheck(ctx, ["--quick"]);
  assert.doesNotMatch(quick.stdout, /X-evidence/);
  assert.match(line(runCheck(ctx, []).stdout, "X-evidence"), /^FAIL/);
  rmSync(root, { recursive: true, force: true });
});
