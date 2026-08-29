import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { execModeGaps } from "../tools/gate/execmode.ts";
import { readEvidence, writeEvidence, type EvidenceReview } from "../tools/gate/evidence.ts";
import { parseFrontmatter, readAttrList } from "../tools/gate/frontmatter.ts";
import { runVerify } from "../tools/gate/verify.ts";
import {
  FUSE_THRESHOLD,
  bumpRounds,
  classifyLens,
  completionReviewGaps,
  completionReviewWarnings,
  emptyLoop,
  packBodyHash,
  readLoopState,
  recordLoopEvent,
  runLoop,
  validatePack,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";
import { runCli } from "../tools/cli/main.js";
import { runDoctor } from "../tools/cli/doctor.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

function keelCfg(dir: string): void {
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "templates"), { recursive: true });
  mkdirSync(join(dir, "keel", "features"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(
    join(dir, "keel", "templates", "ISS.md"),
    readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"),
    "utf8",
  );
}

function gitReady(dir: string): void {
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "r4@example.com"]);
  git(dir, ["config", "user.name", "r4"]);
}

function writePackState(
  dir: string,
  extra: { [k: string]: unknown } = {},
): { hash: string } {
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  writeFileSync(join(dir, "keel", "review", "pack.json"), body, "utf8");
  const st = {
    ...emptyLoop("requirements", "grok-build", "claude-code"),
    status: "passed" as const,
    pack_hash: hash,
    ...extra,
  };
  writeLoopState(makeCtx(dir), st);
  // ISS-056: a passed front matter counts only with the rows gate loop writes.
  recordLoopEvent(makeCtx(dir), { ...st, round: 0 }, "pack", `pack=${hash.slice(0, 12)}`);
  if (st.status === "passed") recordLoopEvent(makeCtx(dir), st, "verdict", "reviewer=claude-code still_open=- → passed");
  return { hash };
}

