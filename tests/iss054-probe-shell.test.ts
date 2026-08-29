// ISS-054: attack probes are POSIX one-liners; on Windows cmd.exe broke the quoting a
// `node -e "…"` probe needs, so every real hole read as "not reproduced" and the first
// live plan-level review "passed" with four unverified blocking findings.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import { probeShell, runLoop, runReproCommand, emptyLoop, packBodyHash, writeLoopState, readLoopState } from "../tools/gate/reviewloop.ts";

test("ISS-054 a probe with nested double quotes runs the same on every OS: exit 0 means the hole is present", () => {
  assert.ok(probeShell(), "a POSIX sh must be available (hooks already require it, DEC-146)");
  const probe = 'node -e "const s=\'hole\';process.exit(s.includes(\\"hole\\")?0:1)"';
  const r = runReproCommand(process.cwd(), probe);
  assert.equal(r.exit_code, 0, r.stdout);
  assert.equal(r.refused, false);
  const refuted = runReproCommand(process.cwd(), 'node -e "process.exit(\\"fixed\\".length > 0 ? 3 : 0)"');
  assert.equal(refuted.exit_code, 3, refuted.stdout);
  assert.equal(refuted.refused, true);
});

test("ISS-054 a blocking finding whose probe cannot execute holds the loop in_review; clear refuses until a new round", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-iss054-"));
  for (const d of ["issues", "review"]) mkdirSync(join(root, "keel", d), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  const ctx = makeCtx(root);
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  writeFileSync(join(root, "keel", "review", "pack.json"), body, "utf8");
  writeLoopState(ctx, { ...emptyLoop("codex", "claude-code"), status: "packed", pack_hash: hash });
  const findings = join(root, "findings.json");
  writeFileSync(
    findings,
    JSON.stringify([
      { title: "unverifiable", blocking: true, repro: "keel-no-such-probe-xyz --check", impact: "gate bypass", fingerprint: "x" },
      { title: "no probe at all", blocking: true, repro: "", impact: "gate bypass", fingerprint: "y" },
    ]),
    "utf8",
  );
  const r = runLoop(ctx, ["ingest", findings, "--reviewer", "claude-code"]);
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /deferred=1 probe_errors=1 .*status=in_review/);
  assert.equal(readLoopState(ctx)?.status, "in_review");
  assert.deepEqual(readLoopState(ctx)?.probe_errors, ["unverifiable"]);
  assert.deepEqual(readLoopState(ctx)?.deferred, ["no probe at all"], "DEC-182: no probe → 待核实, downgraded");
  const cleared = runLoop(ctx, ["clear", "--implementer", "codex", "--reviewer", "claude-code"]);
  assert.equal(cleared.code, 1);
  assert.match(cleared.stderr, /could not execute|ISS-054/);
  assert.notEqual(readLoopState(ctx)?.status, "passed");
  rmSync(root, { recursive: true, force: true });
});
