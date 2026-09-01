// CHG-014 S6 (DEC-189): the plan-level review loop rejects malformed reviewer output
// whole (archiving it), keeps lockfiles out of the pack, warns when a pack outgrows a
// reviewer, and counts a recurrence chain against one fuse.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import {
  baseDiff,
  bumpRounds,
  emptyLoop,
  type LoopState,
  packBudgetWarnings,
  readLoopState,
  rootFingerprint,
  runLoop,
  validateFindings,
} from "../tools/gate/reviewloop.ts";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
scrubProcessGitEnv(process.env);

function git(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
  return r.stdout.trim();
}

function fixture(tag: string, config: { [k: string]: unknown } = {}): string {
  const root = mkdtempSync(join(tmpdir(), `keel-chg014-loop-${tag}-`));
  for (const d of ["features", "review", "plan", "requirements", "issues", "templates"]) {
    mkdirSync(join(root, "keel", d), { recursive: true });
  }
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel", enforcement_tier: "local", ...config }), "utf8");
  writeFileSync(join(root, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "plan", "overview-v1.md"), "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(join(root, "keel", "requirements", "v1.md"), "# r\n\n## 未决问题\n", "utf8");
  writeFileSync(join(root, "keel", "templates", "ISS.md"), readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8"), "utf8");
  writeFileSync(join(root, ".gitignore"), "keel/review/pack.json\nkeel/evidence/*.json\n", "utf8");
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\npackages:\n  a@1.0.0: {}\n", "utf8");
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "t"]);
  git(root, ["config", "user.email", "t@t.t"]);
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "fixture"]);
  return root;
}

