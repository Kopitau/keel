// CHG-014 S7: the platform pits the pilots hit are written down where the next agent
// looks (machine-doc), the migration skill covers "flatten everything", and the skill
// mirrors stay identical to their source.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-016/AC-11 platform-limits.md names the Codex Desktop, Cursor and Windows pits with their workarounds", () => {
  const doc = readFileSync(join(repo, "tools", "gate", "platform-limits.md"), "utf8");
  assert.match(doc, /\*\*Codex Desktop\*\*.*Bad file descriptor.*escalation.*safety classifier/s);
  assert.match(doc, /CODEX_THREAD_ID/);
  assert.match(doc, /`KEEL_AGENT` is only for harnesses that export nothing/);
  assert.match(doc, /\*\*Cursor \(compatible tier\)\*\*.*not auto-attached.*swallow git stdout.*not UTF-8.*Host: cursor/s);
  assert.match(doc, /\*\*Windows \(all harnesses\)\*\*.*spawnSync\("npx"\).*PowerShell.*heredoc/s);
});

test("REQ-012/AC-6 the root instructions require every reply to end with a 下一步 paragraph, and k-handoff repeats it for the session's last reply", () => {
  const agents = readFileSync(join(repo, "AGENTS.md"), "utf8");
  assert.match(agents, /^## Turn end$/m);
  assert.match(agents, /what was done and why it matters, in plain sentences/);
  assert.match(agents, /where things stand now/);
  assert.match(agents, /a final paragraph that starts with `下一步：`/);
  assert.match(agents, /the single decision only the user can make/);
  assert.match(agents, /they never replace it/);
  assert.match(agents, /Never end on a status dump/);
  assert.ok(agents.split("\n").length <= 150, "AGENTS.md line budget (C-118)");
  const handoff = readFileSync(join(repo, ".agents", "skills", "k-handoff", "SKILL.md"), "utf8");
  assert.match(handoff, /plain-language wrap-up/);
  assert.match(handoff, /`下一步：` paragraph/);
});

test("REQ-022/AC-6 k-migrate treats flattening as a migration: report, one deletion commit, old framework disabled in it", () => {
  const skill = readFileSync(join(repo, ".agents", "skills", "k-migrate", "SKILL.md"), "utf8");
  assert.match(skill, /Flattening is still a migration/);
  assert.match(skill, /keel\/migration-report\.md/);
  assert.match(skill, /its own commit/);
  assert.match(skill, /SessionStart injection/);
});

test("CHG-014 the k-* skills that changed still fit the 80-line cap and the Claude mirror equals the source", () => {
  for (const name of ["k-migrate", "k-accept", "k-impl", "k-handoff", "k-review", "k-log", "k-evidence"]) {
    const src = readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8");
    assert.ok(src.split("\n").length <= 80, `${name} lines`);
    const mirror = readFileSync(join(repo, ".claude", "skills", name, "SKILL.md"), "utf8");
    assert.equal(mirror, src, `${name} mirror`);
  }
  assert.ok(readdirSync(join(repo, ".agents", "skills")).includes("k-review"));
  const review = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  assert.match(review, /rejected whole, archived under `keel\/review\/raw\/`/);
  assert.match(review, /reviewer budget/);
  assert.match(review, /recurrence_of/);
  const accept = readFileSync(join(repo, ".agents", "skills", "k-accept", "SKILL.md"), "utf8");
  assert.match(accept, /Acceptance and merge are two APRs and two actions/);
  assert.match(accept, /evidence_\*/);
});
