import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../tools/cli/main.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function sourceSnapshot(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const rel = relative(root, path).replaceAll("\\", "/");
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else out[rel] = createHash("sha256").update(readFileSync(path)).digest("hex");
    }
  };
  walk(root);
  return out;
}

test("REQ-022/AC-1 REQ-022/AC-2 migration protocol maps known sources to unconfirmed drafts without inventing rationale", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-migrate", "SKILL.md"), "utf8");
  const trellis = readFileSync(join(repo, "keel", "templates", "migrate", "trellis.md"), "utf8");
  const superpowers = readFileSync(join(repo, "keel", "templates", "migrate", "superpowers.md"), "utf8");
  assert.match(skill, /迁移初稿（未确认）/);
  assert.match(skill, /provisional/);
  assert.match(skill, /暂定·需补理由/);
  assert.match(trellis, /requirements\/vN\.md/);
  assert.match(trellis, /research\/RES-###/);
  assert.match(superpowers, /requirements|需求素材/);
  assert.match(superpowers, /DEC 初稿/);
});

test("REQ-022/AC-3 installer activation detects Trellis but leaves every source byte unchanged", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-migrate-readonly-"));
  const source = join(root, ".trellis");
  try {
    mkdirSync(join(source, "tasks", "one"), { recursive: true });
    writeFileSync(join(source, "config.yaml"), "version: 0.6.0\r\n", "utf8");
    writeFileSync(join(source, "tasks", "one", "prd.md"), "# old requirement\n", "utf8");
    const before = sourceSnapshot(source);
    const result = runCli(["init", "--name", "migrate-fixture", "--tier", "local"], { cwd: root, source: repo });
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.match(result.stdout, /k-migrate/);
    assert.deepEqual(sourceSnapshot(source), before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-022/AC-4 REQ-022/AC-5 migration report template preserves mapped unmapped conflicts doubts and awaiting confirmation", () => {
  const path = join(repo, "keel", "templates", "migrate", "report.md");
  const report = readFileSync(path, "utf8");
  for (const heading of ["已映射", "未映射", "冲突", "存疑", "无法归类", "待确认"]) {
    assert.match(report, new RegExp(`^## ${heading}`, "m"));
  }
  assert.match(report, /需求|规划决策|规则/);
  const skill = readFileSync(join(repo, ".agents", "skills", "k-migrate", "SKILL.md"), "utf8");
  assert.match(skill, /templates\/migrate\/report\.md/);
  assert.match(skill, /mapped \/ not mapped \/ conflicts \/ doubts \/ unclassified \/ awaiting confirmation/i);
});
