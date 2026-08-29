import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCleanConfig } from "../tools/cli/init.js";
import { sha256Normalized } from "../tools/gate/hash.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-017/AC-3 workflow declares the exact Windows macOS Linux by Node 22 24 matrix and one gate", () => {
  const workflow = readFileSync(join(repo, ".github", "workflows", "gate.yml"), "utf8");
  assert.match(workflow, /os:\s*\[ubuntu-latest, windows-latest, macos-latest\]/);
  assert.match(workflow, /node:\s*\[22, 24\]/);
  assert.match(workflow, /runs-on:\s*\$\{\{ matrix\.os \}\}/);
  assert.match(workflow, /node-version:\s*\$\{\{ matrix\.node \}\}/);
  assert.match(workflow, /node tools\/gate\/gate\.ts verify/);
  assert.match(workflow, /node tools\/gate\/gate\.ts check/);
  assert.match(workflow, /evidence-\$\{\{ matrix\.os \}\}-node\$\{\{ matrix\.node \}\}/);
  assert.doesNotMatch(workflow, /gate-(windows|macos|linux)\.(ts|js|py)/i);
});

test("REQ-024/AC-1 clean installer config and root documentation agree on the three OS roles", () => {
  const config = JSON.parse(
    buildCleanConfig({
      source: repo,
      cwd: join(repo, "fixture-project"),
      name: "fixture",
      tier: "local",
      humanName: "",
      humanEmail: "",
      platformsKeep: true,
    }),
  ) as { platforms?: { os_matrix?: unknown; development?: unknown; ci?: unknown } };
  assert.deepEqual(config.platforms?.os_matrix, ["windows", "macos", "linux"]);
  assert.deepEqual(config.platforms?.development, ["windows", "macos"]);
  assert.deepEqual(config.platforms?.ci, ["linux"]);
  const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
  assert.match(agents, /OS matrix: Windows \+ macOS \(dev\) \+ Linux \(CI\)/);
  const template = JSON.parse(readFileSync(join(repo, "keel", "templates", "config.json"), "utf8")) as {
    platforms?: { os_matrix?: unknown; development?: unknown; ci?: unknown };
  };
  assert.deepEqual(template.platforms?.os_matrix, config.platforms?.os_matrix);
  assert.deepEqual(template.platforms?.development, config.platforms?.development);
  assert.deepEqual(template.platforms?.ci, config.platforms?.ci);
});

test("REQ-016/AC-8 [proxy:real six-harness trigger evidence not recorded] local catalog and recipes are not live support proof", () => {
  const config = JSON.parse(readFileSync(join(repo, "keel", "config.json"), "utf8")) as {
    platforms?: { primary?: unknown[]; compatible?: unknown[] };
  };
  assert.equal(config.platforms?.primary?.length, 5);
  assert.equal(config.platforms?.compatible?.length, 2); // pi + cursor client (CHG-012)
  const recipe = readFileSync(join(repo, "keel", "review", "headless.md"), "utf8");
  for (const harness of ["Claude Code", "Codex", "OpenCode", "Grok", "DeepSeek", "Pi", "Cursor"]) {
    assert.match(recipe, new RegExp(harness, "i"));
  }
  assert.match(recipe, /未核实|not verified/i);
});

test("REQ-024/AC-6 [proxy:real Windows and macOS same-fixture evidence not recorded] local fixture stays deterministic", () => {
  const fixture = readFileSync(join(repo, "tests", "fixtures", "dec148-lf.txt"));
  assert.equal(sha256Normalized(fixture), "9d010fdf165c4cfe1b56acce536fd5dd18ce7406a4ec74d26a1c188313f6ba55");
  const workflow = readFileSync(join(repo, ".github", "workflows", "gate.yml"), "utf8");
  assert.match(workflow, /Upload evidence/);
  assert.match(workflow, /if:\s*always\(\)/);
});
