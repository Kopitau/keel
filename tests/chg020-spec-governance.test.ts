import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runDrift, type DriftReport } from "../tools/gate/drift.ts";
import { runAtlas } from "../tools/gate/atlas.ts";
import { runStatus } from "../tools/gate/status.ts";
import { sha256Body } from "../tools/gate/hash.ts";
import { type SpecModel } from "../tools/gate/spec-map.ts";
import { runCli } from "../tools/cli/main.js";
import { scrubHookGitEnv, scrubProcessGitEnv } from "./fixtures/git-env.ts";

scrubProcessGitEnv(process.env);
const repo = dirname(dirname(fileURLToPath(import.meta.url)));
type Report = DriftReport & { model: SpecModel };

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "keel-chg020-"));
  const write = (path: string, body: string): void => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body, "utf8");
  };
  const git = (args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8", env: scrubHookGitEnv(process.env) });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  const plan = (id: number, paths = ["src/query.ts"], related = ["src/context.ts"]) =>
    `---\nfeature: F${id}\nreq: [REQ-001]\nimplementation: ${JSON.stringify(paths)}\nrelated: ${JSON.stringify(related)}\n---\n\n# F${id} 查询\n\n## 原始意图\n\n来源 CHG-001\n\n## 工作解释\n\n保留原值\n\n## 技术实现\n\n直接返回存储值，不计算新口径。\n`;
  write("keel/config.json", JSON.stringify({ records_dir: "keel", enforcement_tier: "local" }));
  write("AGENTS.md", "# Fixture\n"); write("CLAUDE.md", "@AGENTS.md\n");
  write("keel/requirements/INDEX.md", "- current: v1.md\n");
  write("keel/requirements/v1.md", "# Requirements\n\n- status: working\n\n## 原始意图\n\n来源 用户：请保留原值。\n\n## 工作解释\n\nagent：只查询，不改变原值。\n\n## REQ-001 查询\n\n- **feature**: F1\n- **acceptance**:\n  - Given stored data When queried Then preserve value\n  - Given the real environment When reviewed Then obtain human evidence\n- **verification**: [auto, manual]\n");
  write("keel/plan/INDEX.md", "- current: overview-v1.md\n");
  write("keel/plan/overview-v1.md", "# Plan\n\n## 接口与耦合\n\n| I-20 | requirements → implementation |\n");
  write("keel/features/f01-query/plan/v1.md", plan(1));
  write("src/query.ts", "export const query = (stored: number) => stored;\n");
  write("src/context.ts", "// related only\n");
  write("tests/query.test.js", 'import {test} from "node:test";\ntest("REQ-001/AC-1 [proxy:F1 real source] query", () => {});\n');
  write("evidence.md", "已通过查询公共接口比对固定输入输出；人工环境条件未验收。\n");
  git(["init", "-q", "-b", "main"]); git(["config", "user.name", "Fixture"]); git(["config", "user.email", "fixture@example.com"]);
  git(["add", "-A"]); git(["commit", "-qm", "fixture"]);
  const ctx = makeCtx(root);
  const report = (): Report => JSON.parse(runDrift(ctx, ["--json"]).stdout) as Report;
  const review = (id = "F1", extra: string[] = []) => runDrift(ctx, [
    "review", id, "--expect", report().rows.find(r => r.feature === id)?.fingerprint ?? "",
    "--reason", "公共接口输出仍匹配承诺；复核不是人工验收", "--evidence", "evidence.md", ...extra,
  ]);
  return { root, write, git, ctx, plan, report, review };
}

