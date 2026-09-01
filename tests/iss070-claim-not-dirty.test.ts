// ISS-070: `gate worktree F<n>` leaves keel/features/<slug>/claim.json untracked on the
// trunk, so every verify / G-done / acceptance snapshot on the trunk said "dirty working
// tree" for as long as any feature was claimed (zhaoxi, F6 claimed, 2026-09-01).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { currentTree } from "../tools/gate/evidence.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { gitDirty } from "../tools/gate/git.ts";
import { scrubHookGitEnv } from "./fixtures/git-env.ts";

function repo(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-iss070-"));
  const w = (rel: string, text: string) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text, "utf8");
  };
  w("keel/config.json", JSON.stringify({ records_dir: "keel" }) + "\n");
  w("AGENTS.md", "# k\n");
  w("src.txt", "code\n");
  w("keel/features/f01-x/plan/v1.md", "# plan\n");
  const g = (args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    if ((r.status ?? 1) !== 0) throw new Error(r.stderr || args.join(" "));
  };
  g(["init", "-q"]);
  g(["config", "user.name", "h"]);
  g(["config", "user.email", "h@x"]);
  g(["add", "-A"]);
  g(["commit", "-q", "-m", "base"]);
  return root;
}

test("ISS-070 a feature claim marker on the trunk neither dirties the tree nor moves its hash", () => {
  const root = repo();
  const ctx = makeCtx(root);
  const clean = currentTree(ctx);
  assert.equal(clean.dirty, false);
  writeFileSync(
    join(root, "keel", "features", "f01-x", "claim.json"),
    JSON.stringify({ feature: "F1", assignee: "h", email: "h@x", branch: "keel/F-1-x" }, null, 2) + "\n",
    "utf8",
  );
  const claimed = currentTree(ctx);
  assert.equal(claimed.dirty, false, "a claim is a marker, not code (C-33 is about code)");
  assert.equal(claimed.hash, clean.hash, "releasing the claim later must not stale the evidence");
  assert.equal(gitDirty(ctx), false);
  rmSync(root, { recursive: true, force: true });
});

test("ISS-070 real changes next to a claim still count as dirty", () => {
  const root = repo();
  const ctx = makeCtx(root);
  writeFileSync(join(root, "keel", "features", "f01-x", "claim.json"), "{}\n", "utf8");
  writeFileSync(join(root, "src.txt"), "changed\n", "utf8");
  assert.equal(gitDirty(ctx), true);
  assert.equal(currentTree(ctx).dirty, true);
  writeFileSync(join(root, "src.txt"), "code\n", "utf8");
  writeFileSync(join(root, "new-untracked.txt"), "x\n", "utf8");
  assert.equal(gitDirty(ctx), true, "an untracked source file is still dirty");
  rmSync(root, { recursive: true, force: true });
});
