import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../tools/cli/main.js";
import { runApprove } from "../tools/gate/approve.ts";
import { runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { evidenceGaps, readEvidence } from "../tools/gate/evidence.ts";
import { acCoverage, fileFindings } from "../tools/gate/reviewloop.ts";
import { featureCoverageLines, runTrace } from "../tools/gate/trace.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { runSync } from "../tools/gate/sync.ts";
import { readCurrent, runIndex } from "../tools/gate/indexgen.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function fixture(types = ["auto"]) {
  const root = mkdtempSync(join(tmpdir(), "keel-chg019-"));
  const write = (path: string, body: string): void => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body, "utf8");
  };
  const git = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  write("AGENTS.md", "# Fixture\n");
  write("CLAUDE.md", "@AGENTS.md\n");
  write(".gitignore", "keel/evidence/\n");
  write("keel/config.json", JSON.stringify({
    records_dir: "keel", enforcement_tier: "local",
    identities: { humans: [{ name: "Fixture", email: "fixture@example.com" }] },
    profiles: { active: ["node-test"], "node-test": { test_command: "node --test" } },
  }));
  write("keel/requirements/INDEX.md", "- current: v1.md\n");
  write("keel/requirements/v1.md", `# Requirements\n\n- status: working\n\n## 未决问题\n\n无\n\n## REQ-001 查询\n\n- **acceptance**:\n${types.map((_, i) => `  - Given source ${i} When queried Then preserve the value`).join("\n")}\n- **verification**: [${types.join(", ")}]\n`);
  write("keel/plan/INDEX.md", "- current: overview-v1.md\n");
  write("keel/plan/overview-v1.md", "# Plan\n\n## 接口与耦合\n\n| I-01 | query → source |\n");
  write("keel/features/f01-query/plan/v1.md", "---\nfeature: F1\nreq: [REQ-001]\nblocked_by: []\n---\n\n# Query\n");
  write("keel/features/f01-query/summary.md", "# Query implementation\n");
  // Keep the global historical plan in progress: this fixture tests feature evidence, not formal plan acceptance.
  write("keel/features/f02-later/plan/v1.md", "---\nfeature: F2\nreq: [REQ-001]\nblocked_by: [F1]\n---\n\n# Later\n");
  write("tests/query.test.js", 'import { test } from "node:test";\nimport assert from "node:assert/strict";\n' + types.map((_, i) => `test("REQ-001/AC-${i + 1} retains the value", () => assert.equal(JSON.parse('{"value":7}').value, 7));`).join("\n") + "\n");
  const aprPath = "keel/approvals/APR-001.md";
  write(aprPath, "---\nid: APR-001\nstatus: draft\napprover: \"\"\ndate: 2026-09-14\ndelegated: \"Fixture user: approve this fixture\"\nartifacts:\n  - path: keel/requirements/v1.md\n    content_sha256: pending\n---\n\n# Fixture approval\n");
  git(["init", "-q", "-b", "main"]);
  git(["config", "user.name", "Fixture"]);
  git(["config", "user.email", "fixture@example.com"]);
  git(["add", "-A"]);
  git(["commit", "-qm", "fixture baseline"]);
  return { root, write, git, aprPath, ctx: makeCtx(root, { name: "Fixture", email: "fixture@example.com" }) };
}

function checkLine(out: string, id: string): string {
  return out.split("\n").find(l => l.includes(` ${id}  `)) ?? out;
}

