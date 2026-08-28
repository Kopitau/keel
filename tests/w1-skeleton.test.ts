import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { isAtLeast, parseVersion } from "../tools/gate/node-version.ts";
import { isAllowedTestCommand } from "../tools/gate/testcmd.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("REQ-016 CLAUDE.md is a one-line bridge", () => {
  const text = readFileSync(join(root, "CLAUDE.md"), "utf8").trim();
  assert.equal(text, "@AGENTS.md");
});

test("REQ-020 AGENTS.md stays within line and byte budget", () => {
  const text = readFileSync(join(root, "AGENTS.md"), "utf8");
  const lines = text.split("\n");
  const n = lines[lines.length - 1] === "" ? lines.length - 1 : lines.length;
  assert.ok(n <= 150, `AGENTS.md has ${n} lines`);
  assert.ok(text.length <= 32768, `AGENTS.md is ${text.length} chars`);
});

test("I-17 REQ-021 config.json has required keys and profiles.keel-gate is the gate's own allowlisted test command", () => {
  const data = JSON.parse(readFileSync(join(root, "keel", "config.json"), "utf8")) as {
    [k: string]: unknown;
  };
  for (const key of [
    "schema_version",
    "project_name",
    "records_dir",
    "enforcement_tier",
    "profiles",
    "identities",
    "platforms",
    "budget",
    "optional",
  ]) {
    assert.ok(key in data, key);
  }
  // The tier is a project setting, not a requirement of REQ-021; asserting one
  // value here broke the suite when the repo legitimately moved to github.
  assert.ok(
    ["local", "gitee", "github"].includes(String(data.enforcement_tier)),
    `unknown enforcement_tier: ${String(data.enforcement_tier)}`,
  );
  const profiles = data.profiles as { active: string[]; [k: string]: unknown };
  assert.ok(profiles.active.includes("keel-gate"));
  // I-17 (F17 → F21): the keel-gate profile is the gate's own full-suite command,
  // and it must be one verify would accept — otherwise evidence for this repo is unrunnable.
  const gateProfile = profiles["keel-gate"] as { test_command?: string } | undefined;
  assert.equal(
    isAllowedTestCommand(gateProfile?.test_command ?? "", "keel-gate"),
    true,
    `keel-gate.test_command=${String(gateProfile?.test_command)}`,
  );
});

test("REQ-004 plan INDEX has a unique current pointer", () => {
  const text = readFileSync(join(root, "keel", "plan", "INDEX.md"), "utf8");
  const currents = text.split(/\n/).filter((ln) => ln.startsWith("- current:"));
  assert.equal(currents.length, 1, `current pointers: ${currents.join(", ")}`);
  const current = (currents[0] ?? "").replace("- current:", "").trim();
  assert.match(current, /^overview-v\d+\.md$/);
  const body = readFileSync(join(root, "keel", "plan", current), "utf8");
  assert.match(body, /^# 统一实施规划总览 v\d+/);
});

test("REQ-011 requirements INDEX unique current is v4", () => {
  const text = readFileSync(join(root, "keel", "requirements", "INDEX.md"), "utf8");
  const currents = text.split(/\n/).filter((ln) => ln.startsWith("- current:"));
  assert.deepEqual(currents, ["- current: v4.md"]);
  const body = readFileSync(join(root, "keel", "requirements", "v4.md"), "utf8");
  assert.ok(body.includes("## REQ-025"));
});

test("REQ-012 gate status prints handoff path", () => {
  const proc = spawnSync(process.execPath, ["tools/gate/gate.ts", "status"], {
    encoding: "utf8",
    cwd: root,
  });
  assert.equal(proc.status, 0, proc.stderr);
  assert.match(proc.stdout, /handoff:/);
  assert.match(proc.stdout, /node\+ts/);
});

test("I-16 REQ-024 DEC-144 CRLF, LF and BOM hash to the same digest", () => {
  const lf = "hello\nworld\n";
  const crlf = "hello\r\nworld\r\n";
  const bom = "\uFEFFhello\nworld\n";
  assert.equal(sha256Normalized(lf), sha256Normalized(crlf));
  assert.equal(sha256Normalized(lf), sha256Normalized(bom));
});

test("REQ-024 DEC-150 Node version compare", () => {
  assert.ok(isAtLeast("22.18.0", "22.18.0"));
  assert.ok(isAtLeast("22.19.0", "22.18.0"));
  assert.ok(isAtLeast("24.0.0", "22.18.0"));
  assert.equal(isAtLeast("22.17.0", "22.18.0"), false);
  assert.deepEqual(parseVersion("v22.18.0"), [22, 18, 0]);
});

test("REQ-024 DEC-146 launchers exist", () => {
  const sh = readFileSync(join(root, "tools", "gate", "gate.sh"), "utf8");
  const ps1 = readFileSync(join(root, "tools", "gate", "gate.ps1"), "utf8");
  assert.match(sh, /22\.18\.0/);
  assert.match(ps1, /22\.18\.0/);
});

test("REQ-024 DEC-144 gitattributes force LF", () => {
  const text = readFileSync(join(root, ".gitattributes"), "utf8");
  assert.match(text, /\* text=auto eol=lf/);
});

test("REQ-024 DEC-145 no case-only filename collisions under keel/", () => {
  const keel = join(root, "keel");
  const files = readdirSync(keel, { recursive: true }) as string[];
  const seen = new Map<string, string>();
  for (const rel of files) {
    const key = rel.replace(/\\/g, "/").toLowerCase();
    const prev = seen.get(key);
    assert.ok(!prev || prev === rel, `case collision: ${prev} vs ${rel}`);
    seen.set(key, rel);
  }
});

test("REQ-023 bootstrap id-map still covers C-01..C-142", () => {
  const data = JSON.parse(
    readFileSync(join(root, "keel", "features", "f23-bootstrap", "id-map.json"), "utf8"),
  ) as { decisions: { [k: string]: string }; features: { [k: string]: unknown } };
  assert.equal(data.decisions["C-01"], "DEC-001");
  assert.equal(data.decisions["C-142"], "DEC-142");
  assert.ok(Object.keys(data.features).length >= 23);
});
