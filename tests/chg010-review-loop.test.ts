import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import {
  evidenceFresh,
  evidenceGaps,
  readEvidence,
  type EvidenceReviewRun,
} from "../tools/gate/evidence.ts";
import {
  emptyLoop,
  packBodyHash,
  runLoop,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);

function git(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(result.stderr || result.stdout || args.join(" "));
  }
}

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-chg010-review-history-"));
  for (const dir of ["evidence", "issues", "requirements", "review"]) {
    mkdirSync(join(root, "keel", dir), { recursive: true });
  }
  mkdirSync(join(root, "tests"), { recursive: true });
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      profiles: {
        active: ["keel-gate"],
        "keel-gate": { test_command: "node --test" },
      },
    }),
    "utf8",
  );
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(root, "src.txt"), "before\n", "utf8");
  writeFileSync(
    join(root, "probe.js"),
    "const { existsSync } = require('node:fs');\nprocess.exit(existsSync('fixed.flag') ? 1 : 0);\n",
    "utf8",
  );
  writeFileSync(
    join(root, "tests", "ok.test.js"),
    "const { test } = require('node:test');\ntest('ok', () => {});\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "INDEX.md"),
    "- current: v1.md\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "requirements", "v1.md"),
    "# requirements\n\n## REQ-027 review\n",
    "utf8",
  );
  writeFileSync(
    join(root, "keel", "issues", "ISS-001.md"),
    "---\n" +
      "id: ISS-001\n" +
      "status: open\n" +
      "fingerprint: review-history\n" +
      "---\n" +
      "# review finding\n\n" +
      "复现命令：\n\n" +
      "```\n" +
      "node probe.js\n" +
      "```\n",
    "utf8",
  );
  writeFileSync(
    join(root, ".gitignore"),
    "keel/evidence/*.json\n" +
      "keel/evidence/*.xml\n" +
      "keel/review/pack.json\n" +
      "keel/review/state.json\n" +
      "keel/review/rounds.json\n",
    "utf8",
  );
  git(root, ["init"]);
  git(root, ["config", "user.email", "review@example.com"]);
  git(root, ["config", "user.name", "review"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--no-verify", "-m", "fixture"]);

  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(root, "keel", "review", "pack.json"), body, "utf8");
  writeLoopState(makeCtx(root), {
    ...emptyLoop("requirements", "codex", "claude-code"),
    status: "repairing",
    blocking_iss: ["ISS-001"],
    paths: ["src.txt"],
    pack_hash: hash,
  });
  return root;
}

function reviewRuns(root: string): EvidenceReviewRun[] {
  return readEvidence(makeCtx(root))?.review?.repro_runs ?? [];
}

