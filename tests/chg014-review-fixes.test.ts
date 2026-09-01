// CHG-014 plan-level review, round 1 repairs: ISS-061..067 (each mirrors the reviewer's
// probe) plus three advisories fixed on the same pass.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runApprove } from "../tools/gate/approve.ts";
import { declaresConfirmed, inspectApprovedArtifacts } from "../tools/gate/changechain.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { evidenceVerdict, evidenceViaApproval, junitPath, writeEvidence, type Evidence } from "../tools/gate/evidence.ts";
import { gitHead, gitWriteTree } from "../tools/gate/git.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { insertTrailers } from "../tools/gate/hook.ts";
import { baseDiff, bumpRounds, emptyLoop, type LoopState, runLoop } from "../tools/gate/reviewloop.ts";
import { nextLine } from "../tools/gate/status.ts";
import { isAllowedTestCommand } from "../tools/gate/testcmd.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);
const NL = "\n";

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>\n${stdout}`;
}

function git(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
  return r.stdout.trim();
}

/** Local-tier project with one finished feature (summary) and one in progress; baseline proposed so only evidence is judged. */
function project(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-r1-${tag}-`));
  const w = (rel: string, t: string): void => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), t, "utf8");
  };
  w("keel/config.json", JSON.stringify({ records_dir: "keel", enforcement_tier: "local", identities: { humans: [{ name: "kopit", email: "wwillmee@gmail.com" }], agents: [] } }));
  w("AGENTS.md", "# k\n");
  w("keel/requirements/INDEX.md", "- current: v1.md\n");
  w("keel/requirements/v1.md", "# r\n\n- status: proposed\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n");
  w("keel/plan/INDEX.md", "- current: overview-v1.md\n");
  w("keel/plan/overview-v1.md", "---\nstatus: 工作规划\n---\n\n# p\n\n## 接口与耦合\n\n| I-01 | A |\n");
  w("keel/features/f01-x/plan/v1.md", "---\nfeature: F1\nslug: f01-x\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1\n");
  w("keel/features/f01-x/summary.md", "# s\n");
  w("keel/features/f02-y/plan/v1.md", "---\nfeature: F2\nslug: f02-y\nplan_version: v1\nreq: [REQ-001]\nblocked_by: [F1]\n---\n\n# F2\n");
  w("tests/req001.test.ts", 'import { test } from "node:test";\ntest("REQ-001/AC-1 c", () => {});\n');
  w(".gitignore", "keel/evidence/*.json\nkeel/evidence/*.xml\nkeel/review/pack.json\n");
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "kopit"]);
  git(root, ["config", "user.email", "wwillmee@gmail.com"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  return root;
}

function aprWithSnapshot(root: string, tree: string, commit: string): void {
  writeFileSync(
    join(root, "keel", "approvals", "APR-001-x.md"),
    ["---", "id: APR-001", "status: approved", 'approver: "kopit <wwillmee@gmail.com>"', 'delegated: "「由你提交」(2026-09-01)"', "artifacts:", "  - path: AGENTS.md", "    version: v1", "    content_sha256: 0",
      `evidence_tree_hash: ${tree}`, `evidence_commit: ${commit}`, "evidence_command: node --test", "evidence_exit_code: 0", "evidence_passed: 1", "evidence_failed: 0", "evidence_skipped: 0", "evidence_recorded_at: 2026-09-01T00:00:00Z", "---", "", "# APR-001", ""].join(NL),
    "utf8",
  );
}

function verifyJson(root: string, tree: string, commit: string, red: boolean): void {
  const ctx = makeCtx(root);
  mkdirSync(dirname(junitPath(ctx)), { recursive: true });
  const xml = red
    ? '<testsuites tests="3" failures="3" skipped="0" errors="0"></testsuites>\n'
    : '<testsuites tests="1" failures="0" skipped="0" errors="0"></testsuites>\n';
  writeFileSync(junitPath(ctx), xml, "utf8");
  const ev: Evidence = {
    command: "node --test", exit_code: red ? 1 : 0, started: "", finished: "2026-09-01T00:00:01.000Z", git_commit: commit, tree_hash: tree, dirty: false,
    report_hash: sha256Normalized(xml), counts: red ? { passed: 0, failed: 3, skipped: 0 } : { passed: 1, failed: 0, skipped: 0 }, req_coverage: {}, stdout_tail_2kb: "",
    actor: { harness: "local", model: "m", session: "s" },
  };
  writeEvidence(ctx, ev);
}

test("ISS-061 a red verify.json for the current tree is never overruled by an APR evidence snapshot; a stale one still is", () => {
  const root = project("iss061");
  mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  const ctx = makeCtx(root);
  const tree = gitWriteTree(ctx);
  aprWithSnapshot(root, tree, gitHead(ctx));
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "approve"]);
  assert.equal(gitWriteTree(ctx), tree, "approvals are outside the tree hash");
  verifyJson(root, tree, gitHead(ctx), true);
  const verdict = evidenceVerdict(ctx);
  assert.equal(verdict.ok, false);
  assert.match(line(runCheck(ctx, []).stdout, "X-evidence"), /^FAIL X-evidence/);
  // a verify.json about another tree says nothing about this one → the snapshot counts
  verifyJson(root, "0".repeat(40), "deadbeef", true);
  assert.equal(evidenceVerdict(ctx).ok, true);
  assert.match(line(runCheck(ctx, []).stdout, "X-evidence"), /^PASS X-evidence  no fresh verify\.json; approved APR-001/);
  rmSync(root, { recursive: true, force: true });
});

