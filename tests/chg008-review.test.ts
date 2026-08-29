// F7 review loop guards (CHG-008 → CHG-011 plan-level → CHG-013: no attack lens, no
// heterogeneity rule). What remains: the pack contract, the probe protocol, the fuse,
// G-done's gap, and the two review axes plus the robustness checklist (REQ-028).
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
  bumpRounds,
  canClear,
  completionReviewGaps,
  emptyLoop,
  fileFindings,
  packBodyHash,
  recordClear,
  recordLoopEvent,
  runLoop,
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

test("REQ-028/AC-1 core code is reviewed with the robustness checklist, which demands running the failure cases", () => {
  const checklist = readFileSync(join(repo, "keel", "review", "robustness.md"), "utf8");
  for (const item of ["中途失败", "脏数据", "边界"]) assert.ok(checklist.includes(item), item);
  const skill = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(skill, /Core code.*robustness\.md/);
  assert.match(skill, /actually run/i);
});

test("REQ-028/AC-2 auxiliary code and records get requirements coverage and obvious error paths only", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(skill, /Auxiliary code and records.*requirements\.md/);
  assert.ok(readFileSync(join(repo, "keel", "review", "requirements.md"), "utf8").length > 0);
});

test("REQ-028/AC-3 every review keeps to C-41 findings, and there is no attack-surface lens any more", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(skill, /C-41/);
  assert.match(skill, /No attack-surface lens/);
  assert.doesNotMatch(skill, /attack-surface\.md|heterogeneous|provider family/);
  assert.equal(readdirSync(join(repo, "keel", "review")).includes("attack-surface.md"), false);
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

test("REQ-027/AC-3 a fresh-context reviewer on the implementer's own harness is accepted by ingest and recorded", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c8-same-"));
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const ctx = makeCtx(dir);
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(dir, "keel", "review", "pack.json"), body, "utf8");
  writeLoopState(ctx, { ...emptyLoop("claude-code", ""), status: "packed", pack_hash: hash });
  const findings = join(dir, "findings.json");
  writeFileSync(findings, "[]", "utf8");
  const r = runLoop(ctx, ["ingest", findings, "--reviewer", "claude-code-subagent", "--implementer", "claude-code"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /status=passed/);
  assert.match(readFileSync(join(dir, "keel", "review", "disposition.md"), "utf8"), /reviewer_harness: claude-code-subagent/);
  rmSync(dir, { recursive: true, force: true });
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
  const st = emptyLoop("grok-build", "claude-code");
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
  let st = emptyLoop("a", "b");
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
  const st = {
    ...emptyLoop("grok-build", "grok-build"),
    status: "passed" as const,
    round: 1,
    pack_hash: hash,
  };
  writeLoopState(makeCtx(dir), st);
  // ISS-056: the front matter counts only with the rows gate loop writes.
  recordLoopEvent(makeCtx(dir), { ...st, round: 0 }, "pack", `pack=${hash.slice(0, 12)}`);
  recordLoopEvent(makeCtx(dir), st, "ingest", "reviewer=grok-build iss=- → passed");
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
      blocking_iss: ["ISS-001"],
      repro_runs: [{ iss: "ISS-001", command: "true", exit_code: 0, refused: false }],
    },
  });
  const gaps = evidenceGaps(ctx, readEvidence(ctx));
  assert.ok(gaps.some((g) => /still succeeds|not refused/.test(g)));
  rmSync(dir, { recursive: true, force: true });
});
