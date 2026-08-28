import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { evidenceGaps, readEvidence, writeEvidence, type Evidence } from "../tools/gate/evidence.ts";
import {
  FUSE_THRESHOLD,
  PACK_DIFF_ARGS,
  appendAttackSurface,
  bumpRounds,
  canClear,
  checklistExists,
  classifyLens,
  completionReviewGaps,
  emptyLoop,
  fileFindings,
  heterogeneousOk,
  needsHeterogeneous,
  packBodyHash,
  recordClear,
  validatePack,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function stubEvidence(): Evidence {
  return {
    command: "node --test",
    exit_code: 0,
    started: "",
    finished: "",
    git_commit: "x",
    tree_hash: "0".repeat(40),
    dirty: false,
    report_hash: "",
    counts: { passed: 1, failed: 0, skipped: 0 },
    req_coverage: {},
    stdout_tail_2kb: "ok",
    actor: { harness: "h", model: "m", session: "s" },
  };
}

test("REQ-028/AC-1 attack lens for gate and test-mechanism paths", () => {
  assert.equal(classifyLens(["tools/gate/check.ts"]), "attack");
  assert.equal(classifyLens(["tests/chg008-review.test.ts"]), "attack");
  assert.equal(needsHeterogeneous("attack"), true);
});

test("REQ-028/AC-2 robustness lens for core feature samples", () => {
  assert.equal(classifyLens(["samples/greet/greet.js"]), "robustness");
  assert.equal(needsHeterogeneous("robustness"), false);
});

test("REQ-028/AC-3 auxiliary lens for records; skills are attack-lens (ISS-028)", () => {
  assert.equal(classifyLens([".agents/skills/k-review/SKILL.md"]), "attack");
  assert.equal(classifyLens(["keel/OVERVIEW.md"]), "requirements");
});

test("REQ-028 cross-category uses the strictest lens", () => {
  assert.equal(classifyLens(["samples/greet/greet.js", "tools/gate/verify.ts"]), "attack");
});

test("REQ-028 checklists exist with section headings", () => {
  const ctx = makeCtx(repo);
  const ex = checklistExists(ctx);
  assert.equal(ex.attack, true);
  assert.equal(ex.robustness, true);
  assert.equal(ex.requirements, true);
  assert.match(readFileSync(join(repo, "keel", "review", "attack-surface.md"), "utf8"), /^# /m);
  assert.match(readFileSync(join(repo, "keel", "review", "robustness.md"), "utf8"), /中途失败/);
});

test("REQ-028/AC-5 appending a new attack grows the living list", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-atk-"));
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  writeFileSync(join(dir, "keel", "review", "attack-surface.md"), "# a\n", "utf8");
  appendAttackSurface(makeCtx(dir), "new bypass: shrink junit");
  assert.match(readFileSync(join(dir, "keel", "review", "attack-surface.md"), "utf8"), /shrink junit/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-027/AC-2 pack with implementation-chat field is refused", () => {
  const bad = validatePack({
    diff: "x",
    plan: "x",
    reqs: "x",
    evidence: "x",
    worklog_summary: "x",
    transcript: "agent said we patched it",
  });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /forbidden pack field/);
  const good = validatePack({
    diff: "x",
    plan: "x",
    reqs: "x",
    evidence: "{}",
    worklog_summary: "did the slice",
  });
  assert.equal(good.ok, true);
});

test("ISS-052 review pack partitions unstaged and staged diff sources without overlap", () => {
  assert.deepEqual(PACK_DIFF_ARGS, [["diff"], ["diff", "--cached"]]);
});

test("REQ-027/AC-3 heterogeneous required for attack; same harness is not ok", () => {
  assert.equal(heterogeneousOk(true, "grok-build", "grok-build"), false);
  assert.equal(heterogeneousOk(true, "grok-build", "claude-code"), true);
  assert.equal(heterogeneousOk(false, "grok-build", "grok-build"), true);
});

test("REQ-027/AC-4 blocking without a repro command does not open an ISS", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-iss-"));
  mkdirSync(join(dir, "keel", "templates"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "features", "f07-review"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "templates", "ISS.md"),
    readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"),
    "utf8",
  );
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const ctx = makeCtx(dir);
  const out = fileFindings(
    ctx,
    [{ title: "maybe broken", blocking: true, repro: "" }],
    "keel/features/f07-review/worklog.md",
  );
  assert.deepEqual(out.iss, []);
  assert.equal(out.deferred.length, 1);
  assert.equal(readdirSync(join(dir, "keel", "issues")).filter((n) => n.startsWith("ISS-")).length, 0);
  assert.match(readFileSync(join(dir, "keel", "features", "f07-review", "worklog.md"), "utf8"), /待核实/);
  const filed = fileFindings(
    ctx,
    [{ title: "real hole", blocking: true, repro: "node -e \"process.exit(0)\"", impact: "blocks delivery" }],
    "keel/features/f07-review/worklog.md",
  );
  assert.equal(filed.iss.length, 1);
  assert.match(filed.iss[0] ?? "", /^ISS-\d+/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-027/AC-5 repro that still succeeds cannot clear", () => {
  assert.equal(canClear([{ iss: "ISS-001", command: "x", exit_code: 0, refused: false }], ["ISS-001"]), false);
  assert.equal(canClear([{ iss: "ISS-001", command: "x", exit_code: 1, refused: true }], ["ISS-001"]), true);
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-clr-"));
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const ctx = makeCtx(dir);
  const st = emptyLoop("attack", "grok-build", "claude-code");
  st.blocking_iss = ["ISS-001"];
  st.pack_hash = "pack";
  writeLoopState(ctx, st);
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "issues", "ISS-001.md"),
    "---\nid: ISS-001\nstatus: open\nfingerprint: x\n---\n# t\n\n复现命令：\n\n```\nexit 0\n```\n",
    "utf8",
  );
  const r = recordClear(ctx, "grok-build", "claude-code");
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /review loop passed/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-027/AC-6 three uncleared rounds fuse", () => {
  let st = emptyLoop("attack", "a", "b");
  st.blocking_iss = ["ISS-009"];
  st = bumpRounds(st, ["ISS-009"]);
  st = bumpRounds(st, ["ISS-009"]);
  st = bumpRounds(st, ["ISS-009"]);
  assert.equal(st.status, "fused");
  assert.ok((st.rounds_on["ISS-009"] ?? 0) >= FUSE_THRESHOLD);
});

