import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runSync } from "../tools/gate/sync.ts";
import { inspectSkills, listSkillDirs, SKILL_CATALOG } from "../tools/gate/skills.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-016 catalog matches k-* directories on disk", () => {
  const dirs = listSkillDirs(join(root, ".agents", "skills"));
  assert.equal(dirs.length, SKILL_CATALOG.length);
  assert.deepEqual([...dirs].sort(), [...SKILL_CATALOG].sort());
});

test("REQ-016 every skill exists with matching name and Use when description", () => {
  const issues = inspectSkills(root, 500, 1024, 16);
  assert.deepEqual(issues, []);
  for (const name of SKILL_CATALOG) {
    const text = readFileSync(join(root, ".agents", "skills", name, "SKILL.md"), "utf8");
    assert.match(text, /^---\nname: /);
    assert.ok(text.includes(`name: ${name}`));
  }
});

test("I-18 REQ-016 DEC-147 gate sync copies skills to .claude/skills and never links", () => {
  const r = runSync(makeCtx(root));
  assert.equal(r.code, 0, r.stderr);
  for (const name of SKILL_CATALOG) {
    const src = readFileSync(join(root, ".agents", "skills", name, "SKILL.md"), "utf8");
    const dest = join(root, ".claude", "skills", name, "SKILL.md");
    assert.equal(existsSync(dest), true, dest);
    assert.equal(readFileSync(dest, "utf8"), src);
    // I-18 (F24 → F16): a copy on every OS — a symlink here is the platform fork DEC-147 rejected.
    assert.equal(lstatSync(dest).isSymbolicLink(), false, dest);
    assert.equal(lstatSync(join(root, ".claude", "skills", name)).isSymbolicLink(), false, name);
  }
});
