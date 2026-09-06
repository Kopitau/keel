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

test("REQ-025/AC-7 update previews add overwrite delete before y/N", () => {
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
    // CHG-011: no legacy RES manifest is generated or previewed any more.
    assert.doesNotMatch(events[0] ?? "", /migrations|LEGACY/);
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

test("REQ-025/AC-7 explicit y applies only the listed operations and leaves records and unrelated files untouched", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    const beforeUser = statSync(join(root, "user", "data.txt"));
    const resBefore = readFileSync(join(root, "keel", "research", "RES-001-old.md"));
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
    assert.deepEqual(readFileSync(join(root, "keel", "research", "RES-001-old.md")), resBefore);
    assert.equal(statSync(join(root, "user", "data.txt")).mtimeMs, beforeUser.mtimeMs);
    const cfg = JSON.parse(readFileSync(join(root, "keel", "config.json"), "utf8")) as { keel_version?: string };
    assert.equal(cfg.keel_version, "0.8.0");
    assert.equal(existsSync(join(root, "keel", "migrations")), false, "CHG-011: no legacy manifest");
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

test("REQ-025/AC-6 missing or invalid project keel_version refuses update with zero writes", () => {
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

test("ISS-069 keel update --yes applies the previewed operations when no terminal can confirm", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    // confirmUpdate returning null is exactly what an agent session (no TTY) gets.
    const result = runCli(["update", "--yes"], { cwd: root, source, confirmUpdate: () => null });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /keel update preview 0\.7\.0 -> 0\.8\.0/);
    assert.match(result.stdout, /keel update applied 0\.8\.0 \(--yes\)/);
    assert.doesNotMatch(result.stdout, /Proceed\? \[y\/N\]/);
    assert.equal(readFileSync(join(root, "tools", "gate", "new.txt"), "utf8"), "brand new\n");
    assert.equal(existsSync(join(root, "tools", "gate", "stale.txt")), false);
    const cfg = JSON.parse(readFileSync(join(root, "keel", "config.json"), "utf8")) as { keel_version?: string };
    assert.equal(cfg.keel_version, "0.8.0");
  } finally {
    cleanup(root, source);
  }
});

test("ISS-069 without --yes a non-terminal session is told about the flag and nothing is written", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    const result = runCli(["update"], { cwd: root, source, confirmUpdate: () => null });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /cancelled; no files changed \(no terminal to confirm in\? pass --yes\)/);
    assert.equal(existsSync(join(root, "tools", "gate", "new.txt")), false);
  } finally {
    cleanup(root, source);
  }
});

const currentAgents = "<!-- keel:begin -->\n# keel\nCurrent framework rules.\n<!-- keel:end -->";

test("REQ-025/AC-13 missing or ambiguous AGENTS boundaries preserve project bytes and report an incomplete update", () => {
  const source = sourceFixture();
  put(source, "AGENTS.md", currentAgents + "\n");
  const cases = [
    "# Project rules\r\nKeep this business constraint.\r\n",
    "# keel\nOld framework rules.\n\n## Project rules\nKeep this business constraint.\n",
    "<!-- keel:begin -->\nUnclosed block with project text.\n",
    currentAgents + "\nProject rule between blocks.\n" + currentAgents,
    "<!-- keel:end -->\nProject rule.\n<!-- keel:begin -->",
    "Examples: `<!-- keel:begin -->` and `<!-- keel:end -->`.\nProject rules.\n",
    "# Project documentation\n```md\n" + currentAgents + "\n```\nKeep this example.\n",
    "# Project documentation\n~~~~md\n" + currentAgents + "\n~~~~\nKeep this example.\n",
  ];
  try {
    for (const original of cases) {
      const root = projectFixture();
      try {
        put(root, "AGENTS.md", original);
        const result = runCli(["update", "--yes"], { cwd: root, source });
        assert.equal(result.code, 2, result.stdout + result.stderr);
        assert.match(result.stdout, /keel update partially applied 0\.8\.0/);
        assert.match(result.stdout, /PENDING AGENTS\.md/);
        assert.match(result.stdout, /agent action:/);
        assert.ok(result.stdout.includes(join(source, "AGENTS.md")));
        assert.doesNotMatch(result.stdout, /^keel update applied /m);
        assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), original);
        assert.equal(readFileSync(join(root, "user/data.txt"), "utf8"), "never touch me\n");
        assert.equal(readFileSync(join(root, "tools/gate/keep.txt"), "utf8"), "new gate\n");
        const config = JSON.parse(readFileSync(join(root, "keel/config.json"), "utf8"));
        assert.equal(config.keel_version, "0.8.0", "version records the installed tools, not complete instruction migration");
        const before = snapshot(root);
        const repeat = runCli(["update", "--yes"], { cwd: root, source });
        assert.equal(repeat.code, 2, "unchanged tools do not resolve a pending instruction migration");
        assert.match(repeat.stdout, /NO FILE CHANGES/);
        assert.deepEqual(snapshot(root), before);
      } finally {
        cleanup(root);
      }
    }
  } finally {
    cleanup(source);
  }
});

