import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../tools/cli/main.js";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");

type SnapshotEntry = {
  kind: "dir" | "file" | "link";
  mode: number;
  mtimeMs: number;
  size: number;
  sha256?: string;
};

function put(root: string, rel: string, text: string): void {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

function snapshot(root: string): Record<string, SnapshotEntry> {
  const out: Record<string, SnapshotEntry> = {};
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      const rel = relative(root, path).replaceAll("\\", "/");
      const st = lstatSync(path);
      if (st.isSymbolicLink()) {
        out[rel] = { kind: "link", mode: st.mode, mtimeMs: st.mtimeMs, size: st.size };
        continue;
      }
      if (st.isDirectory()) {
        out[rel] = { kind: "dir", mode: st.mode, mtimeMs: st.mtimeMs, size: st.size };
        walk(path);
        continue;
      }
      const bytes = readFileSync(path);
      out[rel] = {
        kind: "file",
        mode: st.mode,
        mtimeMs: st.mtimeMs,
        size: st.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    }
  };
  walk(root);
  return out;
}

function initGit(root: string): void {
  const result = spawnSync("git", ["init"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function sourceFixture(version = "0.8.0"): string {
  const source = mkdtempSync(join(tmpdir(), "keel-update-source-"));
  put(source, "package.json", JSON.stringify({ name: "keel", version }, null, 2) + "\n");
  put(source, "tools/gate/keep.txt", "new gate\n");
  put(source, "tools/gate/new.txt", "brand new\n");
  put(source, "keel/templates/template.txt", "new template\n");
  put(source, ".githooks/pre-commit", "#!/bin/sh\nexit 0\n");
  put(source, ".agents/skills/k-demo/SKILL.md", "# current skill\n");
  put(source, "CLAUDE.md", "@AGENTS.md\n");
  put(source, ".gitattributes", "* text=auto eol=lf\n");
  return source;
}

function projectFixture(version = "0.7.0"): string {
  const root = mkdtempSync(join(tmpdir(), "keel-update-project-"));
  initGit(root);
  put(
    root,
    "keel/config.json",
    JSON.stringify({ records_dir: "keel", keel_version: version, project_name: "consumer" }, null, 2) + "\n",
  );
  put(
    root,
    "keel/research/RES-001-old.md",
    [
      "---",
      "id: RES-001",
      "depth: standard",
      "oss_none: fixture uses no open-source dependency",
      "---",
      "",
      "## 调研问题",
      "旧报告。",
      "",
      "## 检索范围",
      "升级前本地资料。",
      "",
      "## 候选",
      "A。",
      "",
      "## 证据",
      "离线证据。",
      "",
      "## 结论",
      "保留。",
      "",
    ].join("\n"),
  );
  put(root, "tools/gate/keep.txt", "old gate\n");
  put(root, "tools/gate/stale.txt", "delete me\n");
  put(root, "keel/templates/template.txt", "old template\n");
  put(root, ".githooks/pre-commit", "#!/bin/sh\nexit 9\n");
  put(root, ".agents/skills/k-demo/SKILL.md", "# stale skill\n");
  put(root, ".agents/skills/k-retired/SKILL.md", "# delete managed skill\n");
  put(root, ".agents/skills/personal/SKILL.md", "# preserve personal skill\n");
  put(root, ".claude/skills/k-retired/SKILL.md", "# delete stale mirror\n");
  put(root, ".claude/skills/personal/SKILL.md", "# preserve personal mirror\n");
  put(root, "CLAUDE.md", "old\n");
  put(root, ".gitattributes", "old attrs\n");
  put(root, "user/data.txt", "never touch me\n");
  return root;
}

function cleanup(...roots: string[]): void {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
}

test("REQ-025/AC-7 update previews add overwrite delete and legacy entries before y/N", () => {
  const source = sourceFixture();
  const root = projectFixture();
  const events: string[] = [];
  try {
    const result = runCli(["update"], {
      cwd: root,
      source,
      emitUpdatePreview(text) {
        events.push("preview:" + text);
      },
      confirmUpdate() {
        events.push("confirm");
        return "N";
      },
    });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(events.length, 2);
    assert.match(events[0] ?? "", /preview:[\s\S]*ADD tools\/gate\/new\.txt/);
    assert.match(events[0] ?? "", /OVERWRITE tools\/gate\/keep\.txt/);
    assert.match(events[0] ?? "", /DELETE tools\/gate\/stale\.txt/);
    assert.match(events[0] ?? "", /ADD keel\/migrations\/res-citation-legacy\.json/);
    assert.match(events[0] ?? "", /LEGACY ADD RES-001 keel\/research\/RES-001-old\.md [a-f0-9]{64}/);
    assert.match(events[0] ?? "", /Proceed\? \[y\/N\]/);
    assert.equal(events[1], "confirm", "confirmation must happen after the complete preview");
    assert.match(result.stdout, /cancelled; no files changed/);
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-7 N non-y EOF and absent stdin keep the entire target tree byte-for-byte and metadata-identical", () => {
  const answers: Array<string | null | undefined> = ["N", "yes", "", null, undefined];
  for (const answer of answers) {
    const source = sourceFixture();
    const root = projectFixture();
    try {
      const before = snapshot(root);
      const opts =
        answer === undefined
          ? { cwd: root, source }
          : { cwd: root, source, confirmUpdate: () => answer as string | null };
      const result = runCli(["update"], opts);
      assert.equal(result.code, 0, `${String(answer)}: ${result.stderr}`);
      assert.match(result.stdout, /cancelled; no files changed/);
      assert.deepEqual(snapshot(root), before, `answer ${String(answer)} changed the target tree or metadata`);
      assert.equal(existsSync(join(root, "keel", "migrations")), false);
    } finally {
      cleanup(root, source);
    }
  }
});

test("REQ-025/AC-7 explicit y executes the previewed transaction and preserves unrelated files and skills", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    const beforeUser = statSync(join(root, "user", "data.txt"));
    const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => "y" });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /keel update preview 0\.7\.0 -> 0\.8\.0/);
    assert.match(result.stdout, /keel update applied 0\.8\.0/);
    assert.equal(readFileSync(join(root, "tools", "gate", "keep.txt"), "utf8"), "new gate\n");
    assert.equal(readFileSync(join(root, "tools", "gate", "new.txt"), "utf8"), "brand new\n");
    assert.equal(existsSync(join(root, "tools", "gate", "stale.txt")), false);
    assert.equal(existsSync(join(root, ".agents", "skills", "k-retired")), false);
    assert.equal(existsSync(join(root, ".claude", "skills", "k-retired")), false);
    assert.equal(readFileSync(join(root, ".agents", "skills", "personal", "SKILL.md"), "utf8"), "# preserve personal skill\n");
    assert.equal(readFileSync(join(root, ".claude", "skills", "personal", "SKILL.md"), "utf8"), "# preserve personal mirror\n");
    assert.equal(readFileSync(join(root, "user", "data.txt"), "utf8"), "never touch me\n");
    assert.equal(statSync(join(root, "user", "data.txt")).mtimeMs, beforeUser.mtimeMs);
    const cfg = JSON.parse(readFileSync(join(root, "keel", "config.json"), "utf8")) as { keel_version?: string };
    assert.equal(cfg.keel_version, "0.8.0");
    const manifest = JSON.parse(
      readFileSync(join(root, "keel", "migrations", "res-citation-legacy.json"), "utf8"),
    ) as {
      source_keel_version?: string;
      target_keel_version?: string;
      entries?: Array<{ id?: string; path?: string; sha256?: string }>;
    };
    assert.equal(manifest.source_keel_version, "0.7.0");
    assert.equal(manifest.target_keel_version, "0.8.0");
    assert.deepEqual(manifest.entries?.map(({ id, path }) => ({ id, path })), [
      { id: "RES-001", path: "keel/research/RES-001-old.md" },
    ]);
    assert.match(manifest.entries?.[0]?.sha256 ?? "", /^[a-f0-9]{64}$/);
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-7 only one-letter y is affirmative; uppercase Y is accepted", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => "Y" });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(existsSync(join(root, "tools", "gate", "new.txt")), true);
  } finally {
    cleanup(root, source);
  }
});

