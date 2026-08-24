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
import { liveClarifications, runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { evidenceGaps } from "../tools/gate/evidence.ts";
import { gitDir, gitWriteTree } from "../tools/gate/git.ts";
import { runApprove } from "../tools/gate/approve.ts";
import { collectBypassFindings } from "../tools/gate/bypass.ts";
import { runHook } from "../tools/gate/hook.ts";

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

test("REQ-001 P1-5 Given-line live marker counts; backtick and 标-docs do not", () => {
  assert.equal(liveClarifications("- Given x When y Then [NEEDS-CLARIFICATION: q]\n"), 1);
  assert.equal(
    liveClarifications("- Given x When y Then 标 `[NEEDS-CLARIFICATION: 具体问题]`\n"),
    0,
  );
  assert.equal(
    liveClarifications("  - Given 模糊点 When 记录 Then 标 [NEEDS-CLARIFICATION: 具体问题] 且未解\n"),
    0,
  );
});

test("REQ-002 P1-6 adr research pointer must exist on disk", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p1-res-"));
  mkdirSync(join(dir, "keel", "decisions"), { recursive: true });
  mkdirSync(join(dir, "keel", "research"), { recursive: true });
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(
    join(dir, "keel", "decisions", "DEC-001.md"),
    "---\nid: DEC-001\nadr: true\nresearch: [RES-999]\n---\n# d\n",
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
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL G-research/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-006 P1-3 evidenceGaps flags missing junit and dirty", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p1-ev-"));
  mkdirSync(join(dir, "keel", "evidence"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p1@example.com"]);
  git(dir, ["config", "user.name", "p1"]);
  writeFileSync(join(dir, "a.txt"), "a\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "a"]);
  const ctx = makeCtx(dir);
  const tree = gitWriteTree(ctx);
  assert.ok(tree.length > 0);
  const gaps = evidenceGaps(ctx, {
    command: "node --test",
    exit_code: 0,
    started: "",
    finished: "",
    git_commit: "x",
    tree_hash: tree,
    dirty: true,
    report_hash: "dead",
    counts: { passed: 3, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "ok",
    actor: { harness: "local", model: "unspecified", session: "local-1" },
  });
  assert.ok(gaps.some((g) => /dirty/.test(g)), gaps.join(";"));
  assert.ok(gaps.some((g) => /junit/.test(g)), gaps.join(";"));
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-019 P1-8 gitWriteTree works in a linked worktree", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p1-wt-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p1@example.com"]);
  git(dir, ["config", "user.name", "p1"]);
  writeFileSync(join(dir, "f.txt"), "f\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "f"]);
  const wt = join(dir, "wt");
  git(dir, ["worktree", "add", wt]);
  const hash = gitWriteTree(makeCtx(wt));
  assert.ok(hash.length >= 40, `tree=${hash} gitDir=${gitDir(makeCtx(wt))}`);
  git(dir, ["worktree", "remove", "--force", wt]);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-018 P1-7 approve refuses empty humans list", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p1-apr-"));
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      identities: { agents: [{ name: "keel-agent", email: "agent@keel.local" }], humans: [] },
    }),
    "utf8",
  );
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(
    join(dir, "keel", "approvals", "APR-001.md"),
    "---\nid: APR-001\nstatus: draft\napprover: \"\"\n---\n\n- path: AGENTS.md\n  content_sha256: pending\n",
    "utf8",
  );
  const r = runApprove(makeCtx(dir, { name: "Ada", email: "ada@example.com" }), ["APR-001"]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /humans is empty/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-017 P1-4 prepare-commit-msg without stamp writes skipped", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p1-hook-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "p1@example.com"]);
  git(dir, ["config", "user.name", "p1"]);
  writeFileSync(join(dir, "x.txt"), "x\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "x"]);
  const msg = join(dir, "COMMIT_MSG");
  writeFileSync(msg, "topic\n", "utf8");
  const ctx = makeCtx(dir);
  const r = runHook(ctx, ["prepare-commit-msg", msg]);
  assert.equal(r.code, 0, r.stderr);
  const got = readFileSync(msg, "utf8");
  assert.match(got, /Keel-Precommit: skipped/);
  writeFileSync(join(dir, "y.txt"), "y\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", got]);
  const findings = collectBypassFindings(ctx);
  assert.ok(findings.some((f) => f.code === "no-verify"), JSON.stringify(findings));
  rmSync(dir, { recursive: true, force: true });
});
