import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { measureAutoload } from "../tools/gate/autoload.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");

test("REQ-005/AC-1 status gate index id skeleton and mirror are deterministic local scripts with no model SDK", () => {
  const gate = read("tools/gate/gate.ts");
  for (const command of ["status", "check", "index", "new", "sync", "hash"]) assert.match(gate, new RegExp(`cmd === \"${command}\"`));
  const sources = ["tools/gate/gate.ts", "tools/gate/status.ts", "tools/gate/indexgen.ts", "tools/gate/ids.ts", "tools/gate/new.ts", "tools/gate/sync.ts"]
    .map(read)
    .join("\n");
  assert.doesNotMatch(sources, /from\s+["'](?:openai|@anthropic-ai\/sdk|google-generativeai|cohere)/i);
  const pkg = JSON.parse(read("package.json")) as { dependencies?: Record<string, string> };
  assert.deepEqual(pkg.dependencies ?? {}, {});
});

test("REQ-005/AC-2 session autoload is only root bridge and skill catalog and stays at or below 10 KiB", () => {
  const measured = measureAutoload(repo);
  assert.ok(measured.agents > 0);
  assert.ok(measured.catalog > 0);
  assert.ok(measured.total <= 10_240, JSON.stringify(measured));
});

test("REQ-005/AC-3 root instructions require three jumps and forbid bulk-loading the records directory", () => {
  const agents = read("AGENTS.md");
  assert.match(agents, /Session start \(three jumps\)/);
  assert.match(agents, /gate.*status[\s\S]*handoff[\s\S]*current feature plan \+ worklog/i);
  assert.match(agents, /Do \*\*not\*\* bulk-load the records directory/i);
});

test("REQ-005/AC-4 [proxy:longform recorder model and reasoning evidence not recorded] worklog contract requires same-model medium model reasoning path and date", () => {
  const impl = read(".agents/skills/k-impl/SKILL.md");
  assert.match(impl, /longform/i);
  assert.match(impl, /same model.*medium/i);
  for (const marker of ["model", "reasoning", "path", "date"]) assert.match(impl, new RegExp(marker, "i"));
});

test("REQ-005/AC-5 [proxy:no token-saving quality audit recorded] contract records candidate loss and rejection", () => {
  const impl = read(".agents/skills/k-impl/SKILL.md");
  assert.match(impl, /token-saving/i);
  assert.match(impl, /candidate/i);
  assert.match(impl, /quality or functional loss/i);
  assert.match(impl, /reject/i);
});