test("DEC-181 missing or invalid source keel_version refuses migration with zero writes", () => {
  for (const version of ["", "banana", "0.7", "v0.7.0"]) {
    const source = sourceFixture();
    const root = projectFixture(version);
    try {
      const before = snapshot(root);
      const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => "y" });
      assert.equal(result.code, 1, `${version}: ${result.stdout}`);
      assert.match(result.stderr, /valid semantic version|合法语义版本/);
      assert.deepEqual(snapshot(root), before, `invalid version ${version} caused a write`);
    } finally {
      cleanup(root, source);
    }
  }
});

test("DEC-173 incomplete installer source refuses before confirmation instead of deleting managed roots", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    rmSync(join(source, "tools", "gate"), { recursive: true, force: true });
    const before = snapshot(root);
    const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => "y" });
    assert.equal(result.code, 1, result.stdout);
    assert.match(result.stderr, /installer is incomplete.*tools\/gate/);
    assert.deepEqual(snapshot(root), before);
  } finally {
    cleanup(root, source);
  }
});

test("DEC-181 SemVer prerelease 0.8.0-rc.1 is objectively below the 0.8.0 migration boundary", () => {
  const source = sourceFixture("0.8.0");
  const root = projectFixture("0.8.0-rc.1");
  try {
    const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => "y" });
    assert.equal(result.code, 0, result.stderr);
    const manifest = JSON.parse(
      readFileSync(join(root, "keel", "migrations", "res-citation-legacy.json"), "utf8"),
    ) as { source_keel_version?: string; target_keel_version?: string };
    assert.equal(manifest.source_keel_version, "0.8.0-rc.1");
    assert.equal(manifest.target_keel_version, "0.8.0");
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-7 real noninteractive bin prints preview and y/N then cancels on EOF without writes", () => {
  const root = projectFixture("0.7.0");
  try {
    const before = snapshot(root);
    const result = spawnSync(process.execPath, [join(repo, "bin", "keel.js"), "update"], {
      cwd: root,
      encoding: "utf8",
      input: "",
      timeout: 120_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /keel update preview/);
    assert.match(result.stdout, /Proceed\? \[y\/N\]/);
    assert.match(result.stdout, /cancelled; no files changed/);
    assert.deepEqual(snapshot(root), before);
  } finally {
    cleanup(root);
  }
});
