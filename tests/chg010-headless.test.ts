import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function recipe(page: string, id: string): string {
  const marker = `## ${id}`;
  const start = page.split(/\n/).reduce((offset, line) => {
    if (offset.found) return offset;
    if (line.trim() === marker) return { found: true, index: offset.index + line.length + 1 };
    return { found: false, index: offset.index + line.length + 1 };
  }, { found: false, index: 0 });
  if (!start.found) return "";
  const tail = page.slice(start.index);
  const next = tail.search(/^## /m);
  return next < 0 ? tail : tail.slice(0, next);
}

test("REQ-016/AC-7 machine-doc has a sourced, executable, fail-closed recipe for every configured harness", () => {
  const config = JSON.parse(readFileSync(join(repo, "keel", "config.json"), "utf8")) as {
    platforms: { primary: string[]; compatible: string[] };
  };
  const page = readFileSync(join(repo, "keel", "review", "headless.md"), "utf8");
  const ids = [...config.platforms.primary, ...config.platforms.compatible];
  for (const id of ids) {
    const block = recipe(page, id);
    assert.ok(block, `${id}: recipe missing`);
    for (const field of ["mode", "command", "input", "output", "success", "on_failure", "same_harness_fallback", "source", "retrieved"]) {
      assert.match(block, new RegExp(`^- ${field}: \\S`, "m"), `${id}: ${field} missing`);
    }
    assert.match(block, /^- on_failure: stop$/m, `${id}: failure must stop`);
    assert.match(block, /^- same_harness_fallback: forbidden$/m, `${id}: same-harness fallback must be forbidden`);
    assert.match(block, /^- source: https:\/\//m, `${id}: official source URL missing`);
    assert.match(block, /^- retrieved: 2026-08-28$/m, `${id}: retrieval date missing`);
  }
  for (const key of ["diff", "plan", "reqs", "evidence", "worklog_summary"]) {
    assert.match(page, new RegExp(`\\b${key}\\b`), `pack key ${key} missing`);
  }
  for (const key of ["title", "blocking", "repro", "impact", "fingerprint"]) {
    assert.match(page, new RegExp(`\\b${key}\\b`), `finding key ${key} missing`);
  }
});

test("REQ-027/AC-7 machine-doc makes Pi use a fresh sequential session with only the hashed pack", () => {
  const page = readFileSync(join(repo, "keel", "review", "headless.md"), "utf8");
  const pi = recipe(page, "pi");
  assert.match(pi, /^- mode: sequential-session$/m);
  assert.match(pi, /^- fresh_context: required$/m);
  assert.match(pi, /keel\/review\/pack\.json/);
  assert.match(pi, /pack_hash/);
  assert.match(pi, /same_harness_fallback: forbidden/);
});

test("REQ-027/AC-2 k-review points to the recipe page and requires the shared findings schema", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(skill, /keel\/review\/headless\.md/);
  for (const key of ["title", "blocking", "repro", "impact", "fingerprint"]) {
    assert.match(skill, new RegExp(`\\b${key}\\b`), key);
  }
  assert.match(skill, /same-harness fallback.*forbidden|不得.*同源/i);
});
