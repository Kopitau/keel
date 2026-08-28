import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import { currentPlanFile, overlapWith, plannedFiles } from "../tools/gate/overlap.ts";
import { runStatus } from "../tools/gate/status.ts";
import { runWorktree } from "../tools/gate/worktree.ts";

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "keel-branch-policy-"));
  mkdirSync(join(root, "keel", "features"), { recursive: true });
  writeFileSync(
    join(root, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel", wave: "fixture", enforcement_tier: "local" }),
    "utf8",
  );
  return root;
}

function feature(root: string, n: number, plan: string): string {
  const dir = join(root, "keel", "features", `f${String(n).padStart(2, "0")}-feature${n}`);
  mkdirSync(join(dir, "plan"), { recursive: true });
  writeFileSync(join(dir, "plan", "v1.md"), plan, "utf8");
  return dir;
}

test("REQ-019/AC-1 status and k-impl state the confirmed trunk recommend and parallel-must three-tier policy", () => {
  const root = fixture();
  try {
    const status = runStatus(makeCtx(root)).stdout;
    assert.match(status, /daily.*trunk/i);
    assert.match(status, /new major feature.*recommend worktree/i);
    assert.match(status, /parallel.*C-112/i);
    const skill = readFileSync(join(process.cwd(), ".agents", "skills", "k-impl", "SKILL.md"), "utf8");
    assert.match(skill, /Daily \/ solo local work: trunk is allowed/);
    assert.match(skill, /New major feature: recommend/);
    assert.match(skill, /Second feature in parallel, or a second person: \*\*must\*\*/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-019/AC-3 overlap parser reads every path on a line and treats a planned directory as overlapping its files", () => {
  const root = fixture();
  try {
    const mine = feature(
      root,
      1,
      "## 预计触碰文件\n\n`README.md`、`tools/gate/`、`tests/one.test.ts`。\n",
    );
    const other = feature(root, 2, "## 预计触碰文件\n\n- `tools/gate/check.ts`\n");
    writeFileSync(join(other, "claim.json"), "{}\n", "utf8");
    assert.deepEqual(plannedFiles(readFileSync(join(mine, "plan", "v1.md"), "utf8")), [
      "README.md",
      "tools/gate/",
      "tests/one.test.ts",
    ]);
    assert.match(overlapWith(makeCtx(root), mine).join("\n"), /tools\/gate\/check\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-019/AC-3 current plan selection compares numeric versions rather than lexicographic filenames", () => {
  const root = fixture();
  try {
    const dir = feature(root, 1, "## 预计触碰文件\n\n`old.txt`\n");
    writeFileSync(join(dir, "plan", "v9.md"), "## 预计触碰文件\n\n`nine.txt`\n", "utf8");
    writeFileSync(join(dir, "plan", "v10.md"), "## 预计触碰文件\n\n`ten.txt`\n", "utf8");
    assert.match(currentPlanFile(dir) ?? "", /v10\.md$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-019/AC-2 a second claimant is refused without overwriting the first claim", () => {
  const root = fixture();
  try {
    const dir = feature(root, 1, "## 预计触碰文件\n\n`one.txt`\n");
    const first = { feature: "F1", assignee: "first", email: "first@example.test" };
    writeFileSync(join(dir, "claim.json"), JSON.stringify(first, null, 2) + "\n", "utf8");
    mkdirSync(join(root, ".keel-worktrees", "F-01-feature1"), { recursive: true });
    const result = runWorktree(makeCtx(root, { name: "second", email: "second@example.test" }), ["add", "F1"]);
    assert.equal(result.code, 1, result.stdout);
    assert.match(result.stderr, /already claimed.*first/i);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, "claim.json"), "utf8")), first);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-019/AC-2 worktree rm releases claim and a failed add never leaves a half claim", () => {
  const releaseRoot = fixture();
  const failureRoot = fixture();
  try {
    const releaseDir = feature(releaseRoot, 1, "## 预计触碰文件\n\n`one.txt`\n");
    writeFileSync(join(releaseDir, "claim.json"), "{\"feature\":\"F1\"}\n", "utf8");
    const released = runWorktree(makeCtx(releaseRoot), ["rm", "F1"]);
    assert.equal(released.code, 0, released.stderr);
    assert.equal(existsSync(join(releaseDir, "claim.json")), false);

    const failureDir = feature(failureRoot, 1, "## 预计触碰文件\n\n`one.txt`\n");
    const failed = runWorktree(
      makeCtx(failureRoot, { name: "developer", email: "developer@example.test" }),
      ["add", "F1"],
    );
    assert.equal(failed.code, 1, failed.stdout);
    assert.equal(existsSync(join(failureDir, "claim.json")), false);
  } finally {
    rmSync(releaseRoot, { recursive: true, force: true });
    rmSync(failureRoot, { recursive: true, force: true });
  }
});
