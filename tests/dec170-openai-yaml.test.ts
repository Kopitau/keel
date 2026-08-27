// DEC-170: Codex reads `agents/openai.yaml` beside a SKILL.md for its display name
// and whether the model may invoke the skill implicitly. keel's user skills
// (k-init, k-accept, k-change, …) must be explicit-only there; model skills may be
// implicit. `gate sync` generates the file; X-skills checks it. (RES-904 §7)
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import {
  MODEL_SKILLS,
  SKILL_CATALOG,
  USER_SKILLS,
  inspectSkills,
  openaiYamlFor,
} from "../tools/gate/skills.ts";
import { runSync } from "../tools/gate/sync.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function skillsFixture(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `keel-dec170-${tag}-`));
  mkdirSync(join(dir, "keel"), { recursive: true });
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  for (const name of SKILL_CATALOG) {
    mkdirSync(join(dir, ".agents", "skills", name), { recursive: true });
    cpSync(join(repo, ".agents", "skills", name, "SKILL.md"), join(dir, ".agents", "skills", name, "SKILL.md"));
  }
  return dir;
}

test("DEC-170 every k-* skill is classified exactly once as user-invoked or model-invoked", () => {
  const all = [...USER_SKILLS, ...MODEL_SKILLS].sort();
  assert.deepEqual(all, [...SKILL_CATALOG].sort());
  assert.equal(new Set(all).size, all.length);
  assert.ok(USER_SKILLS.includes("k-accept") && USER_SKILLS.includes("k-change") && USER_SKILLS.includes("k-init"));
  assert.ok(MODEL_SKILLS.includes("k-grill") && MODEL_SKILLS.includes("k-research"));
});

test("DEC-170 openaiYamlFor: user skills are explicit-only, model skills allow implicit invocation", () => {
  const user = openaiYamlFor("k-accept", "Use when starting k-accept, presenting a feature. Do not merge.");
  assert.match(user, /^interface:\n  display_name: "k-accept"\n  short_description: "Use when starting k-accept, presenting a feature\."\npolicy:\n  allow_implicit_invocation: false\n$/);
  const model = openaiYamlFor("k-grill", "Use when starting k-grill. Do not guess.");
  assert.match(model, /allow_implicit_invocation: true\n$/);
  // a description with a double quote must not break the YAML string
  assert.match(openaiYamlFor("k-log", 'Use when "filing" an ISS. x'), /short_description: "Use when \\"filing\\" an ISS\."/);
});

test("DEC-170 gate sync writes agents/openai.yaml beside every SKILL.md and mirrors it to .claude/skills", () => {
  const dir = skillsFixture("sync");
  const r = runSync(makeCtx(dir));
  assert.equal(r.code, 0, r.stderr);
  for (const name of SKILL_CATALOG) {
    const src = join(dir, ".agents", "skills", name, "agents", "openai.yaml");
    assert.ok(existsSync(src), src);
    const text = readFileSync(src, "utf8");
    const expected = (USER_SKILLS as readonly string[]).includes(name) ? "false" : "true";
    assert.match(text, new RegExp(`allow_implicit_invocation: ${expected}\\n$`), name);
    assert.match(text, new RegExp(`display_name: "${name}"`));
    assert.equal(readFileSync(join(dir, ".claude", "skills", name, "agents", "openai.yaml"), "utf8"), text, name);
  }
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-170 X-skills flags a missing or stale agents/openai.yaml and points at gate sync", () => {
  const dir = skillsFixture("inspect");
  runSync(makeCtx(dir));
  assert.deepEqual(inspectSkills(dir, 500, 1024, 16), []);
  rmSync(join(dir, ".agents", "skills", "k-accept", "agents"), { recursive: true, force: true });
  let issues = inspectSkills(dir, 500, 1024, 16);
  assert.ok(issues.some((i) => i.skill === "k-accept" && /openai\.yaml missing/.test(i.message)), JSON.stringify(issues));
  runSync(makeCtx(dir));
  const stale = join(dir, ".agents", "skills", "k-accept", "agents", "openai.yaml");
  writeFileSync(stale, readFileSync(stale, "utf8").replace("allow_implicit_invocation: false", "allow_implicit_invocation: true"), "utf8");
  issues = inspectSkills(dir, 500, 1024, 16);
  assert.ok(issues.some((i) => i.skill === "k-accept" && /openai\.yaml stale/.test(i.message)), JSON.stringify(issues));
  rmSync(dir, { recursive: true, force: true });
});

test("DEC-170 this repo: every k-* carries a current agents/openai.yaml", () => {
  assert.deepEqual(inspectSkills(repo, 500, 1024, 16), []);
  for (const name of USER_SKILLS) {
    assert.match(readFileSync(join(repo, ".agents", "skills", name, "agents", "openai.yaml"), "utf8"), /allow_implicit_invocation: false/, name);
  }
});