function ingestFixture(
  tag: string,
  finding: { title: string; blocking: boolean; repro: string; impact?: string },
  probeExit?: number,
): { root: string; findings: string } {
  const root = mkdtempSync(join(tmpdir(), `keel-chg010-ingest-${tag}-`));
  for (const dir of ["issues", "review", "templates", "features/f07-review"]) {
    mkdirSync(join(root, "keel", dir), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(root, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  if (probeExit !== undefined) {
    writeFileSync(join(root, "ingest-probe.js"), `process.exit(${probeExit});\n`, "utf8");
  }
  writeFileSync(
    join(root, "keel", "templates", "ISS.md"),
    "---\n" +
      "id: ISS-000\nschema: iss-v2\nstatus: open\ndefense_kind: \"\"\ndefense_pointer: \"\"\n" +
      "feature: \"\"\nfingerprint: \"\"\nsource: \"\"\nrecurrence_of: \"\"\n" +
      "prior_defense_failure: \"\"\ndefense_escalation: \"\"\ndate: YYYY-MM-DD\n---\n\n" +
      "# ISS-000 title\n\n## 现象\n\n## 影响\n\n复现命令：\n\n## 待诊断防线\n\n" +
      "## 根因\n\n## 修复\n\n## 为何未被更早发现\n\n## 闭环选择与理由\n",
    "utf8",
  );
  const findings = join(root, "findings.json");
  writeFileSync(findings, JSON.stringify([finding]), "utf8");
  writeFileSync(
    join(root, ".gitignore"),
    "keel/review/pack.json\nkeel/review/state.json\nkeel/review/rounds.json\n",
    "utf8",
  );
  git(root, ["init"]);
  git(root, ["config", "user.email", "ingest@example.com"]);
  git(root, ["config", "user.name", "ingest"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "--no-verify", "-m", "fixture"]);
  const packed = runLoop(makeCtx(root), [
    "pack",
    "--implementer",
    "codex",
    "--reviewer",
    "claude-code",
  ]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  return { root, findings };
}

function issueFiles(root: string): string[] {
  return readdirSync(join(root, "keel", "issues")).filter((name) => name.startsWith("ISS-"));
}

test("REQ-027/AC-9 repeated gate loop clear appends round/time/tree history and never erases earlier repro runs", () => {
  const root = fixture();
  const ctx = makeCtx(root);
  try {
    const vulnerable = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
    assert.equal(vulnerable.code, 1, vulnerable.stdout + vulnerable.stderr);
    assert.match(vulnerable.stdout + vulnerable.stderr, /still_open=ISS-001/);

    writeFileSync(join(root, "fixed.flag"), "fixed\n", "utf8");
    const fixed = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
    assert.equal(fixed.code, 0, fixed.stdout + fixed.stderr);
    assert.match(fixed.stdout, /review loop passed/);

    const afterFix = reviewRuns(root);
    assert.equal(afterFix.length, 2, JSON.stringify(afterFix));
    assert.deepEqual(afterFix.map((run) => run.refused), [false, true]);
    assert.deepEqual(afterFix.map((run) => run.round), [1, 2]);
    for (const run of afterFix) {
      assert.match(run.recorded_at ?? "", /^\d{4}-\d{2}-\d{2}T/);
      assert.match(run.tree_hash ?? "", /^[0-9a-f]{40}$/);
    }
    assert.notEqual(afterFix[0]?.tree_hash, afterFix[1]?.tree_hash);

    const redundant = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
    assert.equal(redundant.code, 0, redundant.stdout + redundant.stderr);
    assert.deepEqual(reviewRuns(root), afterFix, "redundant clear erased or rewrote audit history");

    const reviewOnlyGaps = evidenceGaps(ctx, readEvidence(ctx))
      .filter((gap) => /repro|not refused|still succeeds/.test(gap));
    assert.deepEqual(reviewOnlyGaps, [], reviewOnlyGaps.join("; "));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-006/AC-3 REQ-006/AC-4 gate verify preserves review history while a changed tree stales and a rerun refreshes evidence", () => {
  const root = fixture();
  const ctx = makeCtx(root);
  try {
    assert.equal(
      runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]).code,
      1,
    );
    writeFileSync(join(root, "fixed.flag"), "fixed\n", "utf8");
    assert.equal(
      runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]).code,
      0,
    );
    const history = reviewRuns(root);
    assert.equal(history.length, 2);

    const firstVerify = runVerify(ctx);
    assert.equal(firstVerify.code, 0, firstVerify.stdout + firstVerify.stderr);
    const fresh = readEvidence(ctx);
    if (!fresh) throw new Error("verify.json missing after first verify");
    assert.deepEqual(fresh.review?.repro_runs, history);
    assert.equal(evidenceFresh(ctx, fresh), true);

    writeFileSync(join(root, "src.txt"), "after\n", "utf8");
    assert.equal(evidenceFresh(ctx, fresh), false, "tree change did not stale old evidence");

    const secondVerify = runVerify(ctx);
    assert.equal(secondVerify.code, 0, secondVerify.stdout + secondVerify.stderr);
    const refreshed = readEvidence(ctx);
    if (!refreshed) throw new Error("verify.json missing after second verify");
    assert.equal(evidenceFresh(ctx, refreshed), true);
    assert.notEqual(refreshed.tree_hash, fresh.tree_hash);
    assert.deepEqual(refreshed.review?.repro_runs, history);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-2 REQ-027/AC-4 gate loop ingest opens a blocking ISS only after its attack probe exits 0", () => {
  const { root, findings } = ingestFixture("vulnerable", {
    title: "reproducible hole",
    blocking: true,
    repro: "node ingest-probe.js",
    impact: "release gate can be bypassed",
  }, 0);
  try {
    const result = runLoop(makeCtx(root), ["ingest", findings, "--reviewer", "claude-code"]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /filed iss=ISS-\d+.*status=repairing/);
    const files = issueFiles(root);
    assert.equal(files.length, 1);
    const issue = readFileSync(join(root, "keel", "issues", files[0] ?? ""), "utf8");
    assert.match(issue, /node ingest-probe\.js/);
    assert.match(issue, /source: review-loop/);
    assert.match(issue, /## 现象\s+reproducible hole/);
    assert.match(issue, /## 影响\s+release gate can be bypassed/);
    assert.match(issue, /## 待诊断防线\s+待诊断/);
    assert.match(issue, /probe_exit_code: 0/);
    assert.match(issue, /probe_recorded_at: \d{4}-\d{2}-\d{2}T/);
    assert.match(issue, /probe_tree_hash: [0-9a-f]{40}/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-2 REQ-027/AC-4 gate loop ingest defers a blocking finding whose first attack probe is already nonzero", () => {
  const { root, findings } = ingestFixture("not-reproduced", {
    title: "probe already refused",
    blocking: true,
    repro: "node ingest-probe.js",
    impact: "release gate can be bypassed",
  }, 7);
  try {
    const result = runLoop(makeCtx(root), ["ingest", findings, "--reviewer", "claude-code"]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /filed iss=- deferred=1/);
    assert.deepEqual(issueFiles(root), []);
    const worklog = readFileSync(join(root, "keel", "review", "findings.md"), "utf8");
    assert.match(worklog, /攻击探针首次退出 7/);
    assert.match(worklog, /probe already refused/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-2 REQ-027/AC-4 gate loop ingest defers a blocking finding with no attack probe command", () => {
  const { root, findings } = ingestFixture("missing", {
    title: "missing probe",
    blocking: true,
    repro: "",
    impact: "release gate can be bypassed",
  });
  try {
    const result = runLoop(makeCtx(root), ["ingest", findings, "--reviewer", "claude-code"]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /filed iss=- deferred=1/);
    assert.deepEqual(issueFiles(root), []);
    const worklog = readFileSync(join(root, "keel", "review", "findings.md"), "utf8");
    assert.match(worklog, /无复现命令/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-010/AC-2 gate loop ingest defers a blocking finding whose impact is absent instead of inventing it", () => {
  const { root, findings } = ingestFixture("missing-impact", {
    title: "impact not supplied",
    blocking: true,
    repro: "node ingest-probe.js",
  }, 0);
  try {
    const result = runLoop(makeCtx(root), ["ingest", findings, "--reviewer", "claude-code"]);
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /filed iss=- deferred=1/);
    assert.deepEqual(issueFiles(root), []);
    const worklog = readFileSync(join(root, "keel", "review", "findings.md"), "utf8");
    assert.match(worklog, /无影响说明/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
