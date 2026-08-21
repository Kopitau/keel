import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { runIndex } from "../tools/gate/indexgen.ts";
import { runNew } from "../tools/gate/new.ts";
import { runStatus } from "../tools/gate/status.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import {
  formatLedger,
  HARNESS_DISCOVERY,
  inspectGrokKSkills,
  kSkillsFromInspect,
  PRIMARY_CLIS,
  probeHarnesses,
  skillTriggerGaps,
} from "../tools/gate/triggers.ts";
import { SKILL_CATALOG } from "../tools/gate/skills.ts";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { encoding: "utf8", cwd });
  if ((r.status ?? 1) !== 0) throw new Error(r.stderr || r.stdout || args.join(" "));
}

const GREET_V1 =
  "function greet(name) { return \"hello \" + String(name ?? \"\"); }\nmodule.exports = { greet };\n";

function writeAssert(dir: string, body: string): number {
  writeFileSync(join(dir, "assert-greet.js"), body, "utf8");
  return spawnSync(process.execPath, ["assert-greet.js"], { cwd: dir }).status ?? 1;
}

function greetHello(dir: string): number {
  return writeAssert(
    dir,
    'const { greet } = require("./greet.js");\n' +
      'const r = greet("Ada");\n' +
      'if (r !== "hello Ada") { console.error(r); process.exit(1); }\n',
  );
}

function greetEmptyThrows(dir: string): boolean {
  const status = writeAssert(
    dir,
    'const { greet } = require("./greet.js");\n' +
      "try { greet(\"\"); process.exit(0); } catch (e) { process.exit(2); }\n",
  );
  return status === 2;
}

function smokeRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), "keel-w5-"));
  mkdirSync(join(dir, "keel", "requirements"), { recursive: true });
  mkdirSync(join(dir, "keel", "plan"), { recursive: true });
  mkdirSync(join(dir, "keel", "templates"), { recursive: true });
  cpSync(join(repo, "keel", "templates"), join(dir, "keel", "templates"), { recursive: true });
  writeFileSync(join(dir, "greet.js"), GREET_V1, "utf8");
  writeFileSync(join(dir, "AGENTS.md"), "# keel\n", "utf8");
  writeFileSync(join(dir, "CLAUDE.md"), "@AGENTS.md\n", "utf8");
  writeFileSync(
    join(dir, "keel", "config.json"),
    JSON.stringify({
      records_dir: "keel",
      enforcement_tier: "local",
      budget: { agents_md_max_lines: 150, agents_md_chain_max_bytes: 32768, skill_count_cap: 16 },
    }),
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "requirements", "v1.md"),
    "# 需求书 v1\n\n## 未决问题\n\n## REQ-001 greet\n\n- **acceptance**:\n  - Given a name When greet Then hello + name\n",
    "utf8",
  );
  writeFileSync(
    join(dir, "keel", "plan", "overview-v1.md"),
    "# 规划 v1\n\n## 接口与耦合\n\n| ID | 从 → 到 |\n|---|---|\n| I-01 | greet → caller |\n",
    "utf8",
  );
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "w5@example.com"]);
  git(dir, ["config", "user.name", "w5"]);
  git(dir, ["add", "-A"]);
  git(dir, ["commit", "-m", "smoke"]);
  return dir;
}

