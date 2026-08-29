// CHG-012 (RES-908): the Cursor desktop client reads the root AGENTS.md and
// .agents/skills natively, so keel registers it as a compatible harness without
// touching a single skill.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "../tools/gate/frontmatter.ts";
import { SKILL_CATALOG } from "../tools/gate/skills.ts";
import { HARNESS_DISCOVERY, PRIMARY_CLIS } from "../tools/gate/triggers.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-016/AC-1 Cursor's repository contract is the root AGENTS.md plus .agents/skills, and every catalog skill satisfies Cursor's SKILL.md rules", () => {
  const discovery = HARNESS_DISCOVERY.find((d) => d.id === "cursor");
  assert.deepEqual(discovery, { id: "cursor", instructions: "AGENTS.md", skills: ".agents/skills" });
  const probe = PRIMARY_CLIS.find((h) => h.id === "cursor");
  assert.equal(probe?.role, "compatible");
  assert.equal(probe?.bin, "cursor");
  assert.ok(existsSync(join(repo, "AGENTS.md")));
  // Cursor: `name` is "lowercase letters, numbers, and hyphens only"; description required (RES-908).
  for (const name of SKILL_CATALOG) {
    const { attrs } = parseFrontmatter(readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8"));
    assert.equal(attrs.name, name, `${name}: front-matter name equals the folder`);
    assert.match(attrs.name ?? "", /^[a-z0-9-]+$/);
    assert.ok((attrs.description ?? "").trim().length > 0, `${name}: description`);
  }
  // No second layout: nothing under .cursor/ carries keel process logic (C-94).
  assert.equal(existsSync(join(repo, ".cursor", "rules")), false);
  assert.equal(existsSync(join(repo, ".cursor", "skills")), false);
});

test("REQ-016/AC-1 the platform lists, limits and headless recipes name Cursor as a compatible client", () => {
  for (const rel of ["keel/config.json", "keel/templates/config.json"]) {
    const cfg = JSON.parse(readFileSync(join(repo, rel), "utf8")) as { platforms: { compatible: string[]; primary: string[] } };
    assert.ok(cfg.platforms.compatible.includes("cursor"), rel);
    assert.ok(!cfg.platforms.primary.includes("cursor"), `${rel}: compatible, not primary`);
  }
  assert.match(readFileSync(join(repo, "tools", "cli", "init.js"), "utf8"), /compatible: \["pi", "cursor"\]/);
  assert.match(readFileSync(join(repo, "tools", "gate", "platform-limits.md"), "utf8"), /Cursor/);
  const headless = readFileSync(join(repo, "keel", "review", "headless.md"), "utf8");
  assert.match(headless, /^## cursor/m);
  assert.match(headless, /same_harness_fallback: forbidden/);
  assert.match(headless, /agent/);
});