test("fp:apr-evidence-snapshot-uncommitted-hand-edit an uncommitted or edited APR snapshot proves nothing", () => {
  const root = project("handedit");
  mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  const ctx = makeCtx(root);
  const tree = gitWriteTree(ctx);
  aprWithSnapshot(root, tree, gitHead(ctx));
  rmSync(join(root, "keel", "evidence"), { recursive: true, force: true });
  assert.equal(evidenceViaApproval(ctx), null, "untracked APR");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "approve"]);
  assert.equal(evidenceViaApproval(ctx)?.apr, "APR-001", "committed APR");
  writeFileSync(join(root, "keel", "approvals", "APR-001-x.md"), readFileSync(join(root, "keel", "approvals", "APR-001-x.md"), "utf8").replace("evidence_passed: 1", "evidence_passed: 99"), "utf8");
  assert.equal(evidenceViaApproval(ctx), null, "edited after commit");
  rmSync(root, { recursive: true, force: true });
});

test("ISS-062 one clear is one round per fingerprint however many open ISS share the root: the fuse needs three rounds", () => {
  let st: LoopState = { ...emptyLoop("a", "b"), blocking_iss: ["ISS-001", "ISS-002"], iss_fp: { "ISS-001": "x", "ISS-002": "y" } };
  const rootOf = (): string => "root";
  st = bumpRounds(st, ["ISS-001", "ISS-002"], rootOf);
  st = bumpRounds(st, ["ISS-001", "ISS-002"], rootOf);
  assert.equal(st.rounds_on.root, 2);
  assert.equal(st.status, "repairing");
  st = bumpRounds(st, ["ISS-002"], rootOf);
  assert.equal(st.rounds_on.root, 3);
  assert.equal(st.status, "fused");
});

test("ISS-063 pytest -o (ini override) and plugin / reporter module values are refused; -p no:<plugin> stays allowed", () => {
  for (const cmd of ["python -m pytest -q -o addopts=--lf", "python -m pytest -q -o testpaths=unit", "uv run pytest -q -o addopts=-k_smoke", "pytest -p myplugin", "pytest -p ../evil", "npx vitest run --reporter=./my-reporter.js", "node --test --test-reporter=./rep.mjs"]) {
    assert.ok(!isAllowedTestCommand(cmd, "other"), cmd);
  }
  for (const cmd of ["uv run pytest -q -p no:cacheprovider", "pytest -W error::DeprecationWarning", "npx vitest run --reporter=junit", "node --test --test-reporter=junit"]) {
    assert.ok(isAllowedTestCommand(cmd, "other"), cmd);
  }
});