test("REQ-023 W5 full flow: impl, bugfix, change, handoff relay", () => {
  const dir = smokeRoot();
  const ctx = makeCtx(dir);
  assert.equal(runNew(ctx, ["feature", "greet"]).code, 0);
  assert.equal(runNew(ctx, ["dec", "greeting prefix"]).code, 0);
  assert.equal(runIndex(ctx).code, 0);
  const chk = runCheck(ctx, ["--quick"]);
  assert.equal(chk.code, 0, chk.stdout);

  assert.equal(greetHello(dir), 0);
  assert.equal(greetEmptyThrows(dir), false);

  writeFileSync(
    join(dir, "greet.js"),
    'function greet(name) { return "hi"; }\nmodule.exports = { greet };\n',
    "utf8",
  );
  assert.equal(greetHello(dir), 1);
  assert.equal(runNew(ctx, ["iss", "greet ignores name"]).code, 0);
  writeFileSync(join(dir, "greet.js"), GREET_V1, "utf8");
  assert.equal(greetHello(dir), 0);

  assert.equal(runNew(ctx, ["chg", "add empty-name error"]).code, 0);
  writeFileSync(
    join(dir, "keel", "requirements", "v2.md"),
    "# 需求书 v2\n\n- replaces: v1.md\n- change: CHG-001\n\n## 未决问题\n\n## REQ-001 greet\n\n- **acceptance**:\n  - Given a name When greet Then hello + name\n  - Given empty name When greet Then throw\n",
    "utf8",
  );
  writeFileSync(join(dir, "keel", "requirements", "INDEX.md"), "- current: v2.md\n", "utf8");
  writeFileSync(
    join(dir, "greet.js"),
    readFileSync(join(repo, "samples", "greet", "greet.js"), "utf8"),
    "utf8",
  );
  assert.equal(runIndex(ctx).code, 0);
  const idx = readFileSync(join(dir, "keel", "requirements", "INDEX.md"), "utf8");
  assert.match(idx, /- current: v2.md/);
  assert.equal(greetHello(dir), 0);
  assert.equal(greetEmptyThrows(dir), true);

  writeFileSync(
    join(dir, "keel", "handoff.md"),
    "# 交接\n\n## 做了什么 / 为什么\n\n冒烟 greet。\n\n## 当前功能与阶段\n\nF1 greet 已修 bug。\n\n## 下一步\n\n接力：跑 status 再读本文件。\n\n## 未决问题\n\n无\n\n## 该读文件\n\n1. 本文件\n",
    "utf8",
  );
  const st = runStatus(ctx);
  assert.equal(st.code, 0, st.stderr);
  assert.match(st.stdout, /handoff:/);
  const relay = readFileSync(join(dir, "keel", "handoff.md"), "utf8");
  assert.match(relay, /下一步/);
  assert.match(relay, /该读文件/);
  rmSync(dir, { recursive: true, force: true });
});

test("REQ-024 DEC-148 fixture hashes the same LF corpus", () => {
  const p = join(repo, "tests", "fixtures", "dec148-lf.txt");
  const disk = sha256Normalized(readFileSync(p));
  const expect = sha256Normalized("keel-dec148-fixture\n");
  assert.equal(disk, expect);
});

test("REQ-016 W5 trigger tokens, discovery roots, harness probe", () => {
  assert.deepEqual(skillTriggerGaps(repo), []);
  const rows = probeHarnesses();
  assert.equal(rows.length, 6);
  assert.ok(rows.some((r) => r.id === "grok-build" && r.role === "primary"));
  assert.ok(rows.some((r) => r.id === "pi" && r.role === "compatible"));
  assert.equal(HARNESS_DISCOVERY.length, 6);
  assert.equal(HARNESS_DISCOVERY.find((d) => d.id === "claude-code")?.skills, ".claude/skills");
  assert.equal(HARNESS_DISCOVERY.find((d) => d.id === "pi")?.skills, ".agents/skills");
  assert.ok(existsSync(join(repo, "AGENTS.md")));
  assert.ok(existsSync(join(repo, ".agents", "skills", "k-status", "SKILL.md")));
  assert.ok(existsSync(join(repo, ".claude", "skills", "k-status", "SKILL.md")));
  for (const name of SKILL_CATALOG) {
    const desc = readFileSync(join(repo, ".agents", "skills", name, "SKILL.md"), "utf8");
    assert.doesNotMatch(desc, /\/plugin marketplace/i);
  }
  const ledger = formatLedger(repo, [
    { id: "pi", bin: "pi", role: "compatible", path: null, live: false, version: null },
  ]);
  assert.match(ledger, /未实测/);
  assert.match(ledger, /Pi 冒烟/);
});

test("REQ-016 kSkillsFromInspect keeps catalog order", () => {
  const payload = JSON.stringify({
    skills: [
      { name: "unrelated" },
      ...[...SKILL_CATALOG].reverse().map((name) => ({ name })),
    ],
  });
  assert.deepEqual(kSkillsFromInspect(payload), [...SKILL_CATALOG]);
});

test("REQ-016 grok inspect lists all k-* when grok CLI is present", () => {
  const grok = PRIMARY_CLIS.find((h) => h.id === "grok-build");
  assert.ok(grok);
  const row = probeHarnesses().find((r) => r.id === "grok-build");
  if (!row?.live) return;
  const got = inspectGrokKSkills();
  assert.equal(got.error, undefined, got.error);
  assert.deepEqual(got.names, [...SKILL_CATALOG]);
});