test("REQ-025/AC-11 a valid framework block updates literally while project text stays byte-for-byte and a repeat is a no-op", () => {
  const source = sourceFixture();
  const root = projectFixture();
  const block = currentAgents.replace("Current framework rules.", () => "Literal shell text: $& $` $'.\n\n```md\n<!-- keel:begin -->\nAn example, not another owned block.\n<!-- keel:end -->\n```");
  const prefix = "# 项目规则\r\n业务规则必须保留。\r\n\r\n";
  const suffix = "\r\n\r\n## API constraints\r\nKeep the existing public schema.  \r\n";
  try {
    put(source, "AGENTS.md", "Installer-only preface.\n" + block + "\nInstaller-only suffix.\n");
    put(root, "AGENTS.md", prefix + currentAgents.replaceAll("\n", "\r\n") + suffix);
    const result = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(result.code, 0, result.stdout + result.stderr);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), prefix + block + suffix);
    assert.equal(readFileSync(join(root, "user/data.txt"), "utf8"), "never touch me\n");
    const before = snapshot(root);
    const repeat = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(repeat.code, 0, repeat.stderr);
    assert.match(repeat.stdout, /keel update already up to date 0\.8\.0/);
    assert.doesNotMatch(repeat.stdout, /Proceed\? \[y\/N\]/);
    assert.deepEqual(snapshot(root), before);
    const editedPrefix = prefix + "New project policy outside the framework.\r\n";
    put(root, "AGENTS.md", editedPrefix + block + suffix);
    const nextBlock = block.replace("Literal shell text:", "Updated literal shell text:");
    put(source, "AGENTS.md", nextBlock + "\n");
    const localEdit = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(localEdit.code, 0, localEdit.stdout + localEdit.stderr);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), editedPrefix + nextBlock + suffix);
    assert.match(localEdit.stdout, /only the marked framework section is replaced; project text outside it is preserved/);
    assert.doesNotMatch(localEdit.stdout, /your edit is lost on apply/);
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-13 an agent-prepared framework boundary completes migration without modifying project rules", () => {
  const source = sourceFixture();
  const root = projectFixture();
  const projectRules = "\n## Project rules\nDo not change the product's data model.\n";
  try {
    put(source, "AGENTS.md", currentAgents + "\n");
    put(root, "AGENTS.md", "# keel\nOld framework rules.\n" + projectRules);
    const partial = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(partial.code, 2);
    // The agent, not a heading heuristic in the CLI, identifies the old framework text.
    put(root, "AGENTS.md", "<!-- keel:begin -->\n# keel\nOld framework rules.\n<!-- keel:end -->\n" + projectRules);
    const completed = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(completed.code, 0, completed.stdout + completed.stderr);
    assert.doesNotMatch(completed.stdout, /PENDING|partially applied/);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), currentAgents + "\n" + projectRules);
    assert.equal(readFileSync(join(root, "user/data.txt"), "utf8"), "never touch me\n");
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-11 an invalid installer framework block refuses the whole update without writes", () => {
  const source = sourceFixture();
  const root = projectFixture();
  try {
    put(source, "AGENTS.md", "<!-- keel:begin -->\nMissing end marker.\n");
    const before = snapshot(root);
    const result = runCli(["update", "--yes"], { cwd: root, source });
    assert.equal(result.code, 1, result.stdout);
    assert.match(result.stderr, /installer AGENTS\.md/);
    assert.deepEqual(snapshot(root), before);
  } finally {
    cleanup(root, source);
  }
});

test("REQ-025/AC-13 the real --yes command returns exit 2 for pending project instructions", () => {
  const root = projectFixture();
  const original = "# Project rules\nDo not rewrite this business policy.\n";
  try {
    put(root, "AGENTS.md", original);
    const result = spawnSync(process.execPath, [join(repo, "bin/keel.js"), "update", "--yes"], {
      cwd: root,
      encoding: "utf8",
      timeout: 120_000,
    });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stdout, /keel update partially applied/);
    assert.match(result.stdout, /pending=AGENTS\.md/);
    assert.doesNotMatch(result.stdout, /Proceed\? \[y\/N\]/);
    assert.equal(readFileSync(join(root, "AGENTS.md"), "utf8"), original);
    assert.equal(readFileSync(join(root, "user/data.txt"), "utf8"), "never touch me\n");
  } finally {
    cleanup(root);
  }
});