test("ISS-064 an approved artifact path that is a directory is reported as missing, and gate check --quick does not crash", () => {
  const root = project("iss064");
  mkdirSync(join(root, "keel", "approvals"), { recursive: true });
  writeFileSync(join(root, "keel", "approvals", "APR-001-x.md"), "---\nid: APR-001\nstatus: approved\napprover: \"kopit\"\ndelegated: \"「由你提交」(2026-09-01)\"\nartifacts:\n  - path: keel/features/f01-x/plan\n    content_sha256: 0123\n---\n\n# APR-001\n", "utf8");
  const ctx = makeCtx(root);
  assert.deepEqual(inspectApprovedArtifacts(ctx).map((d) => d.state), ["missing"]);
  // quick: no crash (the directory is not a plan file, so G-plan has nothing to say); full: X-apr reports it missing
  assert.match(line(runCheck(ctx, ["--quick"]).stdout, "G-plan"), /^PASS G-plan/);
  assert.match(line(runCheck(ctx, []).stdout, "X-apr"), /^FAIL X-apr  approved artifact missing: keel\/features\/f01-x\/plan \(APR-001\)/);
  const human = makeCtx(root, { name: "kopit", email: "wwillmee@gmail.com" });
  writeFileSync(join(root, "keel", "approvals", "APR-001-x.md"), readFileSync(join(root, "keel", "approvals", "APR-001-x.md"), "utf8").replace("status: approved", "status: draft").replace("content_sha256: 0123", "content_sha256: pending"), "utf8");
  const r = runApprove(human, ["APR-001"]);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /artifact is not a file: keel\/features\/f01-x\/plan/);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-065 next: names claimed features instead of 'no feature planned yet'", () => {
  const h = "keel/handoff.md";
  const base = { hasBaseline: true, hasPlan: true, frontier: [] as string[], blocked: [] as { id: string; by: string[] }[], planDone: false };
  assert.match(nextLine({ ...base, claimed: ["F1"] }, h), /^claimed and in progress: F1 — continue in its worktree or release the claim/);
  assert.match(nextLine({ ...base, claimed: ["F1"], blocked: [{ id: "F2", by: ["F1"] }] }, h), /^claimed and in progress: F1/);
  assert.match(nextLine({ ...base, claimed: [] }, h), /no feature planned yet/);
  const root = project("iss065");
  writeFileSync(join(root, "keel", "features", "f02-y", "claim.json"), "{}\n", "utf8");
  rmSync(join(root, "keel", "features", "f01-x", "summary.md"));
  writeFileSync(join(root, "keel", "features", "f01-x", "claim.json"), "{}\n", "utf8");
  const r = spawnSync(process.execPath, [join(repo, "tools", "gate", "gate.ts"), "--root", root, "status"], { cwd: root, encoding: "utf8", env: { ...scrubHookGitEnv(process.env), KEEL_INSTALLER_ROOT: "none" } });
  assert.match(r.stdout.split("\n").find((l) => l.startsWith("next: ")) ?? "", /^next: claimed and in progress: F1, F2/);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-066 an interactive commit (empty message + git comments) leaves line 1 for the subject and a blank line before the trailers", () => {
  const t = ["Keel-Precommit: ok", "Feature: trunk"];
  const out = insertTrailers("\n# Please enter the commit message for your changes.\n# On branch main\n", t);
  assert.equal(out, "\n\nKeel-Precommit: ok\nFeature: trunk\n\n# Please enter the commit message for your changes.\n# On branch main\n");
  // what the human then does: types the subject on line 1
  const typed = "subject typed by human" + out;
  const root = mkdtempSync(join(tmpdir(), "keel-chg014-iss066-"));
  writeFileSync(join(root, "a.txt"), "a\n", "utf8");
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "h"]);
  git(root, ["config", "user.email", "h@x"]);
  git(root, ["add", "-A"]);
  writeFileSync(join(root, "msg"), typed, "utf8");
  git(root, ["commit", "-q", "-F", "msg", "--cleanup=strip"]);
  assert.equal(git(root, ["log", "-1", "--format=%s"]), "subject typed by human");
  assert.equal(git(root, ["log", "-1", "--format=%(trailers:key=Feature,valueonly)"]), "trunk");
  rmSync(root, { recursive: true, force: true });
});

