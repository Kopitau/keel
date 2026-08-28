import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { makeCtx } from "../tools/gate/ctx.ts";
import { runCheck } from "../tools/gate/check.ts";
import { sha256Normalized } from "../tools/gate/hash.ts";
import { inspectResCitations } from "../tools/gate/rescheck.ts";

type ManifestEntry = { id: string; path: string; sha256: string };

function put(root: string, rel: string, text: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

function report(id: string, options: { url?: boolean; structuralGap?: boolean; suffix?: string } = {}): string {
  return [
    "---",
    `id: ${id}`,
    "depth: standard",
    "oss_none: fixture chooses no open-source dependency",
    "---",
    "",
    "## 调研问题",
    "迁移判据是什么？",
    "",
    "## 检索范围",
    options.url ? "官方资料。" : "升级前的离线材料。",
    "",
    "## 候选",
    "A 与 B。",
    "",
    options.structuralGap ? "## 随手笔记" : "## 证据",
    options.url ? "来源：https://example.test/official （2026-08-28）" : "离线资料，2026-08-20。",
    options.suffix ?? "",
    "",
    "## 结论",
    "采用 A。",
    "",
  ].join("\n");
}

function fixture(version = "0.8.0"): string {
  const root = mkdtempSync(join(tmpdir(), "keel-legacy-res-"));
  put(root, "keel/config.json", JSON.stringify({ records_dir: "keel", keel_version: version }, null, 2) + "\n");
  return root;
}

function addReport(root: string, id: string, text: string): ManifestEntry {
  const path = `keel/research/${id}-fixture.md`;
  put(root, path, text);
  return { id, path, sha256: sha256Normalized(text) };
}

function writeManifest(
  root: string,
  entries: ManifestEntry[],
  overrides: Record<string, unknown> = {},
): void {
  put(
    root,
    "keel/migrations/res-citation-legacy.json",
    JSON.stringify(
      {
        schema_version: 1,
        source_keel_version: "0.7.0",
        target_keel_version: "0.8.0",
        generated_at: "2026-08-28",
        entries,
        ...overrides,
      },
      null,
      2,
    ) + "\n",
  );
}

function researchLine(root: string): string {
  const result = runCheck(makeCtx(root), ["--quick"]);
  return result.stdout.split(/\r?\n/).find((line) => line.includes("G-research")) ?? result.stdout;
}

test("REQ-002/AC-6 cited standard or deep RES makes the citation subcheck PASS", () => {
  const root = fixture();
  try {
    addReport(root, "RES-101", report("RES-101", { url: true }));
    const inspected = inspectResCitations(makeCtx(root));
    assert.deepEqual(inspected.failures, []);
    assert.deepEqual(inspected.legacy, []);
    assert.equal(inspected.cited, 1);
    assert.match(researchLine(root), /^PASS G-research/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-002/AC-6 exact external id path and normalized hash makes only G-research WARN", () => {
  const root = fixture();
  try {
    const text = report("RES-101");
    const entry = addReport(root, "RES-101", text.replaceAll("\n", "\r\n"));
    entry.sha256 = sha256Normalized(text);
    writeManifest(root, [entry]);
    const inspected = inspectResCitations(makeCtx(root));
    assert.deepEqual(inspected.failures, []);
    assert.deepEqual(inspected.legacy.map((item) => item.id), ["RES-101"]);
    assert.match(researchLine(root), /^WARN G-research/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DEC-181 gate uses SemVer precedence so a 0.8.0-rc.1 source is legacy before stable 0.8.0", () => {
  const root = fixture();
  try {
    const entry = addReport(root, "RES-101", report("RES-101"));
    writeManifest(root, [entry], { source_keel_version: "0.8.0-rc.1" });
    const inspected = inspectResCitations(makeCtx(root));
    assert.deepEqual(inspected.failures, []);
    assert.deepEqual(inspected.legacy.map((item) => item.id), ["RES-101"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("REQ-002/AC-6 legacy WARN never exempts missing report structure or OSS stance", () => {
  const structural = fixture();
  const oss = fixture();
  try {
    const broken = report("RES-101", { structuralGap: true });
    const brokenEntry = addReport(structural, "RES-101", broken);
    writeManifest(structural, [brokenEntry]);
    assert.match(researchLine(structural), /^FAIL G-research/);

    const silent = report("RES-102").replace("oss_none: fixture chooses no open-source dependency\n", "");
    const silentEntry = addReport(oss, "RES-102", silent);
    writeManifest(oss, [silentEntry]);
    const result = runCheck(makeCtx(oss), ["--quick"]);
    assert.match(result.stdout, /^WARN G-research/m);
    assert.match(result.stdout, /^FAIL X-oss/m);
    assert.equal(result.code, 1);
  } finally {
    rmSync(structural, { recursive: true, force: true });
    rmSync(oss, { recursive: true, force: true });
  }
});

test("REQ-002/AC-6 missing malformed duplicate or mismatched legacy manifest data FAILs", () => {
  const cases: Array<{
    name: string;
    prepare(root: string, entry: ManifestEntry): void;
    pattern: RegExp;
  }> = [
    { name: "missing", prepare() {}, pattern: /manifest.*missing|迁移清单.*缺失/i },
    {
      name: "malformed JSON",
      prepare(root) {
        put(root, "keel/migrations/res-citation-legacy.json", "{\n");
      },
      pattern: /valid JSON|合法 JSON/i,
    },
    {
      name: "duplicate id and path",
      prepare(root, entry) {
        writeManifest(root, [entry, entry]);
      },
      pattern: /duplicate|重复/i,
    },
    {
      name: "id mismatch",
      prepare(root, entry) {
        writeManifest(root, [{ ...entry, id: "RES-999" }]);
      },
      pattern: /id.*mismatch|ID.*不符/i,
    },
    {
      name: "path mismatch",
      prepare(root, entry) {
        writeManifest(root, [{ ...entry, path: "keel/research/RES-101-wrong.md" }]);
      },
      pattern: /path|路径/i,
    },
    {
      name: "path outside research",
      prepare(root, entry) {
        put(root, "docs/RES-101-fixture.md", readFileSync(join(root, entry.path), "utf8"));
        writeManifest(root, [{ ...entry, path: "docs/RES-101-fixture.md" }]);
      },
      pattern: /outside.*research|research.*目录/i,
    },
    {
      name: "hash mismatch",
      prepare(root, entry) {
        writeManifest(root, [{ ...entry, sha256: "0".repeat(64) }]);
      },
      pattern: /hash|sha256|哈希/i,
    },
    {
      name: "invalid source version",
      prepare(root, entry) {
        writeManifest(root, [entry], { source_keel_version: "0.7" });
      },
      pattern: /source.*version|源.*版本/i,
    },
    {
      name: "invalid target version",
      prepare(root, entry) {
        writeManifest(root, [entry], { target_keel_version: "banana" });
      },
      pattern: /target.*version|目标.*版本/i,
    },
    {
      name: "wrong migration boundary",
      prepare(root, entry) {
        writeManifest(root, [entry], { source_keel_version: "0.8.0", target_keel_version: "0.8.1" });
      },
      pattern: /boundary|分界|source.*<.*0\.8\.0/i,
    },
  ];

  for (const item of cases) {
    const root = fixture();
    try {
      const entry = addReport(root, "RES-101", report("RES-101"));
      item.prepare(root, entry);
      const inspected = inspectResCitations(makeCtx(root));
      assert.ok(inspected.failures.length > 0, item.name);
      assert.match(inspected.failures.map((gap) => gap.gap).join("; "), item.pattern, item.name);
      assert.match(researchLine(root), /^FAIL G-research/, item.name);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test("REQ-002/AC-6 new or substantively changed zero-URL RES after migration FAILs", () => {
  const root = fixture();
  try {
    const old = addReport(root, "RES-101", report("RES-101"));
    writeManifest(root, [old]);
    put(root, old.path, report("RES-101", { suffix: "迁移后实质改写。" }));
    addReport(root, "RES-102", report("RES-102"));
    const inspected = inspectResCitations(makeCtx(root));
    assert.ok(inspected.failures.some((gap) => gap.id === "RES-101" && /hash|sha256|哈希/i.test(gap.gap)));
    assert.ok(inspected.failures.some((gap) => gap.id === "RES-102" && /missing|缺项/i.test(gap.gap)));
    assert.match(researchLine(root), /^FAIL G-research/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DEC-181 adding a URL makes the RES PASS even before deterministic cleanup removes its old manifest entry", () => {
  const root = fixture();
  try {
    const oldText = report("RES-101");
    const old = addReport(root, "RES-101", oldText);
    writeManifest(root, [old]);
    put(root, old.path, report("RES-101", { url: true }));
    const inspected = inspectResCitations(makeCtx(root));
    assert.deepEqual(inspected.failures, []);
    assert.deepEqual(inspected.legacy, []);
    assert.equal(inspected.cited, 1);
    assert.match(researchLine(root), /^PASS G-research/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DEC-181 manifest hashes normalized UTF-8 text rather than raw CRLF or BOM bytes", () => {
  const root = fixture();
  try {
    const lf = report("RES-101");
    const disk = "\uFEFF" + lf.replaceAll("\n", "\r\n");
    const entry = addReport(root, "RES-101", disk);
    entry.sha256 = sha256Normalized(lf);
    writeManifest(root, [entry]);
    const fromDisk = readFileSync(join(root, entry.path));
    assert.equal(sha256Normalized(fromDisk), entry.sha256);
    assert.deepEqual(inspectResCitations(makeCtx(root)).failures, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