test("REQ-027/AC-1 claiming done without a passed loop is a G-done gap", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-done-"));
  mkdirSync(join(dir, "keel", "features", "f01-x"), { recursive: true });
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(dir, "keel", "features", "f01-x", "summary.md"), "# s\n", "utf8");
  assert.ok(completionReviewGaps(makeCtx(dir)).some((g) => /REQ-027/.test(g)));
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(dir, "keel", "review", "pack.json"), body, "utf8");
  writeLoopState(makeCtx(dir), {
    ...emptyLoop("robustness", "grok-build", "grok-build"),
    status: "passed",
    pack_hash: hash,
  });
  assert.deepEqual(completionReviewGaps(makeCtx(dir)), []);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-027 evidenceGaps flags a passed review whose repro still exits 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-ev-"));
  mkdirSync(join(dir, "keel", "evidence"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const ctx = makeCtx(dir);
  writeEvidence(ctx, {
    ...stubEvidence(),
    review: {
      status: "passed",
      heterogeneous_required: true,
      heterogeneous_ok: false,
      blocking_iss: ["ISS-001"],
      repro_runs: [{ iss: "ISS-001", command: "true", exit_code: 0, refused: false }],
    },
  });
  const gaps = evidenceGaps(ctx, readEvidence(ctx));
  assert.ok(gaps.some((g) => /heterogeneous|still succeeds|not refused/.test(g)));
  rmSync(dir, { recursive: true, force: true });
});