test("REQ-006/AC-14 I-07 dirty verified content remains valid; only delivery waits for commit, without rerunning tests", () => {
  const f = fixture();
  try {
    f.write("query.js", "export const answer = 7;\n");
    const index = f.git(["write-tree"]);
    assert.equal(runVerify(f.ctx).code, 0);
    assert.equal(f.git(["write-tree"]), index, "verification must preserve the user's index");
    const before = readFileSync(join(f.root, "keel/evidence/verify.json"), "utf8");
    assert.equal(readEvidence(f.ctx)?.dirty, true);
    assert.deepEqual(evidenceGaps(f.ctx, readEvidence(f.ctx)), []);
    const approval = runApprove(f.ctx, ["APR-001"]);
    assert.equal(approval.code, 0, approval.stderr);
    assert.match(approval.stdout, /evidence snapshot written/);
    let check = runCheck(f.ctx, []).stdout;
    assert.match(checkLine(check, "G-done"), /^PASS/);
    assert.match(checkLine(check, "X-evidence"), /^PASS/);
    assert.match(checkLine(check, "G-merge"), /^FAIL.*uncommitted code/);
    const mergeDetail = check.slice(check.indexOf("FAIL G-merge")).split("\n").slice(0, 2).join("\n");
    assert.doesNotMatch(mergeDetail, /run: gate verify/);
    f.git(["add", "-A"]);
    f.git(["commit", "-qm", "commit tested content"]);
    check = runCheck(f.ctx, []).stdout;
    assert.match(checkLine(check, "G-merge"), /^PASS/);
    assert.equal(readFileSync(join(f.root, "keel/evidence/verify.json"), "utf8"), before);
    assert.deepEqual(evidenceGaps(f.ctx, readEvidence(f.ctx)), []);
    f.write("query.js", "export const answer = 8;\n");
    assert.match(evidenceGaps(f.ctx, readEvidence(f.ctx)).join(";"), /stale tree_hash/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-018/AC-8 I-07 approval does not freeze a fresh-looking but unreconciled report", () => {
  const f = fixture();
  try {
    assert.equal(runVerify(f.ctx).code, 0);
    f.write("keel/evidence/junit.xml", '<testsuites tests="99" failures="0"/>\n');
    const approval = runApprove(f.ctx, ["APR-001"]);
    assert.equal(approval.code, 0, approval.stderr);
    assert.doesNotMatch(readFileSync(join(f.root, f.aprPath), "utf8"), /^evidence_tree_hash:/m);
    assert.match(evidenceGaps(f.ctx, readEvidence(f.ctx)).join(";"), /report_hash/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-006/AC-3 REQ-018/AC-8 approval refuses skipped-count drift against an unchanged JUnit report", () => {
  const f = fixture();
  try {
    assert.equal(runVerify(f.ctx).code, 0);
    const ev = readEvidence(f.ctx);
    if (!ev) throw new Error("fixture verification did not produce evidence");
    // Intentionally corrupt this disposable fixture's metadata, never the project's real evidence.
    ev.counts.skipped = 99;
    f.write("keel/evidence/verify.json", JSON.stringify(ev));
    const approval = runApprove(f.ctx, ["APR-001"]);
    assert.equal(approval.code, 0, approval.stderr);
    assert.doesNotMatch(readFileSync(join(f.root, f.aprPath), "utf8"), /^evidence_tree_hash:/m);
    assert.match(evidenceGaps(f.ctx, readEvidence(f.ctx)).join(";"), /counts do not match junit/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-006/AC-10 REQ-006/AC-15 I-06 trace and verify distinguish behavioral/document mappings from manual evidence", () => {
  const f = fixture(["auto", "machine-doc", "manual"]);
  try {
    const trace = runTrace(f.ctx);
    assert.equal(trace.code, 0);
    const feature = featureCoverageLines(f.ctx)[0] ?? "";
    assert.match(feature, /自动行为映射 1/);
    assert.match(feature, /文档\/协议映射 1/);
    assert.match(feature, /人工\/真实环境 1.*AC-3/);
    assert.doesNotMatch(feature, /黑盒 3|验收通过/);
    assert.match(trace.stdout, /not execution or acceptance/);
    assert.match(checkLine(runCheck(f.ctx, ["--quick"]).stdout, "X-trace"), /^WARN.*manual evidence.*REQ-001\/AC-3/);
    assert.equal(runVerify(f.ctx).code, 0);
    assert.equal(readEvidence(f.ctx)?.counts.passed, 3, "running a manual-labelled helper is still a real test run");
    assert.equal(readEvidence(f.ctx)?.feature_coverage?.[0], feature, "the run must not promote a helper to manual acceptance");
    f.write("tests/query.test.js", 'test("REQ-001/AC-1 keeps raw values", () => {});\ntest("REQ-001/AC-2 validates the protocol", () => {});\n');
    assert.match(checkLine(runCheck(f.ctx, ["--quick"]).stdout, "X-trace"), /^WARN.*manual evidence/);
    assert.doesNotMatch(featureCoverageLines(f.ctx)[0] ?? "", /缺 1（AC-3）/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-006/AC-15 formal ac-only review cannot clear manual evidence by adding a test name or proxy", () => {
  const f = fixture(["manual"]);
  try {
    for (const names of ["", 'test("REQ-001/AC-1 helper", () => {});\n', 'test("REQ-001/AC-1 [proxy:F2 live source] helper", () => {});\n']) {
      f.write("tests/query.test.js", names);
      assert.equal(acCoverage(f.ctx, "REQ-001/AC-1"), "manual");
      const result = fileFindings(f.ctx, [{ title: "Live source evidence absent", blocking: true, repro: "", ac: "REQ-001/AC-1", impact: "Source behavior has not been observed", fingerprint: "manual-source" }]);
      assert.deepEqual(result.iss, []);
      assert.deepEqual(result.deferred, ["Live source evidence absent"]);
      assert.match(result.notes.join("\n"), /manual/);
      assert.doesNotMatch(result.notes.join("\n"), /已有黑盒测试/);
    }
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-006/AC-10 REQ-006/AC-11 feature summary uses the bound claim instead of an unapproved newer plan", () => {
  const f = fixture();
  try {
    const text = readFileSync(join(f.root, f.aprPath), "utf8").replace("path: keel/requirements/v1.md", "path: keel/features/f01-query/plan/v1.md");
    f.write(f.aprPath, text);
    assert.equal(runApprove(f.ctx, ["APR-001"]).code, 0);
    f.write("keel/features/f01-query/plan/v2.md", "---\nfeature: F1\nreq: [REQ-999]\n---\n\n# Future proposal\n");
    const line = featureCoverageLines(f.ctx)[0] ?? "";
    assert.match(line, /REQ-001 查询/);
    assert.doesNotMatch(line, /REQ-999/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-016/AC-5 REQ-025/AC-7 I-11 install, update and sync preserve the review skill's relative reference", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-chg019-install-"));
  const source = join(dirname(fileURLToPath(import.meta.url)), "..");
  const rel = ".agents/skills/k-review/references/formal-review.md";
  try {
    const init = runCli(["init", "--name", "review-fixture", "--tier", "local", "--human", "Fixture <fixture@example.com>"], { cwd: root, source });
    assert.equal(init.code, 0, init.stderr);
    const expected = readFileSync(join(source, rel), "utf8");
    assert.equal(readFileSync(join(root, rel), "utf8"), expected);
    assert.equal(readFileSync(join(root, rel.replace(".agents", ".claude")), "utf8"), expected);
    rmSync(join(root, rel));
    const update = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(update.code, 0, update.stderr);
    assert.equal(readFileSync(join(root, rel), "utf8"), expected);
    writeFileSync(join(root, rel), expected + "\nLocal fixture note.\n", "utf8");
    assert.equal(runSync(makeCtx(root)).code, 0);
    assert.equal(readFileSync(join(root, rel.replace(".agents", ".claude")), "utf8"), expected + "\nLocal fixture note.\n");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("REQ-004/AC-1 index sorts numeric versions while preserving an explicitly selected current version", () => {
  const f = fixture();
  try {
    for (const version of [2, 9, 10]) {
      f.write(`keel/requirements/v${version}.md`, `# Requirements ${version}\n`);
      f.write(`keel/plan/overview-v${version}.md`, `# Plan ${version}\n`);
    }
    rmSync(join(f.root, "keel/requirements/INDEX.md"));
    rmSync(join(f.root, "keel/plan/INDEX.md"));
    assert.equal(runIndex(f.ctx).code, 0);
    assert.equal(readCurrent(join(f.root, "keel/requirements/INDEX.md")).file, "v10.md");
    assert.equal(readCurrent(join(f.root, "keel/plan/INDEX.md")).file, "overview-v10.md");
    f.write("keel/requirements/INDEX.md", "- current: v2.md\n");
    assert.equal(runIndex(f.ctx).code, 0);
    assert.equal(readCurrent(join(f.root, "keel/requirements/INDEX.md")).file, "v2.md");
    assert.match(readFileSync(join(f.root, "keel/requirements/INDEX.md"), "utf8"), /versions: v1.md, v2.md, v9.md, v10.md/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});
