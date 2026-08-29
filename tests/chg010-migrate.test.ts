import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  existsSync,
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
const skill = (): string => readFileSync(join(repo, ".agents", "skills", "k-migrate", "SKILL.md"), "utf8");

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

test("REQ-022/AC-1 REQ-022/AC-2 the mapping rules live in k-migrate and map known sources to unconfirmed drafts without inventing rationale", () => {
  const text = skill();
  assert.match(text, /迁移初稿（未确认）/);
  assert.match(text, /provisional/);
  assert.match(text, /暂定·需补理由/);
  // Trellis rows
  assert.match(text, /`tasks\/\*\/prd\.md`[^\n]*REQ rows in `requirements\/vN\.md`/);
  assert.match(text, /`tasks\/\*\/design\.md`[^\n]*RES \+ DEC/);
  // Superpowers rows
  assert.match(text, /`specs\/\*-design\.md`[^\n]*REQ material \+ DEC/);
  assert.match(text, /`plans\/\*\.md`[^\n]*`plan\/vN\.md` or `summary\.md`/);
  // CHG-011: no mapping templates on disk
  assert.equal(existsSync(join(repo, "keel", "templates", "migrate")), false);
  assert.doesNotMatch(text, /templates\/migrate/);
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

test("REQ-022/AC-4 REQ-022/AC-5 the migration report keeps mapped unmapped conflicts doubts unclassified and awaiting confirmation", () => {
  const text = skill();
  assert.match(text, /keel\/migration-report\.md/);
  for (const heading of ["已映射", "未映射", "冲突", "存疑", "无法归类", "待确认"]) assert.ok(text.includes(heading), heading);
  assert.match(text, /Never fabricate a reason for an unmapped item/);
  assert.match(text, /stale or contradictory → doubt list/);
});
