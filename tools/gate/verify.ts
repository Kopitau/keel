import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import type { Ctx } from "./ctx.ts";
import { isProfileUnset, type JsonMap } from "./config.ts";
import {
  currentTree,
  hashReport,
  junitPath,
  parseJunit,
  readEvidence,
  tail2kb,
  writeEvidence,
  type Evidence,
} from "./evidence.ts";
import { ok, type CmdResult } from "./result.ts";
import { buildTrace, featureCoverageLines } from "./trace.ts";
import { allowedTestCommandReason, emptyRunIsFailure, expandTestArgv, isAllowedTestArgv, splitCmd } from "./testcmd.ts";

function activeProfile(cfg: JsonMap): JsonMap {
  const profiles = (cfg.profiles ?? {}) as JsonMap;
  const active = profiles.active;
  const name = Array.isArray(active) ? String(active[0] ?? "") : "";
  const p = name ? profiles[name] : undefined;
  return p && typeof p === "object" ? (p as JsonMap) : {};
}

function activeProfileName(cfg: JsonMap): string {
  const profiles = (cfg.profiles ?? {}) as JsonMap;
  const active = profiles.active;
  return Array.isArray(active) ? String(active[0] ?? "") : "";
}

function childEnv(): { [k: string]: string | undefined } {
  const env: { [k: string]: string | undefined } = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (key.startsWith("NODE_TEST")) continue;
    env[key] = val;
  }
  return env;
}

function run(ctx: Ctx, argv: string[]): { status: number; stdout: string; stderr: string } {
  const cmd = argv[0] ?? "";
  const args = argv.slice(1);
  const r = spawnSync(cmd, args, { encoding: "utf8", cwd: ctx.root, env: childEnv() });
  return {
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export function runVerify(ctx: Ctx): CmdResult {
  if (isProfileUnset(ctx.config)) {
    return {
      code: 1,
      stdout: "verify FAIL\nprofiles.active is unset\n",
      stderr: "configure a test command when the unified plan is confirmed (REQ-025); will not silently pass\n",
    };
  }
  const profile = activeProfile(ctx.config);
  const profileName = activeProfileName(ctx.config);
  const testCmd = typeof profile.test_command === "string" ? profile.test_command : "node --test";
  const refused = allowedTestCommandReason(testCmd, profileName || "keel-gate");
  if (refused) {
    return {
      code: 1,
      stdout: `verify FAIL\ntest_command not allowlisted: ${testCmd}\n`,
      stderr: `${refused}\nallowed shape: launcher prefix + pytest / vitest run / jest / node --test + marker or report arguments; no -k, paths or name patterns (ISS-018 / DEC-188)\n`,
    };
  }
  const started = new Date().toISOString();
  let combined = "";
  let exitCode = 0;

  const tsc = join(ctx.root, "node_modules", "typescript", "lib", "tsc.js");
  if (existsSync(join(ctx.root, "tsconfig.json")) && existsSync(tsc)) {
    const tr = run(ctx, [process.execPath, tsc, "--noEmit"]);
    combined += tr.stdout + tr.stderr;
    if (tr.status !== 0) exitCode = tr.status;
  }

  mkdirSync(join(ctx.records, "evidence"), { recursive: true });
  const dest = junitPath(ctx);
  const destRel = join("keel", "evidence", "junit.xml");
  // DEC-188: node:test, pytest and vitest each get their junit report wired in
  // unless the project already declared where it goes.
  const argv = expandTestArgv(splitCmd(testCmd), destRel);
  if (!isAllowedTestArgv(argv)) {
    return {
      code: 1,
      stdout: `verify FAIL\nexpanded test argv not allowlisted: ${argv.join(" ")}\n`,
      stderr: "ISS-018: refuse narrowed or non-allowlisted test invocation\n",
    };
  }
  const tr = run(ctx, argv);
  combined += tr.stdout + tr.stderr;
  if (tr.status !== 0 && exitCode === 0) exitCode = tr.status;

  let xml = "";
  if (existsSync(dest)) {
    try {
      xml = readFileSync(dest, "utf8");
    } catch {
      xml = "";
    }
  }
  if (!xml && combined.includes("<testsuites")) xml = combined;
  const tapPass = combined.match(/# pass (\d+)/);
  const counts = xml
    ? parseJunit(xml)
    : tapPass
      ? {
          passed: Number(tapPass[1]),
          failed: Number((combined.match(/# fail (\d+)/) ?? [])[1] ?? 0),
          skipped: Number((combined.match(/# skipped (\d+)/) ?? [])[1] ?? 0),
        }
      : { passed: 0, failed: 1, skipped: 0 };
  if (emptyRunIsFailure(counts)) {
    counts.failed = Math.max(counts.failed, 1);
    if (exitCode === 0) exitCode = 1;
  }

  const coverage: { [req: string]: number } = {};
  const { rows } = buildTrace(ctx);
  for (const row of rows) {
    if (row.tests.length > 0) coverage[row.req] = row.tests.length;
  }

  const tree = currentTree(ctx);
  const actor = {
    harness: process.env.KEEL_HARNESS || (process.env.GITHUB_ACTIONS ? "github-actions" : "local"),
    model: process.env.KEEL_MODEL || process.env.GITHUB_JOB || "unspecified",
    session: process.env.KEEL_SESSION || process.env.GITHUB_RUN_ID || `local-${process.pid}`,
  };
  const prev = readEvidence(ctx);
  const ev: Evidence = {
    command: argv.join(" "),
    exit_code: exitCode,
    started,
    finished: new Date().toISOString(),
    git_commit: tree.commit,
    tree_hash: tree.hash,
    dirty: tree.dirty,
    report_hash: hashReport(xml),
    counts,
    req_coverage: coverage,
    stdout_tail_2kb: tail2kb(combined) ||
      `junit passed=${counts.passed} failed=${counts.failed} skipped=${counts.skipped}\n`,
    actor,
    review: prev?.review,
  };
  writeEvidence(ctx, ev);
  const lines = [
    `verify ${exitCode === 0 ? "PASS" : "FAIL"}`,
    `tree_hash: ${ev.tree_hash || "(none)"}`,
    `commit: ${ev.git_commit || "(none)"}`,
    `dirty: ${ev.dirty}`,
    `counts: passed=${counts.passed} failed=${counts.failed} skipped=${counts.skipped}`,
    `evidence: ${join(ctx.records, "evidence", "verify.json")}`,
    // REQ-006/AC-10: the count above means nothing on its own — say what it proved, by feature.
    "coverage by feature:",
    ...featureCoverageLines(ctx).map((l) => `  ${l}`),
    "",
  ];
  if (exitCode !== 0) {
    return { code: 1, stdout: lines.join("\n"), stderr: tail2kb(combined) + "\n" };
  }
  return ok(lines.join("\n"));
}