test("REQ-027/AC-12 validateFindings names every gap and ingest rejects the file whole while archiving it verbatim", () => {
  assert.deepEqual(validateFindings({ findings: [] }), { ok: false, errors: ["findings.json must be a JSON array of Finding objects"] });
  const bad = validateFindings([
    { title: "no blocking flag, a severity label instead", severity: "high", repro: "exit 0", impact: "x" },
    { title: "", blocking: "yes", fingerprint: "fp" },
    { title: "repro is not a string", blocking: true, repro: ["exit 0"], impact: "x" },
    { title: "blocking without probe is DEC-182's business, not a shape error", blocking: true, impact: "x" },
    "not an object",
  ]);
  assert.equal(bad.ok, false);
  const errors = bad.ok ? [] : bad.errors;
  assert.ok(errors.some((e) => /finding\[0\].*blocking must be true or false/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /finding\[1\]: title missing/.test(e)));
  assert.ok(errors.some((e) => /finding\[1\].*blocking must be true or false/.test(e)));
  assert.ok(errors.some((e) => /finding\[2\]: repro must be a string/.test(e)));
  assert.ok(!errors.some((e) => /finding\[3\]/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /finding\[4\]: not an object/.test(e)));
  const good = validateFindings([{ title: "t", blocking: false, fingerprint: "fp", recurrence_of: "ISS-001" }]);
  assert.ok(good.ok);
  assert.equal(good.ok ? good.findings[0]?.recurrence_of : "", "ISS-001");

  const root = fixture("ingest");
  const base = git(root, ["rev-parse", "HEAD"]);
  writeFileSync(join(root, "src.txt"), "changed\n", "utf8");
  const ctx = makeCtx(root);
  assert.equal(runLoop(ctx, ["pack", "--base", base, "--implementer", "codex", "--reviewer", "claude-code"]).code, 0);
  // the reviewer's file lives outside the tree under review (an untracked file would move the tree, ISS-023)
  const findings = join(mkdtempSync(join(tmpdir(), "keel-chg014-findings-")), "findings.json");
  writeFileSync(findings, JSON.stringify({ findings: [{ title: "x" }] }), "utf8");
  const rejected = runLoop(ctx, ["ingest", findings, "--reviewer", "claude-code"]);
  assert.equal(rejected.code, 1);
  assert.match(rejected.stderr, /findings rejected \(1 gap\(s\)\); archived as keel\/review\/raw\/round-1-claude-code\.json/);
  assert.match(rejected.stderr, /must be a JSON array/);
  const raw = join(root, "keel", "review", "raw", "round-1-claude-code.json");
  assert.equal(readFileSync(raw, "utf8"), JSON.stringify({ findings: [{ title: "x" }] }));
  assert.equal(readLoopState(ctx)?.status, "packed");
  writeFileSync(findings, JSON.stringify([{ title: "advisory only", blocking: false, fingerprint: "adv-1" }]), "utf8");
  const accepted = runLoop(ctx, ["ingest", findings, "--reviewer", "claude-code"]);
  assert.equal(accepted.code, 0, accepted.stderr);
  assert.equal(readLoopState(ctx)?.status, "passed");
  // only the rejected file was archived; an accepted round adds nothing beyond findings.md / disposition.md (REQ-027 AC-10)
  assert.deepEqual(readdirSync(join(root, "keel", "review", "raw")), ["round-1-claude-code.json"]);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-11 lockfiles never enter the diff body, only a name + hash + lines summary; an oversized pack field warns and names the dominating file", () => {
  const root = fixture("lock", { review: { pack_budget: 40 } });
  const base = git(root, ["rev-parse", "HEAD"]);
  writeFileSync(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\npackages:\n  a@1.0.0: {}\n  b@2.0.0: {}\n", "utf8");
  writeFileSync(join(root, "big.txt"), "x".repeat(200) + "\n", "utf8");
  writeFileSync(join(root, "uv.lock"), "version = 1\n", "utf8");
  const ctx = makeCtx(root);
  const diff = baseDiff(ctx, base);
  assert.doesNotMatch(diff, /b@2\.0\.0/, diff);
  assert.doesNotMatch(diff, /version = 1/);
  assert.match(diff, /# lockfiles \(bodies omitted, DEC-189\):/);
  assert.match(diff, /- pnpm-lock\.yaml sha256=[0-9a-f]{16} lines=\d+/);
  assert.match(diff, /- uv\.lock sha256=[0-9a-f]{16} lines=\d+/);
  assert.match(diff, /big\.txt/);
  const packed = runLoop(ctx, ["pack", "--base", base, "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(packed.code, 0, packed.stderr);
  assert.match(packed.stdout, /warn: pack field 'diff' is \d+ chars > reviewer budget 40 \(DEC-189\) — largest file big\.txt/);
  assert.ok(existsSync(join(root, "keel", "review", "pack.json")));
  const warnings = packBudgetWarnings(ctx, { diff: "x".repeat(41), plan: "", reqs: "", evidence: "", worklog_summary: "" });
  assert.equal(warnings.length, 1);
  assert.deepEqual(packBudgetWarnings(makeCtx(root), { diff: "", plan: "", reqs: "", evidence: "", worklog_summary: "" }), []);
  rmSync(root, { recursive: true, force: true });
});

test("REQ-027/AC-13 a recurrence chain shares one fuse counter: the third open round on any link fuses the loop", () => {
  const root = fixture("chain");
  const iss = (id: string, fp: string, recurrenceOf = ""): void => {
    writeFileSync(
      join(root, "keel", "issues", `${id}-x.md`),
      `---\nid: ${id}\nstatus: open\nfingerprint: "${fp}"\nrecurrence_of: "${recurrenceOf}"\n---\n\n# ${id}\n\n## 影响\n\n复现命令：\n\n\`\`\`\nexit 0\n\`\`\`\n`,
      "utf8",
    );
  };
  iss("ISS-001", "apr-body-hash-bypass");
  iss("ISS-002", "apr-body-hash-bypass-live-sha", "ISS-001");
  iss("ISS-003", "apr-history-erase", "ISS-002");
  const ctx = makeCtx(root);
  assert.equal(rootFingerprint(ctx, "ISS-001"), "apr-body-hash-bypass");
  assert.equal(rootFingerprint(ctx, "ISS-002"), "apr-body-hash-bypass");
  assert.equal(rootFingerprint(ctx, "ISS-003"), "apr-body-hash-bypass");
  assert.equal(rootFingerprint(ctx, "ISS-999", "fallback-fp"), "fallback-fp");
  // round 1: ISS-001 open; round 2: fixed, ISS-002 recurs; round 3: fixed, ISS-003 recurs → fused
  const rootOf = (id: string): string => rootFingerprint(ctx, id, id);
  let st: LoopState = { ...emptyLoop("codex", "claude-code"), blocking_iss: ["ISS-001"], iss_fp: { "ISS-001": "apr-body-hash-bypass" } };
  st = bumpRounds(st, ["ISS-001"], rootOf);
  assert.equal(st.status, "repairing");
  st = { ...st, blocking_iss: ["ISS-002"], iss_fp: { ...st.iss_fp, "ISS-002": "apr-body-hash-bypass-live-sha" } };
  st = bumpRounds(st, ["ISS-002"], rootOf);
  assert.equal(st.status, "repairing");
  assert.equal(st.rounds_on["apr-body-hash-bypass"], 2);
  st = { ...st, blocking_iss: ["ISS-003"], iss_fp: { ...st.iss_fp, "ISS-003": "apr-history-erase" } };
  st = bumpRounds(st, ["ISS-003"], rootOf);
  assert.equal(st.rounds_on["apr-body-hash-bypass"], 3);
  assert.equal(st.status, "fused");
  // without the resolver each fresh fingerprint would have restarted the count (the old behaviour)
  const old = bumpRounds({ ...emptyLoop("codex", "claude-code"), rounds_on: { "apr-body-hash-bypass": 2 }, iss_fp: { "ISS-003": "apr-history-erase" } }, ["ISS-003"]);
  assert.equal(old.status, "repairing");
  rmSync(root, { recursive: true, force: true });
});