test("ISS-023 empty ingest without pack does not mark the loop passed", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-023-empty-"));
  keelCfg(dir);
  const findings = join(dir, "findings.json");
  writeFileSync(findings, "[]", "utf8");
  const r = runLoop(makeCtx(dir), ["ingest", findings]);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.match(r.stderr, /pack before ingest|empty findings are not a review/);
  const st = runLoop(makeCtx(dir), ["status"]);
  assert.doesNotMatch(st.stdout, /review loop: passed/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-023 passed loop binds tree_hash; later edits stale G-done", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-023-tree-"));
  keelCfg(dir);
  gitReady(dir);
  writeFileSync(join(dir, "README.md"), "one\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "base"]);
  writeFileSync(join(dir, "notes.md"), "n1\n", "utf8");
  const ctx = makeCtx(dir);
  const findings = join(tmpdir(), `keel-r4-findings-${process.pid}.json`);
  writeFileSync(findings, "[]", "utf8");
  const packed = runLoop(ctx, [
    "pack", "--base", "HEAD",
    "--feature",
    "",
    "--implementer",
    "grok-build",
    "--reviewer",
    "grok-build",
  ]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  assert.match(packed.stdout, /lens=requirements/);
  const ing = runLoop(ctx, ["ingest", findings, "--reviewer", "grok-build"]);
  assert.equal(ing.code, 0, ing.stdout + ing.stderr);
  assert.match(ing.stdout, /status=passed/);
  assert.deepEqual(completionReviewGaps(ctx), []);
  writeFileSync(join(dir, "notes.md"), "n2\n", "utf8");
  // CHG-011: a tree that moved after a passed review is a WARN, not a FAIL (REQ-027/AC-10).
  const warnings = completionReviewWarnings(ctx);
  assert.ok(warnings.some((g) => /tree is now/.test(g)), warnings.join("; "));
  rmSync(findings, { force: true });
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-024 production pack classifies a gate file as attack, not classifyLens([])", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-024-atk-"));
  keelCfg(dir);
  gitReady(dir);
  writeFileSync(join(dir, "README.md"), "doc\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "docs"]);
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
  writeFileSync(join(dir, "tools", "gate", "check.ts"), "export const x = 1;\n", "utf8");
  const packed = runLoop(makeCtx(dir), [
    "pack", "--base", "HEAD",
    "--implementer",
    "grok-build",
    "--reviewer",
    "claude-code",
  ]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  assert.match(packed.stdout, /lens=attack/);
  assert.match(packed.stdout, /het_required=true/);
  const st = runLoop(makeCtx(dir), ["status"]);
  assert.match(st.stdout, /lens=attack/);
  assert.match(st.stdout, /het_required=true/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-024 production pack classifies a docs-only dirty tree as requirements", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-024-doc-"));
  keelCfg(dir);
  gitReady(dir);
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
  writeFileSync(join(dir, "tools", "gate", "check.ts"), "export const x = 1;\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "gate"]);
  writeFileSync(join(dir, "README.md"), "only docs\n", "utf8");
  const packed = runLoop(makeCtx(dir), ["pack", "--base", "HEAD", "--implementer", "grok-build", "--reviewer", "grok-build"]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  assert.match(packed.stdout, /lens=requirements/);
  assert.match(packed.stdout, /het_required=false/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-024 flipping heterogeneous_required in state.json does not drop the het gap", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-024-flag-"));
  keelCfg(dir);
  writePackState(dir, {
    status: "passed",
    paths: ["tools/gate/check.ts"],
    implementer_harness: "grok-build",
    reviewer_harness: "grok-build",
    heterogeneous_required: false,
  });
  const gaps = completionReviewGaps(makeCtx(dir));
  assert.ok(gaps.some((g) => /heterogeneous/.test(g)), gaps.join("; "));
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-025 gate loop clear refuses when the repro still exits 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-025-live-"));
  keelCfg(dir);
  writeFileSync(
    join(dir, "keel", "issues", "ISS-001.md"),
    "---\nid: ISS-001\nstatus: open\nfingerprint: x\n---\n# t\n\n复现命令：\n\n```\nexit 0\n```\n",
    "utf8",
  );
  writePackState(dir, {
    status: "repairing",
    blocking_iss: ["ISS-001"],
    paths: ["README.md"],
  });
  const r = runLoop(makeCtx(dir), ["clear", "--implementer", "grok-build", "--reviewer", "claude-code"]);
  assert.equal(r.code, 1, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /review loop passed/);
  const st = readLoopState(makeCtx(dir));
  assert.ok(st && st.status !== "passed");
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-025 gate loop clear passes only after the repro is refused", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-025-ok-"));
  keelCfg(dir);
  writeFileSync(
    join(dir, "keel", "issues", "ISS-001.md"),
    "---\nid: ISS-001\nstatus: open\nfingerprint: x\n---\n# t\n\n复现命令：\n\n```\nexit 1\n```\n",
    "utf8",
  );
  writePackState(dir, {
    status: "repairing",
    blocking_iss: ["ISS-001"],
    paths: ["README.md"],
    implementer_harness: "grok-build",
    reviewer_harness: "claude-code",
  });
  const r = runLoop(makeCtx(dir), ["clear", "--implementer", "grok-build", "--reviewer", "claude-code"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /review loop passed/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-026 verify preserves the evidence review field", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-026-rev-"));
  keelCfg(dir);
  mkdirSync(join(dir, "tests"), { recursive: true });
  mkdirSync(join(dir, "keel", "evidence"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      profiles: { active: ["keel-gate"], "keel-gate": { test_command: "node --test" } },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "tests", "ok.test.js"),
    "const { test } = require('node:test');\ntest('ok', () => {});\n",
    "utf8",
  );
  gitReady(dir);
  writeFileSync(join(dir, ".gitignore"), "keel/evidence/*.json\nkeel/evidence/*.xml\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "t"]);
  const ctx = makeCtx(dir);
  const review: EvidenceReview = {
    status: "passed",
    lens: "requirements",
    implementer_harness: "grok-build",
    reviewer_harness: "claude-code",
    heterogeneous_required: false,
    heterogeneous_ok: true,
    blocking_iss: [],
    repro_runs: [],
    round: 1,
  };
  writeEvidence(ctx, {
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
    review,
  });
  const v = runVerify(ctx);
  assert.equal(v.code, 0, v.stdout + v.stderr);
  const ev = readEvidence(ctx);
  assert.ok(ev && "review" in ev && ev.review, "review field wiped");
  assert.equal(ev?.review?.status, "passed");
  assert.equal(ev?.review?.round, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-026 fuse counts by fingerprint across new ISS ids", () => {
  let st = emptyLoop("attack", "a", "b");
  st.iss_fp = { "ISS-010": "stable-fp", "ISS-011": "stable-fp", "ISS-012": "stable-fp" };
  st.blocking_iss = ["ISS-010"];
  st = bumpRounds(st, ["ISS-010"]);
  st = bumpRounds(st, ["ISS-011"]);
  st = bumpRounds(st, ["ISS-012"]);
  assert.equal(st.status, "fused");
  assert.ok((st.rounds_on["stable-fp"] ?? 0) >= FUSE_THRESHOLD);
});

