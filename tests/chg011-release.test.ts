// REQ-023/AC-6 (C-140): a change that touches directory protocol, record fields or
// gate semantics ships with release notes that list the breaking points.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-023/AC-6 the release notes for the package version list the CHG-011 breaking points and the consumer steps", () => {
  const version = (JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as { version: string }).version;
  const notes = readFileSync(join(repo, `RELEASE-${version}.md`), "utf8");
  assert.match(notes, /CHG-011/);
  assert.match(notes, /^## 破坏点/m);
  for (const h of ["门禁", "钩子", "评审回路", "记录与模板", "技能", "消费项目要做的事"]) assert.ok(notes.includes(h), h);
  assert.match(notes, /adr|DEC-183/);
});

test("keel --version prints the installer's package version and nothing else", () => {
  const version = (JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as { version: string }).version;
  const r = spawnSync(process.execPath, [join(repo, "bin", "keel.js"), "--version"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), version);
  assert.equal(r.stderr, "");
});
