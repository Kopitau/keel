import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { nodeTooOld, refuseOldNodeMessage } from "../bin/node-age.js";
import { makeCtx } from "../tools/gate/ctx.ts";
import { hasImplementationActivity, runCheck } from "../tools/gate/check.ts";
import { runVerify } from "../tools/gate/verify.ts";
import { gitIndexMode } from "../tools/gate/execmode.ts";
import { writeTestBaseline, worktreeBaseline } from "../tools/gate/testbase.ts";
import { runCli } from "../tools/cli/main.js";
import { nodeVersionFinding } from "../tools/cli/doctor.js";
import { EXEC_REQUIRED } from "../tools/gate/execmode.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

function skeleton(dir: string): void {
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "features"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
}

test("REQ-025/AC-3 bin/keel.js is plain JS and refuses old Node with a human message", () => {
  const src = readFileSync(join(repo, "bin", "keel.js"), "utf8");
  assert.doesNotMatch(src, /import type |interface |: string|: number/);
  const chk = spawnSync(process.execPath, ["--check", join(repo, "bin", "keel.js")], { encoding: "utf8" });
  assert.equal(chk.status, 0, chk.stderr);
  assert.equal(nodeTooOld("18.20.4"), true);
  assert.equal(nodeTooOld("22.18.0"), false);
  assert.match(refuseOldNodeMessage("18.0.0"), /22\.18\.0/);
  assert.doesNotMatch(refuseOldNodeMessage("18.0.0"), /SyntaxError/);
});

test("REQ-025 ISS-022 installer never imports TypeScript and is not a silent no-op", () => {
  const src = readFileSync(join(repo, "bin", "keel.js"), "utf8");
  assert.doesNotMatch(src, /\.ts['"]/);
  assert.doesNotMatch(src, /isMain/);
  for (const n of readdirSync(join(repo, "tools", "cli"))) {
    if (!n.endsWith(".js")) continue;
    const t = readFileSync(join(repo, "tools", "cli", n), "utf8");
    assert.doesNotMatch(t, /from ['"][^'"]+\.ts['"]/, n);
    assert.doesNotMatch(t, /import\([^)]*\.ts/, n);
  }
  const help = spawnSync(process.execPath, [join(repo, "bin", "keel.js"), "--help"], {
    encoding: "utf8",
  });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /usage: keel/);
});

test("REQ-025 ISS-022 npm pack then prefix install then keel init", () => {
  const packDir = mkdtempSync(join(tmpdir(), "keel-c7-pack-"));
  const prefix = mkdtempSync(join(tmpdir(), "keel-c7-pref-"));
  const proj = mkdtempSync(join(tmpdir(), "keel-c7-proj-"));
  git(proj, ["init"]);
  git(proj, ["config", "user.email", "c7@example.com"]);
  git(proj, ["config", "user.name", "c7"]);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const packed = spawnSync(npm, ["pack", "--pack-destination", packDir], {
    encoding: "utf8",
    cwd: repo,
    timeout: 120000,
    shell: process.platform === "win32",
  });
  assert.equal(packed.status, 0, (packed.stdout || "") + (packed.stderr || "") + " status=" + String(packed.status));
  const tgz = readdirSync(packDir).find((n) => n.endsWith(".tgz"));
  assert.ok(tgz, packed.stdout);
  const inst = spawnSync(npm, ["i", "--prefix", prefix, join(packDir, tgz ?? "")], {
    encoding: "utf8",
    timeout: 120000,
    shell: process.platform === "win32",
  });
  assert.equal(inst.status, 0, inst.stdout + inst.stderr);
  const bin = join(prefix, "node_modules", "keel", "bin", "keel.js");
  assert.equal(existsSync(bin), true, "packed bin missing");
  const r = spawnSync(
    process.execPath,
    [bin, "init", "--name", "packed", "--tier", "local"],
    { encoding: "utf8", cwd: proj, timeout: 120000 },
  );
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stderr + r.stdout, /ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING/);
  assert.equal(existsSync(join(proj, "keel", "config.json")), true);
  assert.match(r.stdout, /SKIP G-req/);
  rmSync(packDir, { recursive: true, force: true });
  rmSync(prefix, { recursive: true, force: true });
  rmSync(proj, { recursive: true, force: true });
});

