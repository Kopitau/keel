import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { countKnowledge, knowledgeIndex } from "../tools/gate/knowledge.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string): string => readFileSync(join(repo, rel), "utf8");

function library(): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-knowledge-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "KLES-001-safe.md"),
    "---\nid: KLES-001\nsummary: Keep the reusable boundary explicit.\n---\n\n# title\n\nSECRET_PROJECT_NAME must never enter the index.\n",
    "utf8",
  );
  writeFileSync(join(dir, "notes.md"), "not a KLES\n", "utf8");
  return dir;
}

test("REQ-014/AC-1 KLES is one file per entry in the user knowledge directory and is not a repo record", () => {
  const dir = library();
  assert.equal(countKnowledge(dir).count, 1);
  assert.match(read("keel/templates/KLES.md"), /~\/\.keel\/knowledge\//);
  assert.match(read("keel/templates/KLES.md"), /不入项目仓库/);
});

test("REQ-014/AC-2 [proxy:human redaction review evidence not recorded] template binds date reviewer checklist pre post hashes and diff without secret values", () => {
  const template = read("keel/templates/KLES.md");
  for (const marker of ["review_date", "reviewer", "redaction_checklist", "before_hash", "after_hash", "diff_pointer"]) assert.match(template, new RegExp(marker));
  assert.match(template, /项目名/);
  assert.match(template, /私密路径/);
  assert.match(template, /身份信息/);
  assert.match(template, /秘密值/);
});

test("REQ-014/AC-3 opening index returns only id and a few summary lines, never the KLES body", () => {
  const entries = knowledgeIndex(library());
  assert.deepEqual(entries.map((entry) => entry.id), ["KLES-001"]);
  assert.match(entries[0]?.summary ?? "", /reusable boundary/);
  assert.doesNotMatch(JSON.stringify(entries), /SECRET_PROJECT_NAME/);
  assert.ok((entries[0]?.summary.split(/\n/).length ?? 99) <= 3);
});

test("REQ-014/AC-4 project adoption requires project confirmation and cites the KLES id", () => {
  const template = read("keel/templates/KLES.md");
  assert.match(template, /本项目确认/);
  assert.match(template, /KLES 编号/);
});