test("ISS-067 a committed keel/review/raw archive never enters the next pack's diff, and a second rejection in one round keeps both archives", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-chg014-iss067-"));
  const w = (rel: string, t: string): void => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), t, "utf8");
  };
  w("keel/config.json", JSON.stringify({ records_dir: "keel" }));
  w("AGENTS.md", "# k\n");
  w("keel/plan/INDEX.md", "- current: overview-v1.md\n");
  w("keel/plan/overview-v1.md", "# p\n| I-01 | A |\n");
  w("keel/requirements/INDEX.md", "- current: v1.md\n");
  w("keel/requirements/v1.md", "# r\n");
  w("keel/templates/ISS.md", readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"));
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.name", "h"]);
  git(root, ["config", "user.email", "h@x"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "base"]);
  const base = git(root, ["rev-parse", "HEAD"]);
  w("src.txt", "changed\n");
  w("keel/review/raw/round-1-r.json", "[{title:PRIOR-REVIEWER-OUTPUT}]\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "raw archived"]);
  const ctx = makeCtx(root);
  assert.doesNotMatch(baseDiff(ctx, base), /PRIOR-REVIEWER-OUTPUT/);
  w("more.txt", "x\n");
  assert.equal(runLoop(ctx, ["pack", "--base", base, "--implementer", "a", "--reviewer", "r"]).code, 0);
  assert.doesNotMatch(readFileSync(join(root, "keel", "review", "pack.json"), "utf8"), /PRIOR-REVIEWER-OUTPUT/);
  const f = join(mkdtempSync(join(tmpdir(), "keel-chg014-f-")), "findings.json");
  writeFileSync(f, "{}", "utf8");
  assert.equal(runLoop(ctx, ["ingest", f, "--reviewer", "r"]).code, 1);
  writeFileSync(f, "null", "utf8");
  assert.equal(runLoop(ctx, ["ingest", f, "--reviewer", "r"]).code, 1);
  const names = readdirSync(join(root, "keel", "review", "raw")).sort();
  assert.deepEqual(names, ["round-1-r-2.json", "round-1-r-3.json", "round-1-r.json"]);
  assert.equal(readFileSync(join(root, "keel", "review", "raw", "round-1-r-2.json"), "utf8"), "{}");
  assert.equal(readFileSync(join(root, "keel", "review", "raw", "round-1-r-3.json"), "utf8"), "null");
  rmSync(root, { recursive: true, force: true });
});

test("fp:declares-confirmed-substring-false-positive a negated mention of approval is not a claim of it", () => {
  for (const s of ["proposed (not yet approved)", "unconfirmed", "unapproved", "proposed（待 APR-006 点头）", "草案，未确认", "pending approval", "尚未批准"]) {
    assert.ok(!declaresConfirmed(s), s);
  }
  for (const s of ["confirmed", "已确认（APR-001）", "工作规划（CHG-011 / APR-004 已批准）", "Approved 2026-09-01", "status: confirmed（经 APR-005 确认）"]) {
    assert.ok(declaresConfirmed(s), s);
  }
  assert.ok(existsSync(join(repo, "tools", "gate", "changechain.ts")));
});
