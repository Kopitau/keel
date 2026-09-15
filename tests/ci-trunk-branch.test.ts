import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { scrubHookGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const gitBash = join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin", "bash.exe");
const bash = process.platform === "win32" && existsSync(gitBash) ? gitBash : "bash";
const candidateGate = 'console.log("candidate gate must not run");\n';

function git(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", env: scrubHookGitEnv(process.env) });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function fixture(remoteBranch?: string, gateExit = 0): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-trunk-branch-"));
  mkdirSync(join(dir, "tools", "gate"), { recursive: true });
  copyFileSync(join(repo, "tools", "gate", "ci-trunk.sh"), join(dir, "ci-trunk.sh"));
  writeFileSync(join(dir, "tools", "gate", "gate.ts"),
    `console.log("selected trunk gate", process.argv.slice(2).join(" ")); process.exit(${gateExit});\n`, "utf8");
  git(dir, ["init", "-b", "candidate"]);
  git(dir, ["config", "user.name", "trunk-test"]);
  git(dir, ["config", "user.email", "trunk-test@example.com"]);
  git(dir, ["config", "core.autocrlf", "false"]);
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "trunk"]);
  if (remoteBranch) git(dir, ["update-ref", `refs/remotes/origin/${remoteBranch}`, "HEAD"]);
  writeFileSync(join(dir, "tools", "gate", "gate.ts"), candidateGate, "utf8");
  git(dir, ["add", "."]);
  git(dir, ["commit", "-m", "candidate"]);
  return dir;
}

function run(dir: string, trunkRef?: string) {
  const env = scrubHookGitEnv(process.env);
  delete env.KEEL_TRUNK_REF;
  if (trunkRef !== undefined) env.KEEL_TRUNK_REF = trunkRef;
  return spawnSync(bash, ["ci-trunk.sh"], { cwd: dir, encoding: "utf8", env });
}

test("REQ-017 CI checks configured master trunk and restores candidate files", () => {
  const dir = fixture("master");
  try {
    const result = run(dir, "origin/master");
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /selected trunk gate check --quick/);
    assert.doesNotMatch(result.stdout, /skip|candidate gate must not run/);
    assert.equal(readFileSync(join(dir, "tools", "gate", "gate.ts"), "utf8"), candidateGate);
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: dir, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    assert.equal(status.status, 0, status.stderr);
    assert.equal(status.stdout, "");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("REQ-017 CI preserves the default origin/main consumer behavior", () => {
  const dir = fixture("main");
  try {
    const result = run(dir);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /selected trunk gate check --quick/);
    assert.doesNotMatch(result.stdout, /skip/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("REQ-017 CI missing explicit trunk fails instead of silently skipping", () => {
  const dir = fixture();
  try {
    const configured = run(dir, "origin/master");
    assert.equal(configured.status, 1, configured.stderr || configured.stdout);
    assert.match(configured.stderr + configured.stdout, /configured trunk origin\/master not found/);
    const legacy = run(dir);
    assert.equal(legacy.status, 0, legacy.stderr || legacy.stdout);
    assert.match(legacy.stdout, /no origin\/main; skip/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("REQ-017 CI configured trunk rejection propagates its failing exit code", () => {
  const dir = fixture("master", 23);
  try {
    const result = run(dir, "origin/master");
    assert.equal(result.status, 23, result.stderr || result.stdout);
    assert.match(result.stdout, /selected trunk gate check --quick/);
    assert.doesNotMatch(result.stdout, /trunk gate check --quick passed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
