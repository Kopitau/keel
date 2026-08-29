import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runNew } from "../tools/gate/new.ts";
import { runStatus } from "../tools/gate/status.ts";
import { asciiSlug } from "../tools/gate/ids.ts";
import { casefoldCollisions } from "../tools/gate/git.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { SKILL_CATALOG } from "../tools/gate/skills.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-023 P2-5 status wave comes from config not hardcoded W2", () => {
  const st = runStatus(makeCtx(repo));
  assert.equal(st.code, 0, st.stderr);
  assert.doesNotMatch(st.stdout, /^wave: W2$/m);
  assert.match(st.stdout, /^wave: /m);
});

test("REQ-024 P2-8 casefold collisions are detected on path lists (git index)", () => {
  const hits = casefoldCollisions(["AGENTS.md", "docs/a.md", "agents.md"]);
  assert.ok(hits.some((h) => /AGENTS\.md vs agents\.md/i.test(h)), hits.join(";"));
  assert.deepEqual(casefoldCollisions(["AGENTS.md", "CLAUDE.md"]), []);
});

test("REQ-017 P2-9 default test_command is node --test not tests as a module", () => {
  const src = readFileSync(join(repo, "tools", "gate", "verify.ts"), "utf8");
  assert.match(src, /: "node --test"/);
  assert.doesNotMatch(src, /node --test tests`/);
  assert.doesNotMatch(src, /\$\{process\.execPath\} --test tests/);
});

test("REQ-010 P2-10 Chinese titles still get a unique ascii slug", () => {
  const a = asciiSlug("追溯对账未进门禁", "z");
  const b = asciiSlug("另一条中文标题", "z");
  assert.match(a, /^z-[0-9a-f]{8}$/);
  assert.ok(a !== b, `${a} vs ${b}`);
  const dir = mkdtempSync(join(tmpdir(), "keel-p2-slug-"));
  mkdirSync(join(dir, "keel", "issues"), { recursive: true });
  mkdirSync(join(dir, "keel", "templates"), { recursive: true });
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({ records_dir: "keel" }),
    "utf8",
  );
  writeFileSync(join(dir, "keel", "templates", "ISS.md"), "# ISS-000 标题\n", "utf8");
  const r = runNew(makeCtx(dir), ["iss", "追溯对账未进门禁"]);
  assert.equal(r.code, 0, r.stderr);
  const names = readdirSync(join(dir, "keel", "issues")).filter((n) => n.startsWith("ISS-"));
  assert.equal(names.length, 1);
  assert.match(names[0] ?? "", /^ISS-001-z-[0-9a-f]{8}\.md$/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-024 P2-6 DEC-148 LF fixture has a golden digest", () => {
  const disk = sha256Normalized(readFileSync(join(repo, "tests", "fixtures", "dec148-lf.txt")));
  assert.equal(disk, "9d010fdf165c4cfe1b56acce536fd5dd18ce7406a4ec74d26a1c188313f6ba55");
  assert.equal(disk, sha256Normalized("keel-dec148-fixture\n"));
  assert.equal(disk, sha256Normalized("keel-dec148-fixture\r\n"));
});

test("REQ-016 P2-1 skill bodies are executable protocols not DESIGN dumps", () => {
  for (const name of SKILL_CATALOG) {
    const text = readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8");
    assert.match(text, /^---\nname: /);
    assert.ok(/^## /m.test(text), `${name} needs a heading`);
    assert.ok(
      /\bnode tools\/gate\b/.test(text) || /^\d+\.\s/m.test(text) || /^- /m.test(text),
      `${name} needs steps or a gate command`,
    );
  }
});

test("REQ-002 RES template has required sections", () => {
  const t = readFileSync(join(repo, "keel", "templates", "RES.md"), "utf8");
  for (const h of ["调研问题", "检索范围", "候选对比", "逐项证据", "结论", "剩余不确定性"]) {
    assert.ok(t.includes(`## ${h}`), h);
  }
});

test("REQ-003 DEC template records user words and status", () => {
  const t = readFileSync(join(repo, "keel", "templates", "DEC.md"), "utf8");
  assert.match(t, /status:/);
  assert.match(t, /用户决定原话/);
});

test("REQ-005 AGENTS.md is the overhead map and stays in budget", () => {
  const text = readFileSync(join(repo, "AGENTS.md"), "utf8");
  const n = text.split("\n").filter((l, i, a) => !(i === a.length - 1 && l === "")).length;
  assert.ok(n <= 150, String(n));
});

test("REQ-007 k-review lists the five review inputs", () => {
  const t = readFileSync(join(repo, ".agents", "skills", "k-review", "SKILL.md"), "utf8");
  for (const k of ["Diff", "plan/vN.md", "REQ", "Evidence", "Worklog"]) {
    assert.match(t, new RegExp(k, "i"));
  }
});

test("REQ-008 G-merge stays skip without an approved APR", () => {
  const dir = mkdtempSync(join(tmpdir(), "keel-p2-merge-"));
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "approvals"), { recursive: true });
  writeFileSync(join(dir, "AGENTS.md"), "# k\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(join(dir, "keel", "config.json"), JSON.stringify({ records_dir: "keel" }), "utf8");
  writeFileSync(join(dir, "keel", "requirements", "v1.md"), "# r\n\n## 未决问题\n", "utf8");
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v1.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# p\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n| I-01 | A → B |\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "plan", "INDEX.md"), "- current: overview-v1.md\n", "utf8");
  const r = runCheck(makeCtx(dir), []);
  assert.match(r.stdout, /SKIP G-merge/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-009 summary template has the five retro sections", () => {
  const t = readFileSync(join(repo, "keel", "templates", "summary.md"), "utf8");
  for (const h of ["做了什么 / 为什么", "技术路线说明", "关键决策与被否方案", "测试与证据指针", "遗留债务与已知限制"]) {
    assert.ok(t.includes(`## ${h}`), h);
  }
});

test("REQ-010 ISS template has a defense_pointer field", () => {
  const t = readFileSync(join(repo, "keel", "templates", "ISS.md"), "utf8");
  assert.match(t, /defense_pointer:/);
  assert.match(t, /闭环选择与理由/);
});

test("REQ-013 LES template has phenomenon lesson bounds counterexample", () => {
  const t = readFileSync(join(repo, "keel", "templates", "LES.md"), "utf8");
  for (const h of ["现象", "教训", "适用边界", "反例", "去向"]) {
    assert.ok(t.includes(`## ${h}`), h);
  }
});

test("REQ-014 knowledge library is not stored in the repo", () => {
  assert.equal(existsSync(join(repo, "keel", "knowledge")), false);
});

test("REQ-022 migrate mapping templates exist", () => {
  for (const n of ["trellis.md", "superpowers.md", "unstructured.md"]) {
    assert.equal(existsSync(join(repo, "keel", "templates", "migrate", n)), true, n);
  }
});
