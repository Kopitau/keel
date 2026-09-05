import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCleanConfig } from "../tools/cli/init.js";
import { SKILL_CATALOG } from "../tools/gate/skills.ts";
import { skillTriggerGaps } from "../tools/gate/triggers.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-016/AC-3 discovery validates skill metadata without requiring magic English phrases", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-chg017-discovery-"));
  try {
    for (const name of SKILL_CATALOG) {
      const dir = join(root, ".agents", "skills", name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: Plan and deliver a scoped feature.\n---\n\nUseful guidance.\n`, "utf8");
    }
    assert.deepEqual(skillTriggerGaps(root), []);
    const path = join(root, ".agents", "skills", "k-impl", "SKILL.md");
    writeFileSync(path, "---\nname: wrong\ndescription: Implement a feature.\n---\n", "utf8");
    assert.deepEqual(skillTriggerGaps(root), ["k-impl: frontmatter name must match directory"]);
    writeFileSync(path, "---\nname: k-impl\ndescription: \n---\n", "utf8");
    assert.deepEqual(skillTriggerGaps(root), ["k-impl: description is empty"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("CHG-017 fresh consumer config and shipped template do not force a lower reasoning setting", () => {
  const config = JSON.parse(buildCleanConfig({ source: repo, cwd: repo, name: "fixture", tier: "local", humanName: "", humanEmail: "", platformsKeep: true }));
  const template = JSON.parse(readFileSync(join(repo, "keel", "templates", "config.json"), "utf8"));
  assert.equal(config.optional.recorder_medium_for_longform, false);
  assert.equal(template.optional.recorder_medium_for_longform, false);
});
