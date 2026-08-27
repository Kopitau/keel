// ISS-045: git exports GIT_AUTHOR_* / GIT_COMMITTER_* into hooks. Under the DEC-162
// full-suite hook, fixture commits were authored as the real committer (keel-agent),
// and the R6c X-apr guards failed for a reason that had nothing to do with X-apr.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { HOOK_LEAKED_GIT_ENV, scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

scrubProcessGitEnv(process.env);

/** What `git commit` puts in a hook's environment, on top of whatever the shell had. */
function hookEnv(): { [k: string]: string | undefined } {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "keel-agent",
    GIT_AUTHOR_EMAIL: "agent@keel.local",
    GIT_AUTHOR_DATE: "@1700000000 +0000",
    GIT_COMMITTER_NAME: "keel-agent",
    GIT_COMMITTER_EMAIL: "agent@keel.local",
    GIT_COMMITTER_DATE: "@1700000000 +0000",
  };
}

function fixtureCommit(env: { [k: string]: string | undefined }): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-iss045-"));
  const g = (args: string[]): string => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
    return r.stdout.trim();
  };
  g(["init", "-q"]);
  g(["config", "user.name", "fixture"]);
  g(["config", "user.email", "fixture@example.com"]);
  writeFileSync(join(dir, "a.txt"), "a\n", "utf8");
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "fixture"]);
  const who = g(["log", "-1", "--format=%an <%ae> / %cn <%ce>"]);
  rmSync(dir, { recursive: true, force: true });
  return who;
}

test("ISS-045 hook-exported GIT_AUTHOR_* really does override a fixture's own git config (the leak is real)", () => {
  // Negative control: without scrubbing, the fixture commit wears the hook's identity.
  // If this ever stops holding, the scrubber below is no longer protecting anything.
  assert.equal(fixtureCommit(hookEnv()), "keel-agent <agent@keel.local> / keel-agent <agent@keel.local>");
});

test("ISS-045 a fixture commit under hook-exported GIT_AUTHOR_* keeps the fixture's own identity once scrubbed", () => {
  assert.equal(
    fixtureCommit(scrubHookGitEnv(hookEnv())),
    "fixture <fixture@example.com> / fixture <fixture@example.com>",
  );
});

test("ISS-045 the scrubber strips everything git exports to hooks and nothing else", () => {
  const env = {
    GIT_DIR: "/real/.git",
    GIT_INDEX_FILE: "/real/.git/index",
    GIT_WORK_TREE: "/real",
    GIT_PREFIX: "",
    GIT_AUTHOR_NAME: "x",
    GIT_AUTHOR_EMAIL: "x",
    GIT_AUTHOR_DATE: "x",
    GIT_COMMITTER_NAME: "x",
    GIT_COMMITTER_EMAIL: "x",
    GIT_COMMITTER_DATE: "x",
    GIT_EXEC_PATH: "/usr/lib/git-core",
    GIT_CONFIG_NOSYSTEM: "1",
    PATH: "/usr/bin",
    CLAUDECODE: "1",
  };
  const kept = Object.keys(scrubHookGitEnv(env)).sort();
  assert.deepEqual(kept, ["CLAUDECODE", "GIT_CONFIG_NOSYSTEM", "GIT_EXEC_PATH", "PATH"]);
  const mutable: { [k: string]: string | undefined } = { ...env };
  scrubProcessGitEnv(mutable);
  assert.deepEqual(Object.keys(mutable).sort(), kept);
  for (const k of ["GIT_AUTHOR_NAME", "GIT_COMMITTER_EMAIL", "GIT_DIR"]) assert.ok(HOOK_LEAKED_GIT_ENV.test(k), k);
});

test("ISS-045 pre-commit unsets the author and committer variables before running the full suite", () => {
  const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
  const unsetLine = hook.split(/\n/).find((l) => /\bunset\b.*GIT_DIR/.test(l)) ?? "";
  for (const v of ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_AUTHOR_DATE", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL", "GIT_COMMITTER_DATE"]) {
    assert.ok(unsetLine.includes(v), `${v} missing from: ${unsetLine}`);
  }
});

test("ISS-045 every test file that touches git scrubs the hook environment at load", () => {
  // The r6 guards were the victims; the DEC-168 file and this one spawn git too.
  for (const f of ["r6-field-guards.test.ts", "dec168-test-kinds.test.ts", "iss045-hook-git-env.test.ts"]) {
    const t = readFileSync(join(repo, "tests", f), "utf8");
    assert.match(t, /scrubProcessGitEnv\(process\.env\)/, f);
  }
});
