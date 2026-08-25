import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { QUICK_SKIPPED_IDS, runCheck } from "../tools/gate/check.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { readEvidence } from "../tools/gate/evidence.ts";
import {
  collectChangedPaths,
  emptyLoop,
  fileFindings,
  packBodyHash,
  recordClear,
  runLoop,
  writeLoopState,
} from "../tools/gate/reviewloop.ts";

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
  git(dir, ["config", "user.email", "r5@example.com"]);
  git(dir, ["config", "user.name", "r5"]);
}

function writePackState(dir: string, extra: { [k: string]: unknown } = {}): void {
  const pack = { diff: "d", plan: "p", reqs: "r", evidence: "{}", worklog_summary: "slice" };
  const { body, hash } = packBodyHash(pack);
  mkdirSync(join(dir, "keel", "review"), { recursive: true });
  writeFileSync(join(dir, "keel", "review", "pack.json"), body, "utf8");
  writeLoopState(makeCtx(dir), {
    ...emptyLoop("requirements", "grok-build", "claude-code"),
    pack_hash: hash,
    ...extra,
  });
}

test("ISS-030 pack artifacts must not block fallback to HEAD paths", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r5-030-"));
  keelCfg(dir);
  gitReady(dir);
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
  writeFileSync(join(dir, "tools", "gate", "check.ts"), "export const x = 1;\n", "utf8");
  writeFileSync(join(dir, "README.md"), "doc\n", "utf8");
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "--no-verify", "-m", "gate"]);
  writeFileSync(join(dir, "keel", "review", "pack.json"), "{}\n", "utf8");
  writeFileSync(join(dir, "keel", "review", "state.json"), "{}\n", "utf8");
  const ctx = makeCtx(dir);
  const paths = collectChangedPaths(ctx);
  assert.ok(paths.some((p) => p.replace(/\\/g, "/").endsWith("tools/gate/check.ts")), paths.join(","));
  const packed = runLoop(ctx, ["pack", "--implementer", "grok-build", "--reviewer", "claude-code"]);
  assert.equal(packed.code, 0, packed.stdout + packed.stderr);
  assert.match(packed.stdout, /lens=attack/);
  assert.match(packed.stdout, /het_required=true/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-031 recordClear writes review even when verify.json is missing", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r5-031-"));
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
  });
  const ctx = makeCtx(dir);
  assert.equal(readEvidence(ctx), null);
  const r = recordClear(ctx, "grok-build", "claude-code");
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const ev = readEvidence(ctx);
  assert.ok(ev && ev.review, "review field missing after clear");
  assert.equal(ev?.review?.status, "passed");
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-032 non-blocking findings land as advisory, not dropped", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r5-032-"));
  keelCfg(dir);
  const ctx = makeCtx(dir);
  const out = fileFindings(
    ctx,
    [{ title: "docs could be clearer", blocking: false, repro: "" }],
    "keel/features/f07-review/worklog.md",
  );
  assert.deepEqual(out.iss, []);
  assert.deepEqual(out.deferred, []);
  assert.equal(out.advisory.length, 1);
  const log = readFileSync(join(dir, "keel", "features", "f07-review", "worklog.md"), "utf8");
  assert.match(log, /待办（advisory）/);
  assert.match(log, /docs could be clearer/);
  rmSync(dir, { recursive: true, force: true });
});

test("ISS-033 loop clear refusal is exit 1", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-r5-033-"));
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
  assert.match(r.stdout + r.stderr, /still_open=ISS-001/);
  rmSync(dir, { recursive: true, force: true });
});

test("R5 X-full: this repo full check still emits every --quick-skipped id", () => {
  const r = runCheck(makeCtx(repo), []);
  for (const id of QUICK_SKIPPED_IDS) {
    assert.match(r.stdout, new RegExp(id), id);
  }
  assert.match(r.stdout, /G-retro/);
  assert.match(r.stdout, /X-types/);
  assert.match(r.stdout, /X-apr/);
});