test("REQ-029/AC-1 I-20 public CLI projects bound plans and leaves newer drafts visibly separate", () => {
  const f = fixture();
  try {
    const body = readFileSync(join(f.root, "keel/features/f01-query/plan/v1.md"), "utf8");
    f.write("keel/approvals/APR-001.md", `---\nid: APR-001\nstatus: approved\nartifacts:\n  - path: keel/features/f01-query/plan/v1.md\n    content_sha256: ${sha256Body(body)}\n---\n\n# Fixture approval\n`);
    f.write("keel/features/f01-query/plan/v2.md", f.plan(1, ["src/future.ts"]));
    const command = spawnSync(process.execPath, [join(repo, "tools/gate/gate.ts"), "--root", f.root, "drift", "--json"], { encoding: "utf8" });
    assert.equal(command.status, 0, command.stderr);
    const data = JSON.parse(command.stdout) as Report;
    assert.deepEqual(data.model.features[0]?.implementation.map(p => p.path), ["src/query.ts"]);
    assert.deepEqual(data.model.features[0]?.drafts, ["keel/features/f01-query/plan/v2.md"]);
    assert.equal(data.rows[0]?.state, "unreviewed");
    assert.deepEqual(data.model.features[0]?.reqs, ["REQ-001"]);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-029/AC-2 REQ-029/AC-3 shared changes, spec-only and both changes require explicit per-feature review", () => {
  const f = fixture();
  try {
    f.write("keel/features/f02-other/plan/v1.md", f.plan(2));
    assert.equal(f.review().code, 0); assert.equal(f.review("F2").code, 0);
    assert.deepEqual(f.report().rows.map(r => r.state), ["aligned", "aligned"]);
    f.write("src/query.ts", "export const query = (stored: number) => stored + 1;\n");
    assert.deepEqual(f.report().rows.map(r => r.state), ["code-changed", "code-changed"]);
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1) + "\n一次说明编辑不能消掉漂移。\n");
    assert.equal(f.report().rows[0]?.state, "both-changed");
    assert.equal(f.review().code, 0);
    assert.deepEqual(f.report().rows.map(r => r.state), ["aligned", "code-changed"]);
    f.write("keel/requirements/v1.md", readFileSync(join(f.root, "keel/requirements/v1.md"), "utf8").replace("preserve value", "return adjusted value"));
    assert.equal(f.report().rows[0]?.state, "spec-changed");
    assert.equal(f.report().rows[1]?.state, "both-changed");
    const ledger = JSON.parse(readFileSync(join(f.root, "keel/drift/F1.json"), "utf8"));
    assert.equal(ledger.entries.length, 2);
    assert.match(ledger.entries[1].actor, /Fixture/);
    assert.match(ledger.entries[1].evidence.hash, /^[a-f0-9]{64}$/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-029/AC-2 related changes are advisory; deletion, rename and removal of governance cannot silently align", () => {
  const f = fixture();
  try {
    assert.equal(f.review().code, 0);
    f.write("src/context.ts", "// new context\n");
    assert.equal(f.report().rows[0]?.state, "aligned");
    assert.match(f.report().rows[0]?.notes.join(" ") ?? "", /related context changed/);
    renameSync(join(f.root, "src/query.ts"), join(f.root, "src/renamed.ts"));
    assert.equal(f.report().rows[0]?.state, "missing");
    assert.notEqual(f.review().code, 0);
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1, ["src/renamed.ts"]));
    assert.equal(f.report().rows[0]?.state, "both-changed");
    assert.equal(f.review().code, 0);
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1, []));
    assert.equal(f.report().rows[0]?.state, "missing");
    assert.notEqual(f.review().code, 0);
    rmSync(join(f.root, "keel/features/f01-query"), { recursive: true, force: true });
    assert.equal(f.report().rows[0]?.state, "missing");
    assert.equal(runDrift(f.ctx, ["--check"]).code, 1);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-029/AC-3 stale fingerprints, unavailable evidence, corruption and unsafe paths fail without staging changes", () => {
  const f = fixture();
  try {
    const fingerprint = f.report().rows[0]?.fingerprint ?? "";
    f.write("unrelated.txt", "user staged work"); f.git(["add", "unrelated.txt"]);
    const index = f.git(["write-tree"]);
    f.write("src/query.ts", "export const query = () => 8;\n");
    assert.equal(runDrift(f.ctx, ["review", "F1", "--expect", fingerprint, "--reason", "outdated", "--evidence", "evidence.md"]).code, 1);
    assert.equal(f.review("F1", ["--reason", "duplicate"]).code, 2);
    rmSync(join(f.root, "evidence.md"));
    assert.equal(f.review().code, 1);
    f.write("evidence.md", "new review evidence\n");
    assert.equal(f.review().code, 0);
    f.write("keel/drift/F1.json", "{}\n");
    assert.equal(f.report().rows[0]?.state, "invalid");
    assert.equal(f.review().code, 1);
    assert.equal(f.git(["write-tree"]), index);
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1, ["../outside.ts"]));
    assert.match(f.report().model.features[0]?.implementation[0]?.problem ?? "", /unsafe/);
    assert.equal(f.git(["write-tree"]), index);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-029/AC-4 old projects opt in gradually; diagnostic/status are read-only and strict mode reports pending reviews", () => {
  const f = fixture();
  try {
    f.write("keel/features/f02-old/plan/v1.md", "---\nfeature: F2\nreq: [REQ-001]\n---\n# Legacy\n");
    const before = f.git(["status", "--porcelain"]);
    assert.equal(runDrift(f.ctx, []).code, 0);
    assert.equal(runDrift(f.ctx, ["--check"]).code, 1);
    assert.match(runStatus(f.ctx).stdout, /drift: 1 need review; 1 unmapped/);
    assert.equal(f.git(["status", "--porcelain"]), before);
    assert.equal(f.review().code, 0);
    assert.equal(runDrift(f.ctx, ["--check"]).code, 0);
    assert.equal(f.report().unmapped, 1);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-030/AC-1 REQ-030/AC-4 I-21 atlas uses the same relations, technical plan and honest evidence/manual/proxy projections", () => {
  const f = fixture();
  try {
    const index = f.git(["write-tree"]);
    const data = JSON.parse(runAtlas(f.ctx, ["--json"]).stdout);
    assert.deepEqual(data.model, f.report().model);
    assert.match(data.model.features[0].technical, /直接返回/);
    assert.equal(data.evidence.current, false);
    assert.deepEqual(data.trace[0].manualAc, [2]);
    assert.deepEqual(data.trace[0].proxyAc, [{ ac: 1, note: "F1 real source" }]);
    assert.equal(runAtlas(f.ctx, []).code, 0);
    const html = readFileSync(join(f.root, "keel/evidence/atlas.html"), "utf8");
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /const data = JSON.parse/);
    assert.match(html, /不代表每个|不代表.*验收|用户验收/);
    assert.equal(f.git(["write-tree"]), index);
    assert.equal(existsSync(join(f.root, "keel/drift")), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-030/AC-3 atlas treats source text as data and refuses unsafe output/source paths and user files", () => {
  const f = fixture();
  try {
    const injection = '</script><script>throw new Error("injected")</script>';
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1) + "\n" + injection);
    f.write("source.html", "user-owned");
    assert.equal(runAtlas(f.ctx, ["--out", "source.html"]).code, 1);
    assert.equal(readFileSync(join(f.root, "source.html"), "utf8"), "user-owned");
    assert.equal(runAtlas(f.ctx, ["--out", "../outside.html"]).code, 1);
    assert.equal(runAtlas(f.ctx, ["--out", "src/query.ts"]).code, 2);
    assert.equal(runAtlas(f.ctx, []).code, 0);
    const html = readFileSync(join(f.root, "keel/evidence/atlas.html"), "utf8");
    assert.ok(!html.includes(injection));
    assert.ok(html.includes("\\u003c/script\\u003e"));
    assert.ok(!html.includes("innerHTML"));
    assert.ok(!html.includes("<script src="));
    assert.ok(!html.includes("<link "));
    // Directory junctions do not need symlink privileges on Windows.
    symlinkSync(join(f.root, "src"), join(f.root, "linked"), process.platform === "win32" ? "junction" : "dir");
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1, ["linked/query.ts"]));
    assert.match(f.report().model.features[0]?.implementation[0]?.problem ?? "", /symbolic link/);
    assert.equal(runAtlas(f.ctx, ["--out", "linked/output.html"]).code, 1);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-031/AC-1 source/explanation headings are opt-in and fence-aware; flat legacy content stays available", () => {
  const f = fixture();
  try {
    f.write("keel/features/f01-query/plan/v1.md", f.plan(1) + "\n~~~md\n## 原始意图\nFAKE USER\n~~~\n");
    const model = f.report().model;
    assert.equal(model.layers.raw, "来源 用户：请保留原值。");
    assert.match(model.layers.explanation, /agent：只查询/);
    assert.equal(model.features[0]?.layers.raw, "来源 CHG-001");
    assert.match(model.features[0]?.technical ?? "", /FAKE USER/);
    f.write("keel/features/f01-query/plan/v1.md", "---\nfeature: F1\nreq: [REQ-001]\n---\n\n# Flat\n\nLegacy body without a user quote\n");
    assert.match(f.report().model.features[0]?.layers.legacy ?? "", /Legacy body/);
    assert.equal(f.report().model.features[0]?.layers.raw, "");
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-030/AC-3 I-21 atlas validates sources before calling legacy trace and evidence readers", () => {
  const f = fixture();
  try {
    const type = process.platform === "win32" ? "junction" : "dir";
    // Each target is disposable fixture data. The promise forbids in-repo links too.
    f.write("linked-source/v1.md", "## REQ-777 FOREIGN\n- **acceptance**:\n  - foreign data\n- **verification**: [auto]\n");
    rmSync(join(f.root, "keel/requirements"), { recursive: true, force: true });
    f.write("linked-source/INDEX.md", "- current: v1.md\n");
    symlinkSync(join(f.root, "linked-source"), join(f.root, "keel/requirements"), type);
    let result = runAtlas(f.ctx, ["--json"]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /symbolic link/);
    assert.equal(result.stdout, "");
    rmSync(join(f.root, "keel/requirements"), { recursive: true, force: true });
    f.write("keel/requirements/INDEX.md", "- current: v1.md\n");
    f.write("keel/requirements/v1.md", "## REQ-001 Safe\n");
    rmSync(join(f.root, "tests"), { recursive: true, force: true });
    symlinkSync(join(f.root, "linked-source"), join(f.root, "tests"), type);
    result = runAtlas(f.ctx, []);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /symbolic link/);
    assert.equal(existsSync(join(f.root, "keel/evidence/atlas.html")), false);
    rmSync(join(f.root, "tests"), { recursive: true, force: true });
    symlinkSync(join(f.root, "linked-source"), join(f.root, "keel/approvals"), type);
    assert.match(f.report().problems.join(" "), /symbolic link/);
    const refused = runDrift(f.ctx, ["review", "F1", "--expect", "0".repeat(64), "--reason", "source review", "--evidence", "evidence.md"]);
    assert.equal(refused.code, 1);
    assert.match(refused.stderr, /source problems/);
    assert.equal(runAtlas(f.ctx, ["--json"]).code, 1);
    rmSync(join(f.root, "keel/approvals"), { recursive: true, force: true });
    symlinkSync(join(f.root, "linked-source"), join(f.root, "keel/evidence"), type);
    assert.match(runAtlas(f.ctx, []).stderr, /symbolic link/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

/** Minimal DOM contract for executing the shipped client, not a layout/browser substitute. */
class ViewNode {
  tag: string; children: ViewNode[] = []; attrs: Record<string, string> = {}; events: Record<string, () => void> = {};
  text = ""; className = ""; value = ""; scrollTop = 0; type = ""; href = ""; target = ""; rel = "";
  focused = false;
  constructor(tag: string) { this.tag = tag; }
  set textContent(value: string) { this.text = value; this.children = []; }
  get textContent(): string { return this.text + this.children.map(c => c.textContent).join(""); }
  get classList() { return { contains: (name: string) => this.className.split(" ").includes(name) }; }
  append(...nodes: ViewNode[]) { this.children.push(...nodes); }
  prepend(...nodes: ViewNode[]) { this.children.unshift(...nodes); }
  replaceChildren(...nodes: ViewNode[]) { this.text = ""; this.children = nodes; }
  setAttribute(key: string, value: string) { this.attrs[key] = value; }
  getAttribute(key: string) { return this.attrs[key] ?? null; }
  focus() { this.focused = true; }
  addEventListener(key: string, fn: () => void) { this.events[key] = fn; }
  getBoundingClientRect() { return { top: 0, left: 0, right: 100, bottom: 100, height: 100, width: 100 }; }
  querySelectorAll(selector: string): ViewNode[] {
    return this.children.flatMap(child => [
      ...((selector === "button" && child.tag === "button") || (selector === "button[data-focus-key]" && child.tag === "button" && child.attrs["data-focus-key"]) || (selector === '[aria-pressed="true"]' && child.attrs["aria-pressed"] === "true") ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }
  querySelector(selector: string) { return this.querySelectorAll(selector)[0] ?? null; }
}

test("REQ-030/AC-1 REQ-030/AC-2 shipped atlas client searches unmapped requirements and updates relations, filters, empty detail and links", () => {
  const f = fixture();
  try {
    f.write("keel/features/f02-old/plan/v1.md", "---\nfeature: F2\nreq: [REQ-001]\n---\n# Legacy\n");
    f.write("keel/requirements/v1.md", readFileSync(join(f.root, "keel/requirements/v1.md"), "utf8") + "\n## REQ-002 未规划的新需求\n\n- **acceptance**:\n  - Given no plan When searched Then remain visible\n- **verification**: [auto]\n");
    const data = JSON.parse(runAtlas(f.ctx, ["--json"]).stdout);
    const nodes: Record<string, ViewNode> = {};
    for (const id of ["atlas-data", "search", "state", "requirements", "unmapped-requirements", "features", "files", "detail", "results", "graph", "edges", "snapshot", "evidence", "problems", "reset"]) nodes[id] = new ViewNode("div");
    nodes["atlas-data"]!.textContent = JSON.stringify({ ...data, rootPrefix: "../.." });
    nodes.state!.value = "all";
    const windowEvents: Record<string, () => void> = {};
    let hash = "#F1";
    const location = {
      get hash() { return hash; },
      set hash(value: string) { hash = value ? "#" + value.replace(/^#/, "") : ""; },
    };
    runInNewContext(readFileSync(join(repo, "tools/gate/atlas-client.js"), "utf8"), {
      document: { getElementById: (id: string) => nodes[id], querySelectorAll: (selector: string) => Object.values(nodes).flatMap(n => n.querySelectorAll(selector)), createElement: (tag: string) => new ViewNode(tag), createElementNS: (_ns: string, tag: string) => new ViewNode(tag) },
      location, window: { addEventListener: (name: string, fn: () => void) => { windowEvents[name] = fn; } },
      requestAnimationFrame: (fn: () => void) => fn(),
    });
    assert.equal(nodes.features!.children.length, 2);
    assert.equal(nodes.requirements!.children.length, 1);
    assert.equal(nodes.files!.children.length, 2);
    assert.match(nodes["unmapped-requirements"]!.textContent, /REQ-002/);
    nodes.features!.children[1]!.events.click!();
    assert.equal(location.hash, "#F2");
    assert.equal(nodes.features!.children[1]!.focused, true);
    windowEvents.hashchange!();
    assert.equal(nodes.features!.children[1]!.focused, true, "hashchange must not replace the just-focused feature button");
    nodes.features!.children[0]!.events.click!();
    windowEvents.hashchange!();
    location.hash = "#F2";
    windowEvents.hashchange!();
    assert.equal(nodes.features!.children[1]!.attrs["aria-pressed"], "true", "external fragment navigation must still select the feature");
    nodes.features!.children[0]!.events.click!();
    windowEvents.hashchange!();
    nodes.files!.children[0]!.events.click!();
    assert.match(nodes.detail!.textContent, /实现归属：F1/);
    assert.ok(nodes.detail!.children.some(n => n.children.some(c => c.href === "../../src/query.ts")));
    nodes.search!.value = "nonexistent"; nodes.search!.events.input!();
    assert.equal(nodes.features!.children.length, 0);
    assert.match(nodes.detail!.textContent, /没有匹配/);
    assert.ok(!nodes.detail!.textContent.includes("存储值"));
    nodes.reset!.events.click!();
    nodes.state!.value = "unmapped"; nodes.state!.events.change!();
    assert.equal(nodes.features!.children.length, 1);
    assert.match(nodes.features!.textContent, /F2/);
    assert.match(nodes.files!.textContent, /未声明实现映射/);
    nodes.reset!.events.click!();
    nodes.search!.value = "query.ts"; nodes.search!.events.input!();
    assert.equal(nodes.features!.children.length, 1);
    assert.match(nodes.detail!.textContent, /技术实现/);
    nodes.requirements!.children[0]!.events.click!();
    assert.equal(nodes.requirements!.children[0]!.attrs["aria-pressed"], "true");
    assert.equal(nodes.requirements!.children[0]!.focused, true);
    nodes.search!.value = "REQ-002"; nodes.search!.events.input!();
    assert.equal(nodes.features!.children.length, 0);
    assert.match(nodes.detail!.textContent, /REQ-002 未规划/);
    assert.match(nodes.detail!.textContent, /未映射/);
    assert.match(nodes.files!.textContent, /尚无功能计划/);
    nodes.search!.value = "no-such-req"; nodes.search!.events.input!();
    assert.equal(nodes["unmapped-requirements"]!.children.length, 0);
    assert.match(nodes.detail!.textContent, /没有匹配/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test("REQ-031/AC-2 I-22 new projects receive intent layers, exact relation templates and the offline atlas assets", () => {
  const root = mkdtempSync(join(tmpdir(), "keel-chg020-init-"));
  try {
    const result = runCli(["init"], { cwd: root, source: repo });
    assert.equal(result.code, 0, result.stderr);
    for (const name of ["spec-map.ts", "drift.ts", "atlas.ts", "atlas-client.js", "atlas.css"]) assert.ok(existsSync(join(root, "tools/gate", name)), name);
    const template = readFileSync(join(root, "keel/templates/feature-plan.md"), "utf8");
    assert.match(template, /implementation: \[\]/);
    assert.match(template, /related: \[\]/);
    assert.match(template, /## 原始意图/);
    assert.match(template, /## 工作解释/);
    assert.match(template, /## 技术实现/);
    const agents = readFileSync(join(root, "AGENTS.md"), "utf8");
    assert.match(agents, /Raw user intent/);
    assert.match(agents, /drift review/);
    assert.match(agents, /frozen/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
