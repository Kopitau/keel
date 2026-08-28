import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildCleanConfig } from "../tools/cli/init.js";
import { isProfileUnset, loadConfig } from "../tools/gate/config.ts";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runVerify } from "../tools/gate/verify.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");

test("REQ-021/AC-1 root instructions and skills are English while record templates keep English fields and Chinese bodies", () => {
  assert.match(read("AGENTS.md"), /^# keel/m);
  assert.match(read(".agents/skills/k-grill/SKILL.md"), /# k-grill/);
  const dec = read("keel/templates/DEC.md");
  assert.match(dec, /^id:/m);
  assert.match(dec, /## 问题/);
});

test("REQ-021/AC-2 CONTEXT is a lazy glossary with banned near-synonyms", () => {
  const context = read("CONTEXT.md");
  assert.match(context, /Only terms and banned near-synonyms/);
  assert.match(context, /Lazy file/i);
  assert.match(context, /## Banned near-synonyms/);
});

test("REQ-021/AC-3 this repository uses node test plus tsc noEmit and clean configs retain consumer profiles", () => {
  const pkg = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  assert.equal(pkg.scripts?.test, "node --test");
  assert.equal(pkg.scripts?.typecheck, "tsc --noEmit");
  const clean = JSON.parse(buildCleanConfig({ source: repo, cwd: join(repo, "consumer"), name: "consumer", tier: "local", humanName: "", humanEmail: "", platformsKeep: true })) as { profiles?: Record<string, unknown> };
  for (const profile of ["python-cli", "ds-ml", "ts-js", "other"]) assert.ok(profile in (clean.profiles ?? {}));
});

test("REQ-021/AC-4 notebook exploration logic moves into a module with a core test before entering a pipeline", () => {
  const impl = read(".agents/skills/k-impl/SKILL.md");
  assert.match(impl, /notebook/i);
  assert.match(impl, /pipeline/i);
  assert.match(impl, /module/i);
  assert.match(impl, /core test/i);
});

test("REQ-021/AC-5 config parser ignores underscore comments and rejects an invalid string active profile instead of silently running defaults", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-config-"));
  mkdirSync(join(root, "keel"), { recursive: true });
  writeFileSync(join(root, "keel", "config.json"), JSON.stringify({ _comment: "ignored", records_dir: "keel", profiles: { active: "keel-gate", "keel-gate": { test_command: "node --test" } }, identities: {}, platforms: {}, budget: {}, optional: {} }), "utf8");
  const loaded = loadConfig(join(root, "keel"));
  assert.equal("_comment" in loaded, false);
  assert.equal(isProfileUnset(loaded), true);
  assert.equal(runVerify(makeCtx(root)).code, 1);
  assert.equal(isProfileUnset({ profiles: { active: ["missing"] } }), true);
  assert.equal(isProfileUnset({ profiles: { active: ["a", "b"], a: {}, b: {} } }), true);
  const template = JSON.parse(read("keel/templates/config.json")) as Record<string, unknown>;
  for (const key of ["profiles", "identities", "platforms", "budget", "optional"]) assert.ok(key in template);
});