test("ISS-027 doctor fails when gate.ts is missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-027-gate-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", project_name: "demo" }),
    "utf8",
  );
  const r = runDoctor(dir, repo, process.versions.node);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /missing-gate|gate\.ts/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-027 doctor fails after uninstall", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-027-un-"));
  gitReady(dir);
  const init = runCli(["init", "--name", "u", "--tier", "local"], { cwd: dir, source: repo });
  assert.equal(init.code, 0, init.stdout + init.stderr);
  const un = runCli(["uninstall"], { cwd: dir, source: repo });
  assert.equal(un.code, 0, un.stdout + un.stderr);
  assert.ok(existsSync(join(dir, "keel", "config.json")));
  assert.equal(existsSync(join(dir, "tools", "gate", "gate.ts")), false);
  const doc = runCli(["doctor"], { cwd: dir, source: repo });
  assert.equal(doc.code, 1, doc.stdout + doc.stderr);
  assert.match(doc.stderr, /missing-gate|gate\.ts/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-027 execModeGaps reports missing hook files instead of skipping", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-027-exec-"));
  keelCfg(dir);
  gitReady(dir);
  writeFileSync(join(dir, "README.md"), "x\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "n"]);
  const gaps = execModeGaps(makeCtx(dir));
  assert.ok(gaps.some((g) => /missing from git index/.test(g)), gaps.join("; "));
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-028 attack lens includes gate-input paths", () => {
  const attack = [
    "keel/evidence/verify.json",
    "keel/config.json",
    "package.json",
    ".agents/skills/k-review/SKILL.md",
    ".claude/skills/k-review/SKILL.md",
    "keel/review/attack-surface.md",
    "keel/review/disposition.md",
  ];
  for (const p of attack) {
    assert.equal(classifyLens([p]), "attack", p);
  }
});

test("ISS-028 production pack classifies keel/review/ as attack", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r4-028-rev-"));
  keelCfg(dir);
  gitReady(dir);
  writeFileSync(join(dir, "README.md"), "d\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "base"]);
  writeFileSync(join(dir, "keel", "review", "attack-surface.md"), "# a\n- new\n", "utf8");
  const packed = runLoop(makeCtx(dir), [
    "pack", "--base", "HEAD",
    "--implementer",
    "grok-build",
    "--reviewer",
    "claude-code",
  ]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  assert.match(packed.stdout, /lens=attack/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-028 pack refuses chatty worklog_summary and oversized fields", () => {
  const chat = validatePack({
    diff: "x",
    plan: "x",
    reqs: "x",
    evidence: "{}",
    worklog_summary: "user: hi\nassistant: I will patch it\nuser: go\n",
  });
  assert.equal(chat.ok, false);
  if (!chat.ok) assert.match(chat.error, /transcript|chat/i);
  const big = validatePack({
    diff: "x",
    plan: "x",
    reqs: "x",
    evidence: "{}",
    worklog_summary: "n".repeat(5000),
  });
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.error, /exceeds/);
});

test("ISS-029 f07 plan v2 aligns with confirmed DEC-159/160 and does not say het is optional", () => {
  const planDir = join(repo, "keel", "features", "f07-review", "plan");
  const v2 = readFileSync(join(planDir, "v2.md"), "utf8");
  const v1 = readFileSync(join(planDir, "v1.md"), "utf8");
  assert.match(v1, /异构复审是可选配置，默认关/);
  assert.doesNotMatch(v2, /异构复审是可选配置，默认关/);
  const { attrs } = parseFrontmatter(v2);
  const aligns = readAttrList(attrs.aligns);
  assert.ok(aligns.includes("DEC-159"), attrs.aligns);
  assert.ok(aligns.includes("DEC-160"), attrs.aligns);
  for (const id of aligns) {
    const names = ["DEC-159-C-159-auto-review-loop.md", "DEC-160-C-160-review-lens-by-code-kind.md"];
    const hit = names.find((n) => n.startsWith(id));
    if (!hit) throw new Error(`missing DEC file for ${id}`);
    const dec = readFileSync(join(repo, "keel", "decisions", hit), "utf8");
    const st = parseFrontmatter(dec).attrs.status;
    assert.equal(st, "confirmed", id);
  }
  assert.match(v2, /强制异构/);
  assert.match(v2, /DEC-159/);
});