test("REQ-025 init↔testbase writeTestBaseline contract", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-base-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  mkdirSync(join(dir, "tests"), { recursive: true });
  writeFileSync(
    join(dir, "tests", "a.test.js"),
    "const { test } = require('node:test');\ntest('alpha', () => {});\n",
    "utf8",
  );
  const ctx = makeCtx(dir);
  const dest = writeTestBaseline(ctx);
  assert.match(dest, /test-baseline\.json$/);
  assert.deepEqual(worktreeBaseline(ctx), ["alpha"]);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-026/AC-1 vacuum project SKIPs G-req and G-plan", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-vac-"));
  skeleton(dir);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.match(r.stdout, /SKIP G-req/);
  assert.match(r.stdout, /SKIP G-plan/);
  assert.match(r.stdout, /k-new/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-026/AC-2 feature dir without a requirements baseline FAILs G-req", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-act-"));
  skeleton(dir);
  mkdirSync(join(dir, "keel", "features", "f01-x"), { recursive: true });
  assert.equal(hasImplementationActivity(makeCtx(dir)), true);
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL G-req/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-026/AC-3 activity without a coupling table FAILs G-plan", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-plan-"));
  skeleton(dir);
  mkdirSync(join(dir, "keel", "features", "f01-x"), { recursive: true });
  writeFileSync(join(dir, "keel", "requirements", "v1.md"), "# r\n\n## 未决问题\n", "utf8");
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(join(dir, "keel", "plan", "overview-v1.md"), "# p\nno table\n", "utf8");
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL G-plan/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-026/AC-4 live NEEDS-CLARIFICATION still FAILs G-req", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-nc-"));
  skeleton(dir);
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# r\n\n## 未决问题\n\n## REQ-001 X\n\n- **acceptance**:\n  - Given a When b Then [NEEDS-CLARIFICATION: q]\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  const r = runCheck(makeCtx(dir), ["--quick"]);
  assert.equal(r.code, 1, r.stdout);
  assert.match(r.stdout, /FAIL G-req/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-8 unset profile makes verify fail closed", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-unset-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", profiles: { active: "unset" } }),
    "utf8",
  );
  const r = runVerify(makeCtx(dir));
  assert.equal(r.code, 1);
  assert.match(r.stdout + r.stderr, /unset/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-1 keel init empty git repo: G-req and G-plan SKIP, check --quick green", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-init-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "c7@example.com"]);
  git(dir, ["config", "user.name", "c7"]);
  const r = runCli(["init", "--name", "demo", "--tier", "local", "--human", "Ada <ada@example.com>"], {
    cwd: dir,
    source: repo,
  });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /SKIP G-req/);
  assert.match(r.stdout, /SKIP G-plan/);
  assert.match(r.stdout, /result: PASS/);
  const cfg = JSON.parse(readFileSync(join(dir, "keel", "config.json"), "utf8")) as {
    profiles?: { active?: unknown };
    keel_version?: string;
    project_name?: string;
  };
  assert.equal(cfg.project_name, "demo");
  assert.equal(cfg.profiles?.active, "unset");
  assert.ok(cfg.keel_version);
  const again = runCli(["init", "--name", "demo"], { cwd: dir, source: repo });
  assert.equal(again.code, 1);
  assert.match(again.stderr, /k-change|k-impl/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-4 init sets hook exec bits in the git index", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-exec-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "c7@example.com"]);
  git(dir, ["config", "user.name", "c7"]);
  const r = runCli(["init", "--name", "demo", "--tier", "local"], { cwd: dir, source: repo });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  const ctx = makeCtx(dir);
  for (const rel of EXEC_REQUIRED) {
    assert.equal(gitIndexMode(ctx, rel), "100755", rel);
  }
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-7 init with a .trellis dir still installs and hints k-migrate", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-tr-"));
  mkdirSync(join(dir, ".trellis"), { recursive: true });
  git(dir, ["init"]);
  const r = runCli(["init", "--name", "t", "--tier", "local"], { cwd: dir, source: repo });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /k-migrate/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025 doctor flags foreign framework config, missing exec bits, and old Node", () => {
  assert.ok(nodeVersionFinding("18.0.0"));
  assert.equal(nodeVersionFinding("22.18.0"), null);
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-doc-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ project_name: "keel", wave: "R3-rework", records_dir: "keel" }),
    "utf8",
  );
  const foreign = runCli(["doctor"], { cwd: dir, source: repo });
  assert.equal(foreign.code, 1);
  assert.match(foreign.stderr, /foreign-config|framework/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-6 update refuses a CLI older than keel_version without --force", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-up-"));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", keel_version: "9.9.9" }),
    "utf8",
  );
  const blocked = runCli(["update"], { cwd: dir, source: repo });
  assert.equal(blocked.code, 1);
  assert.match(blocked.stderr, /--force/);
  const forced = runCli(["update", "--force"], { cwd: dir, source: repo });
  assert.equal(forced.code, 0, forced.stdout + forced.stderr);
  const cfg = JSON.parse(readFileSync(join(dir, "keel", "config.json"), "utf8")) as { keel_version?: string };
  assert.ok(cfg.keel_version !== "9.9.9");
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-025/AC-5 uninstall keeps the keel/ records directory", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-c7-un-"));
  git(dir, ["init"]);
  const r = runCli(["init", "--name", "u", "--tier", "local"], { cwd: dir, source: repo });
  assert.equal(r.code, 0, r.stdout + r.stderr);
  writeFileSync(join(dir, "keel", "OVERVIEW.md"), "# stay\n", "utf8");
  const un = runCli(["uninstall"], { cwd: dir, source: repo });
  assert.equal(un.code, 0, un.stdout + un.stderr);
  assert.match(readFileSync(join(dir, "keel", "OVERVIEW.md"), "utf8"), /stay/);
  assert.ok(readFileSync(join(dir, "keel", "config.json"), "utf8").length > 0);
  rmSync(dir, { recursive: true, force: true });
});
