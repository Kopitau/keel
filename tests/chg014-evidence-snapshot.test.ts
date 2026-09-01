// CHG-014 S4 (DEC-187): `gate approve` freezes the verify facts of the current tree into
// the APR front matter, and on the local tier G-done / G-merge / X-evidence read that
// snapshot back when verify.json is gone — for that very tree only.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { runApprove, withApprovalEvidence } from "../tools/gate/approve.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { evidenceViaApproval, junitPath, readApprovalEvidence, writeEvidence, type Evidence } from "../tools/gate/evidence.ts";
import { gitHead, gitWriteTree } from "../tools/gate/git.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function line(stdout: string, id: string): string {
  return stdout.split("\n").find((l) => l.includes(` ${id}  `)) ?? `<no ${id} line>\n${stdout}`;
}

/** A local-tier project with one finished feature (summary) and one in progress, a confirmed baseline and a draft acceptance APR. */
function fixture(tag: string): { root: string; apr: string; git: (a: string[]) => string } {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-evid-${tag}-`));
  for (const d of ["requirements", "approvals", "plan", "features/f01-x/plan", "features/f02-y/plan", "evidence"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
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
    "# 需求书 v1\n\n- status: confirmed\n- source: interview\n- replaces: null\n- change: null\n\n## 未决问题\n\n无\n\n## REQ-001 X\n\n- **status**: confirmed\n- **acceptance**:\n  - Given a When b Then c\n- **verification**: [auto]\n",
    "utf8",
  );
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "overview-v1.md"), "---\nplan_version: v1\nstatus: 工作规划\n---\n\n# 统一规划 v1\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f01-x", "plan", "v1.md"), "---\nfeature: F1\nslug: f01-x\nplan_version: v1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# F1\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f01-x", "summary.md"), "# 功能总结 — F1\n\n做完了。\n", "utf8");
  writeFileSync(join(root, "keel", "features", "f02-y", "plan", "v1.md"), "---\nfeature: F2\nslug: f02-y\nplan_version: v1\nreq: [REQ-001]\nblocked_by: [F1]\n---\n\n# F2\n", "utf8");
  writeFileSync(join(root, "tests", "req001.test.ts"), 'import { test } from "node:test";\ntest("REQ-001/AC-1 c happens", () => {});\n', "utf8");
  const apr = join(root, "keel", "approvals", "APR-001-accept-f1.md");
  writeFileSync(
    apr,
    "---\nid: APR-001\nstatus: draft\ndate: 2026-09-01\napprover: \"\"\ndelegated: \"「由你提交」(2026-09-01)\"\nscope: \"F1 验收\"\nartifacts:\n  - path: keel/requirements/v1.md\n    version: v1\n    content_sha256: pending\n---\n\n# APR-001 F1 验收\n",
    "utf8",
  );
  const git = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
    return r.stdout.trim();
  };
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", "kopit"]);
  git(["config", "user.email", "wwillmee@gmail.com"]);
  writeFileSync(join(root, ".gitignore"), "keel/evidence/*.json\nkeel/evidence/*.xml\n", "utf8");
  git(["add", "-A"]);
  git(["commit", "-q", "-m", "baseline"]);
  return { root, apr, git };
}

/** A green, reconciling verify.json + junit.xml for the current tree. */
function greenEvidence(root: string): Evidence {
  const ctx = makeCtx(root);
  const xml = '<testsuites tests="1" failures="0" skipped="0" errors="0"></testsuites>\n';
  writeFileSync(junitPath(ctx), xml, "utf8");
  const ev: Evidence = {
    command: "node --test",
    exit_code: 0,
    started: "2026-09-01T00:00:00.000Z",
    finished: "2026-09-01T00:00:01.000Z",
    git_commit: gitHead(ctx),
    tree_hash: gitWriteTree(ctx),
    dirty: false,
    report_hash: sha256Normalized(xml),
    counts: { passed: 1, failed: 0, skipped: 0 },
    req_coverage: { "REQ-001": 1 },
    stdout_tail_2kb: "ok",
    actor: { harness: "local", model: "unspecified", session: "local-1" },
  };
  writeEvidence(ctx, ev);
  return ev;
}

test("REQ-018/AC-8 gate approve writes the evidence_* snapshot of the current tree when a fresh green verify.json exists, and none when it does not", () => {
  const f = fixture("approve");
  const ev = greenEvidence(f.root);
  const r = runApprove(makeCtx(f.root, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /evidence snapshot written: tree/);
  const text = readFileSync(f.apr, "utf8");
  assert.match(text, /^status: approved$/m);
  assert.match(text, new RegExp(`^evidence_tree_hash: ${ev.tree_hash}$`, "m"));
  assert.match(text, /^evidence_passed: 1$/m);
  assert.match(text, /^evidence_exit_code: 0$/m);
  assert.match(text, /^evidence_command: "node --test"$/m);
  const snap = readApprovalEvidence(makeCtx(f.root), { committedOnly: false });
  assert.equal(snap.length, 1);
  assert.equal(snap[0]?.tree_hash, ev.tree_hash);
  // approving again without evidence keeps the file well-formed and reports the gap
  rmSync(join(f.root, "keel", "evidence", "verify.json"));
  writeFileSync(f.apr, readFileSync(f.apr, "utf8").replace("status: approved", "status: draft"), "utf8");
  const again = runApprove(makeCtx(f.root, { name: "kopit", email: "wwillmee@gmail.com" }), ["APR-001"]);
  assert.equal(again.code, 0, again.stderr);
  assert.match(again.stdout, /no fresh green verify\.json/);
  // withApprovalEvidence replaces rather than duplicates
  const once = withApprovalEvidence("---\nid: APR-009\nevidence_tree_hash: old\n---\n\n# x\n", ["evidence_tree_hash: new", "evidence_passed: 3"]);
  assert.equal(once, "---\nid: APR-009\nevidence_tree_hash: new\nevidence_passed: 3\n---\n\n# x\n");
  rmSync(f.root, { recursive: true, force: true });
});

test("REQ-006/AC-9 with verify.json gone, G-done / G-merge / X-evidence accept an approved APR snapshot for this tree and reject it once the tree moves", () => {
  const f = fixture("fallback");
  greenEvidence(f.root);
  const human = makeCtx(f.root, { name: "kopit", email: "wwillmee@gmail.com" });
  assert.equal(runApprove(human, ["APR-001"]).code, 0);
  // the human commits the approval (keel/approvals is outside the tree hash, so verify.json stays fresh)
  f.git(["add", "-A"]);
  f.git(["commit", "-q", "-m", "approve F1"]);
  const ctx = makeCtx(f.root);
  // with verify.json present the full check is green the normal way
  let out = runCheck(ctx, []).stdout;
  assert.match(line(out, "X-evidence"), /^PASS X-evidence  fresh tree/);
  // the worktree is gone: no verify.json, no junit.xml — the APR snapshot carries the evidence
  rmSync(join(f.root, "keel", "evidence", "verify.json"));
  rmSync(junitPath(ctx));
  assert.ok(!existsSync(join(f.root, "keel", "evidence", "verify.json")));
  assert.equal(evidenceViaApproval(ctx)?.apr, "APR-001");
  out = runCheck(ctx, []).stdout;
  assert.match(line(out, "X-evidence"), /^PASS X-evidence  no fresh verify\.json; approved APR-001 snapshot matches this tree/);
  assert.match(line(out, "G-done"), /^PASS G-done.*evidence via APR-001/);
  assert.match(line(out, "G-merge"), /^PASS G-merge.*evidence \(APR-001\)/);
  // the tree moves: the snapshot no longer proves anything
  writeFileSync(join(f.root, "AGENTS.md"), "# k\n\nchanged\n", "utf8");
  f.git(["add", "-A"]);
  f.git(["commit", "-q", "-m", "move the tree"]);
  assert.equal(evidenceViaApproval(ctx), null);
  out = runCheck(ctx, []).stdout;
  assert.match(line(out, "X-evidence"), /^FAIL X-evidence.*verify\.json missing/);
  assert.match(line(out, "G-done"), /^FAIL G-done.*verify\.json missing/);
  assert.match(line(out, "G-merge"), /^FAIL G-merge.*verify\.json missing/);
  rmSync(f.root, { recursive: true, force: true });
});
